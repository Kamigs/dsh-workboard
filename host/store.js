/**
 * Durable task store for the Kanban plugin.
 *
 * One JSON document holds every task of every workspace. Attachments are opaque
 * files stored in the owning workspace's `.dsh/assets/kanban` directory (with a
 * metadata sidecar in the plugin data directory), so they live next to the
 * project they belong to and are not size-limited by the plugin. Mutations run
 * through a single promise queue and publish atomically (temp file + fsync +
 * rename), so a crash mid-write leaves the previous document intact. A corrupt
 * document is quarantined instead of preventing the plugin from starting.
 *
 * @module dsh-workboard/host/store
 */
import { copyFile, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** Task lifecycle columns, in board order. */
export const STATUSES = ['todo', 'doing', 'done']

/** Urgency levels, ascending. */
export const PRIORITIES = ['low', 'medium', 'high', 'urgent']

/** Maximum title length in characters. */
export const MAX_TITLE_LENGTH = 200

/** Maximum description length in characters. */
export const MAX_DESCRIPTION_LENGTH = 20000

/** Maximum number of tags per task. */
export const MAX_TAGS = 12

/** Calendar-day shape accepted for start/due dates. */
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Base64 alphabet accepted for attachment uploads. */
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/

/**
 * A validation or lookup failure carrying a stable machine code.
 */
export class KanbanError extends Error {
  /**
   * @param {string} code - machine code such as `kanban/invalid-title`
   * @param {string} message - human-readable reason
   */
  constructor(code, message) {
    super(message)
    this.name = 'KanbanError'
    this.code = code
  }
}

/**
 * Create one coded error.
 * @param {string} code
 * @param {string} message
 * @returns {KanbanError}
 */
export function kanbanError(code, message) {
  return new KanbanError(code, message)
}

/**
 * Whether a value is a coded store error.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isKanbanError(error) {
  return error instanceof KanbanError
}

/** @param {unknown} value */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether a value is a real calendar day in `YYYY-MM-DD` form.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidDay(value) {
  if (typeof value !== 'string') return false
  const match = DAY_PATTERN.exec(value)
  if (match === null) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(year, month - 1, day)
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day
}

/**
 * Validate and normalize a task title.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeTitle(value) {
  if (typeof value !== 'string') throw kanbanError('kanban/invalid-title', 'Title must be a string.')
  const title = value.trim()
  if (title === '') throw kanbanError('kanban/invalid-title', 'Title must not be empty.')
  if (title.length > MAX_TITLE_LENGTH) {
    throw kanbanError('kanban/invalid-title', `Title must be at most ${MAX_TITLE_LENGTH} characters.`)
  }
  return title
}

/**
 * Validate and normalize an optional description.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeDescription(value) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw kanbanError('kanban/invalid-description', 'Description must be a string.')
  const description = value.trim()
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw kanbanError('kanban/invalid-description', `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`)
  }
  return description
}

/**
 * Validate a task status.
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function normalizeStatus(value, fallback) {
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback
    throw kanbanError('kanban/invalid-status', 'Status is required.')
  }
  if (typeof value !== 'string' || !STATUSES.includes(value)) {
    throw kanbanError('kanban/invalid-status', `Status must be one of ${STATUSES.join(', ')}.`)
  }
  return value
}

/**
 * Validate a priority.
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function normalizePriority(value, fallback = 'medium') {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'string' || !PRIORITIES.includes(value)) {
    throw kanbanError('kanban/invalid-priority', `Priority must be one of ${PRIORITIES.join(', ')}.`)
  }
  return value
}

/**
 * Validate one optional calendar day.
 * @param {unknown} value
 * @param {string} field
 * @returns {string | null}
 */
export function normalizeDay(value, field) {
  if (value === undefined || value === null || value === '') return null
  if (!isValidDay(value)) {
    throw kanbanError('kanban/invalid-date', `${field} must be a real date in YYYY-MM-DD form.`)
  }
  return value
}

/**
 * Validate and deduplicate tags.
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeTags(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw kanbanError('kanban/invalid-tags', 'Tags must be an array of strings.')
  if (value.length > MAX_TAGS) {
    throw kanbanError('kanban/invalid-tags', `A task can have at most ${MAX_TAGS} tags.`)
  }
  const tags = []
  for (const entry of value) {
    if (typeof entry !== 'string') throw kanbanError('kanban/invalid-tags', 'Tags must be strings.')
    const tag = entry.trim()
    if (tag === '') throw kanbanError('kanban/invalid-tags', 'A tag must not be empty.')
    if (!tags.includes(tag)) tags.push(tag)
  }
  return tags
}

/**
 * Validate attachment metadata already stored with a task.
 * @param {unknown} value
 * @returns {Array<{ id: string, name: string, size: number, type: string }>}
 */
export function normalizeAttachments(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw kanbanError('kanban/invalid-attachments', 'Attachments must be an array of metadata objects.')
  }
  return value.map((entry) => {
    if (!isPlainObject(entry)) {
      throw kanbanError('kanban/invalid-attachments', 'Each attachment must be a metadata object.')
    }
    const { id, name, size, type } = entry
    if (typeof id !== 'string' || id.trim() === '') {
      throw kanbanError('kanban/invalid-attachments', 'Each attachment needs a non-empty id.')
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw kanbanError('kanban/invalid-attachments', 'Each attachment needs a non-empty name.')
    }
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
      throw kanbanError('kanban/invalid-attachments', 'Each attachment needs a numeric size.')
    }
    if (type !== undefined && typeof type !== 'string') {
      throw kanbanError('kanban/invalid-attachments', 'Attachment type must be a string.')
    }
    return { id: id.trim(), name: name.trim(), size, type: typeof type === 'string' ? type : '' }
  })
}

/**
 * Validate the assignee.
 * @param {unknown} value
 * @returns {{ kind: 'ai' | 'human', name: string }}
 */
export function normalizeAssignee(value) {
  if (value === undefined || value === null) return { kind: 'ai', name: 'AI' }
  if (!isPlainObject(value)) {
    throw kanbanError('kanban/invalid-assignee', 'Assignee must be an object.')
  }
  const kind = value.kind
  if (kind !== 'ai' && kind !== 'human') {
    throw kanbanError('kanban/invalid-assignee', 'Assignee kind must be "ai" or "human".')
  }
  const name = value.name === undefined || value.name === null ? '' : value.name
  if (typeof name !== 'string') {
    throw kanbanError('kanban/invalid-assignee', 'Assignee name must be a string.')
  }
  return { kind, name: name.trim() }
}

/**
 * Validate an optional linked session id.
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeSessionId(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') {
    throw kanbanError('kanban/invalid-session', 'Session id must be a string or null.')
  }
  return value
}

/**
 * Validate a workspace id.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeWorkspaceId(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw kanbanError('kanban/invalid-workspace', 'A workspace id is required.')
  }
  return value.trim()
}

/**
 * Validate a non-negative integer order.
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeOrder(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw kanbanError('kanban/invalid-order', 'Order must be a non-negative integer.')
  }
  return value
}

/**
 * Validate one create payload and apply defaults.
 * @param {unknown} input
 * @returns {object}
 */
export function normalizeTaskInput(input) {
  const raw = input === undefined || input === null ? {} : input
  if (!isPlainObject(raw)) {
    throw kanbanError('kanban/invalid-input', 'Task input must be an object.')
  }
  return {
    title: normalizeTitle(raw.title),
    description: normalizeDescription(raw.description),
    status: normalizeStatus(raw.status, 'todo'),
    startDate: normalizeDay(raw.startDate, 'startDate'),
    dueDate: normalizeDay(raw.dueDate, 'dueDate'),
    priority: normalizePriority(raw.priority),
    tags: normalizeTags(raw.tags),
    attachments: normalizeAttachments(raw.attachments),
    assignee: normalizeAssignee(raw.assignee),
  }
}

/**
 * Apply one validated partial update to a task snapshot.
 * Unknown keys are ignored; identity and timestamps are not patchable here.
 * @param {object} task
 * @param {unknown} patch
 * @returns {object} the merged, still-unpersisted task
 */
export function applyTaskPatch(task, patch) {
  if (!isPlainObject(patch)) {
    throw kanbanError('kanban/invalid-input', 'Task patch must be an object.')
  }
  const next = cloneTask(task)
  if ('title' in patch) next.title = normalizeTitle(patch.title)
  if ('description' in patch) next.description = normalizeDescription(patch.description)
  if ('status' in patch) next.status = normalizeStatus(patch.status)
  if ('startDate' in patch) next.startDate = normalizeDay(patch.startDate, 'startDate')
  if ('dueDate' in patch) next.dueDate = normalizeDay(patch.dueDate, 'dueDate')
  if ('priority' in patch) next.priority = normalizePriority(patch.priority)
  if ('tags' in patch) next.tags = normalizeTags(patch.tags)
  if ('attachments' in patch) next.attachments = normalizeAttachments(patch.attachments)
  if ('assignee' in patch) next.assignee = normalizeAssignee(patch.assignee)
  if ('sessionId' in patch) next.sessionId = normalizeSessionId(patch.sessionId)
  return next
}

/**
 * Deep-clone a task document.
 * @param {object} task
 * @returns {object}
 */
export function cloneTask(task) {
  return JSON.parse(JSON.stringify(task))
}

/**
 * Whether an error means the file does not exist.
 * @param {unknown} error
 * @returns {boolean}
 */
function isMissing(error) {
  return typeof error === 'object' && error !== null && error.code === 'ENOENT'
}

/**
 * Publish one JSON document atomically: same-directory temp file, fsync, rename.
 * @param {string} file
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.tmp-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const text = JSON.stringify(value, null, 2) + '\n'
  const handle = await open(temporary, 'w')
  try {
    await handle.writeFile(text, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
  await rename(temporary, file)
}

/**
 * Reduce an upload name to a safe basename.
 * @param {unknown} value
 * @returns {string}
 */
export function safeAttachmentName(value) {
  const source = typeof value === 'string' ? value : ''
  const base = source.replace(/\\/g, '/').split('/').pop() || 'attachment'
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim()
  if (cleaned === '') return 'attachment'
  return cleaned.slice(0, 120)
}

/**
 * Validate an attachment upload and decode its bytes.
 * @param {{ name?: unknown, type?: unknown, dataBase64?: unknown }} input
 * @returns {{ name: string, type: string, bytes: Buffer }}
 */
export function decodeAttachmentUpload(input) {
  const raw = isPlainObject(input) ? input : {}
  const data = raw.dataBase64
  if (typeof data !== 'string' || data === '') {
    throw kanbanError('kanban/invalid-attachment-data', 'Attachment data must be a non-empty base64 string.')
  }
  const compact = data.replace(/\s+/g, '')
  if (!BASE64_PATTERN.test(compact) || compact.length % 4 !== 0) {
    throw kanbanError('kanban/invalid-attachment-data', 'Attachment data is not valid base64.')
  }
  const bytes = Buffer.from(compact, 'base64')
  return {
    name: safeAttachmentName(raw.name),
    type: typeof raw.type === 'string' && raw.type.trim() !== '' ? raw.type.trim() : 'application/octet-stream',
    bytes,
  }
}

/**
 * Validate one standalone board (a board not backed by a workspace directory).
 * @param {unknown} raw
 * @returns {object}
 */
function normalizeStoredBoard(raw) {
  if (!isPlainObject(raw)) throw kanbanError('kanban/invalid-stored-board', 'Stored board must be an object.')
  if (typeof raw.id !== 'string' || !/^board_[a-z0-9]+$/.test(raw.id)) {
    throw kanbanError('kanban/invalid-stored-board', 'Stored board id is invalid.')
  }
  const createdAt = typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
    ? raw.createdAt
    : new Date(0).toISOString()
  const updatedAt = typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
    ? raw.updatedAt
    : createdAt
  return {
    id: raw.id,
    title: normalizeTitle(raw.title),
    createdAt,
    updatedAt,
  }
}

/**
 * Validate one task loaded from disk. Throws (and the loader drops the entry)
 * when the stored document cannot be trusted.
 * @param {unknown} raw
 * @returns {object}
 */
function normalizeStoredTask(raw) {
  if (!isPlainObject(raw)) throw kanbanError('kanban/invalid-stored-task', 'Stored task must be an object.')
  if (typeof raw.id !== 'string' || !/^task_[a-z0-9]+$/.test(raw.id)) {
    throw kanbanError('kanban/invalid-stored-task', 'Stored task id is invalid.')
  }
  const createdAt = typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
    ? raw.createdAt
    : new Date(0).toISOString()
  const updatedAt = typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
    ? raw.updatedAt
    : createdAt
  const archivedAt = typeof raw.archivedAt === 'string' && !Number.isNaN(Date.parse(raw.archivedAt))
    ? raw.archivedAt
    : null
  return {
    id: raw.id,
    workspaceId: normalizeWorkspaceId(raw.workspaceId),
    title: normalizeTitle(raw.title),
    description: normalizeDescription(raw.description),
    status: normalizeStatus(raw.status, 'todo'),
    startDate: normalizeDay(raw.startDate, 'startDate'),
    dueDate: normalizeDay(raw.dueDate, 'dueDate'),
    priority: normalizePriority(raw.priority),
    tags: normalizeTags(raw.tags),
    attachments: normalizeAttachments(raw.attachments),
    assignee: normalizeAssignee(raw.assignee),
    sessionId: normalizeSessionId(raw.sessionId),
    archived: raw.archived === true,
    archivedAt,
    order: normalizeOrder(Number.isSafeInteger(raw.order) ? raw.order : 0),
    createdAt,
    updatedAt,
  }
}

/**
 * Open (or create) one durable store.
 * @param {{ dataDir: string, resolveWorkspacePath?: (workspaceId: string) => string | undefined }} options
 * @returns {KanbanStore}
 */
export function createStore({ dataDir, resolveWorkspacePath } = {}) {
  if (typeof dataDir !== 'string' || dataDir.trim() === '') {
    throw new TypeError('createStore requires a dataDir')
  }
  return new KanbanStore(dataDir, resolveWorkspacePath)
}

/**
 * Durable task store; see {@link createStore}.
 */
export class KanbanStore {
  /**
   * @param {string} dataDir
   * @param {((workspaceId: string) => string | undefined) | undefined} resolveWorkspacePath
   */
  constructor(dataDir, resolveWorkspacePath) {
    this.dataDir = path.resolve(dataDir)
    this.resolveWorkspacePath = typeof resolveWorkspacePath === 'function' ? resolveWorkspacePath : undefined
    this.stateFile = path.join(this.dataDir, 'state.json')
    this.attachmentsDir = path.join(this.dataDir, 'attachments')
    this.attachmentIndexFile = path.join(this.attachmentsDir, 'index.json')
    /** @type {object[]} */
    this.tasks = []
    /** @type {{ id: string, title: string, createdAt: string, updatedAt: string }[]} */
    this.boards = []
    /** @type {Map<string, { name: string, type: string, size: number }>} */
    this.attachmentIndex = new Map()
    this.taskCounter = 0
    this.boardCounter = 0
    this.attachmentCounter = 0
    /** @type {Promise<unknown>} */
    this._tail = Promise.resolve()
    this._ready = this._load()
  }

  /** @returns {Promise<void>} resolves once the durable state is loaded */
  async ready() {
    await this._ready
  }

  /** Load durable state once; missing, unreadable, or corrupt state starts empty. */
  async _load() {
    try {
      await this._loadState()
    } catch {
      this.tasks = []
    }
    try {
      await this._loadAttachmentIndex()
    } catch {
      this.attachmentIndex.clear()
    }
  }

  /** Load `state.json`, quarantining anything unusable and salvaging valid tasks. */
  async _loadState() {
    let text
    try {
      text = await readFile(this.stateFile, 'utf8')
    } catch (error) {
      if (!isMissing(error)) await this._quarantineState()
      this.tasks = []
      return
    }
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      await this._quarantineState()
      this.tasks = []
      return
    }
    if (!isPlainObject(parsed) || parsed.version !== 1 || !Array.isArray(parsed.tasks)) {
      await this._quarantineState()
      this.tasks = []
      return
    }
    const tasks = []
    const seen = new Set()
    let highest = 0
    for (const raw of parsed.tasks) {
      try {
        const task = normalizeStoredTask(raw)
        if (seen.has(task.id)) continue
        seen.add(task.id)
        tasks.push(task)
        const suffix = Number.parseInt(task.id.slice('task_'.length), 36)
        if (Number.isSafeInteger(suffix) && suffix > highest) highest = suffix
      } catch {
        // Drop an unusable entry instead of failing the whole store open.
      }
    }
    this.tasks = tasks
    this.taskCounter = highest

    const boards = []
    const seenBoards = new Set()
    let highestBoard = 0
    if (Array.isArray(parsed.boards)) {
      for (const raw of parsed.boards) {
        try {
          const board = normalizeStoredBoard(raw)
          if (seenBoards.has(board.id)) continue
          seenBoards.add(board.id)
          boards.push(board)
          const suffix = Number.parseInt(board.id.slice('board_'.length), 36)
          if (Number.isSafeInteger(suffix) && suffix > highestBoard) highestBoard = suffix
        } catch {
          // Drop an unusable board entry instead of failing the whole store open.
        }
      }
    }
    this.boards = boards
    this.boardCounter = highestBoard
  }

  /** Load the attachment metadata sidecar. */
  async _loadAttachmentIndex() {
    let text
    try {
      text = await readFile(this.attachmentIndexFile, 'utf8')
    } catch (error) {
      if (!isMissing(error)) throw error
      this.attachmentIndex.clear()
      return
    }
    const parsed = JSON.parse(text)
    if (!isPlainObject(parsed)) {
      this.attachmentIndex.clear()
      return
    }
    this.attachmentIndex.clear()
    let highest = 0
    for (const [id, meta] of Object.entries(parsed)) {
      if (!/^att_[a-z0-9]+$/.test(id) || !isPlainObject(meta)) continue
      const name = typeof meta.name === 'string' ? meta.name : 'attachment'
      const type = typeof meta.type === 'string' ? meta.type : 'application/octet-stream'
      const size = typeof meta.size === 'number' && Number.isFinite(meta.size) ? meta.size : 0
      const entry = { name, type, size }
      // Workspace-scoped entries stay portable: the workspace is resolved at
      // read time and the file name is stored, with the absolute path kept as a
      // fallback for a deployment that cannot resolve the workspace. Legacy
      // entries (bare id in the data directory) keep working too.
      if (typeof meta.workspaceId === 'string' && meta.workspaceId !== ''
        && typeof meta.fileName === 'string' && meta.fileName !== '') {
        entry.workspaceId = meta.workspaceId
        entry.fileName = meta.fileName
      }
      if (typeof meta.file === 'string' && meta.file !== '') entry.file = meta.file
      this.attachmentIndex.set(id, entry)
      const suffix = Number.parseInt(id.slice('att_'.length), 36)
      if (Number.isSafeInteger(suffix) && suffix > highest) highest = suffix
    }
    this.attachmentCounter = highest
  }

  /** Copy an unusable state document aside so the next start is clean. */
  async _quarantineState() {
    // A random suffix keeps two quarantines in the same millisecond distinct;
    // copying onto an existing target would silently lose one backup.
    const target = `${this.stateFile}.corrupt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      await copyFile(this.stateFile, target)
    } catch {
      // Nothing to quarantine.
    }
  }

  /**
   * Queue one mutation after every earlier write and after the initial load.
   * @template T
   * @param {() => Promise<T>} operation
   * @returns {Promise<T>}
   */
  _enqueue(operation) {
    const run = this._tail.then(async () => {
      await this._ready
      return operation()
    })
    this._tail = run.then(() => undefined, () => undefined)
    return run
  }

  /** @returns {Promise<void>} persists the task document */
  async _persistTasks() {
    await writeJsonAtomic(this.stateFile, { version: 1, boards: this.boards, tasks: this.tasks })
  }

  /** @returns {Promise<void>} persists the attachment sidecar */
  async _persistAttachmentIndex() {
    const document = {}
    for (const [id, meta] of this.attachmentIndex.entries()) document[id] = meta
    await writeJsonAtomic(this.attachmentIndexFile, document)
  }

  /**
   * Allocate a unique task id.
   * @returns {string}
   */
  _nextTaskId() {
    for (;;) {
      this.taskCounter += 1
      const id = 'task_' + this.taskCounter.toString(36)
      if (!this.tasks.some((task) => task.id === id)) return id
    }
  }

  /**
   * Allocate a unique standalone-board id.
   * @returns {string}
   */
  _nextBoardId() {
    for (;;) {
      this.boardCounter += 1
      const id = 'board_' + this.boardCounter.toString(36)
      if (!this.boards.some((board) => board.id === id)) return id
    }
  }

  /**
   * Every standalone board (boards not backed by a workspace directory).
   * @returns {Promise<object[]>}
   */
  async listBoards() {
    await this._ready
    await this._tail.catch(() => undefined)
    return this.boards.map(cloneTask)
  }

  /**
   * Create one standalone board that is not bound to a directory yet.
   * @param {unknown} title
   * @returns {Promise<object>}
   */
  async createBoard(title) {
    return this._enqueue(async () => {
      const now = new Date().toISOString()
      const board = {
        id: this._nextBoardId(),
        title: normalizeTitle(title),
        createdAt: now,
        updatedAt: now,
      }
      this.boards.push(board)
      await this._persistTasks()
      return cloneTask(board)
    })
  }

  /**
   * Bind one standalone board to a workspace directory: its tasks move to the
   * workspace board and the standalone record disappears.
   * @param {unknown} boardId
   * @param {unknown} workspaceId
   * @returns {Promise<{ boardId: string, workspaceId: string, migrated: number }>}
   */
  async bindBoard(boardId, workspaceId) {
    return this._enqueue(async () => {
      const board = typeof boardId === 'string' ? this.boards.find((entry) => entry.id === boardId) : undefined
      if (board === undefined) throw kanbanError('kanban/board-not-found', `Board ${String(boardId)} not found.`)
      const target = normalizeWorkspaceId(workspaceId)
      const migrated = this.tasks.filter((task) => task.workspaceId === board.id)
      for (const task of migrated) {
        task.workspaceId = target
        task.updatedAt = new Date().toISOString()
      }
      for (const status of STATUSES) {
        const column = this.tasks
          .filter((task) => task.workspaceId === target && task.status === status)
          .sort((left, right) => left.order - right.order || left.createdAt.localeCompare(right.createdAt))
        column.forEach((task, index) => {
          task.order = index
        })
      }
      this.boards = this.boards.filter((entry) => entry.id !== board.id)
      await this._persistTasks()
      return { boardId: board.id, workspaceId: target, migrated: migrated.length }
    })
  }

  /**
   * Allocate a unique attachment id.
   * @returns {string}
   */
  _nextAttachmentId() {
    for (;;) {
      this.attachmentCounter += 1
      const id = 'att_' + this.attachmentCounter.toString(36)
      if (!this.attachmentIndex.has(id)) return id
    }
  }

  /**
   * Find one task or fail with `kanban/task-not-found`.
   * @param {unknown} id
   * @returns {object}
   */
  _requireTask(id) {
    if (typeof id !== 'string' || id === '') {
      throw kanbanError('kanban/task-not-found', 'Task not found.')
    }
    const task = this.tasks.find((entry) => entry.id === id)
    if (task === undefined) throw kanbanError('kanban/task-not-found', `Task ${id} not found.`)
    return task
  }

  /**
   * Re-number one column densely, preserving relative order.
   * @param {string} workspaceId
   * @param {string} status
   */
  _densify(workspaceId, status) {
    const column = this.tasks
      .filter((task) => task.workspaceId === workspaceId && task.status === status)
      .sort((left, right) => left.order - right.order || left.createdAt.localeCompare(right.createdAt))
    column.forEach((task, index) => {
      task.order = index
    })
  }

  /**
   * Every task, in insertion order, as deep clones (archived included).
   * @returns {Promise<object[]>}
   */
  async list() {
    await this._ready
    await this._tail.catch(() => undefined)
    return this.tasks.map(cloneTask)
  }

  /**
   * Create one task at the end of its column.
   * @param {unknown} workspaceId
   * @param {unknown} input
   * @returns {Promise<object>} the created task
   */
  async create(workspaceId, input) {
    return this._enqueue(async () => {
      const workspace = normalizeWorkspaceId(workspaceId)
      const fields = normalizeTaskInput(input)
      const now = new Date().toISOString()
      const order = this.tasks.filter((task) => task.workspaceId === workspace && task.status === fields.status).length
      const task = {
        id: this._nextTaskId(),
        workspaceId: workspace,
        title: fields.title,
        description: fields.description,
        status: fields.status,
        startDate: fields.startDate,
        dueDate: fields.dueDate,
        priority: fields.priority,
        tags: fields.tags,
        attachments: fields.attachments,
        assignee: fields.assignee,
        sessionId: null,
        archived: false,
        archivedAt: null,
        order,
        createdAt: now,
        updatedAt: now,
      }
      this.tasks.push(task)
      await this._persistTasks()
      return cloneTask(task)
    })
  }

  /**
   * Patch one task; a status change relocates it and densifies both columns.
   * @param {unknown} id
   * @param {unknown} patch
   * @returns {Promise<object>} the updated task
   */
  async update(id, patch) {
    return this._enqueue(async () => {
      const task = this._requireTask(id)
      const next = applyTaskPatch(task, patch)
      const previousStatus = task.status
      Object.assign(task, next)
      task.updatedAt = new Date().toISOString()
      if (task.status !== previousStatus) {
        task.order = this.tasks.filter((entry) =>
          entry.workspaceId === task.workspaceId && entry.status === task.status && entry.id !== task.id).length
        this._densify(task.workspaceId, previousStatus)
        this._densify(task.workspaceId, task.status)
      }
      await this._persistTasks()
      return cloneTask(task)
    })
  }

  /**
   * Move one task to a column, optionally before an anchor task.
   * @param {unknown} id
   * @param {unknown} status
   * @param {unknown} [beforeId]
   * @returns {Promise<object[]>} every task after the move
   */
  async move(id, status, beforeId) {
    return this._enqueue(async () => {
      const task = this._requireTask(id)
      const target = normalizeStatus(status)
      const previousStatus = task.status
      this._densify(task.workspaceId, previousStatus)
      const siblings = this.tasks
        .filter((entry) => entry.workspaceId === task.workspaceId && entry.status === target && entry.id !== task.id)
        .sort((left, right) => left.order - right.order || left.createdAt.localeCompare(right.createdAt))
      let index = siblings.length
      if (typeof beforeId === 'string' && beforeId !== task.id) {
        const anchor = siblings.findIndex((entry) => entry.id === beforeId)
        if (anchor >= 0) index = anchor
      }
      task.status = target
      siblings.splice(index, 0, task)
      siblings.forEach((entry, position) => {
        entry.order = position
      })
      if (target !== previousStatus) this._densify(task.workspaceId, previousStatus)
      task.updatedAt = new Date().toISOString()
      await this._persistTasks()
      return this.tasks.map(cloneTask)
    })
  }

  /**
   * Archive one task without deleting it.
   * @param {unknown} id
   * @returns {Promise<object>}
   */
  async archive(id) {
    return this._enqueue(async () => {
      const task = this._requireTask(id)
      const now = new Date().toISOString()
      task.archived = true
      task.archivedAt = now
      task.updatedAt = now
      this._densify(task.workspaceId, task.status)
      await this._persistTasks()
      return cloneTask(task)
    })
  }

  /**
   * Restore one archived task.
   * @param {unknown} id
   * @returns {Promise<object>}
   */
  async restore(id) {
    return this._enqueue(async () => {
      const task = this._requireTask(id)
      task.archived = false
      task.archivedAt = null
      task.updatedAt = new Date().toISOString()
      this._densify(task.workspaceId, task.status)
      await this._persistTasks()
      return cloneTask(task)
    })
  }

  /**
   * Delete one task, its attachments, and compact its column.
   * @param {unknown} id
   * @returns {Promise<boolean>}
   */
  async remove(id) {
    return this._enqueue(async () => {
      const task = this._requireTask(id)
      this.tasks = this.tasks.filter((entry) => entry.id !== task.id)
      let indexChanged = false
      for (const attachment of task.attachments) {
        const meta = this.attachmentIndex.get(attachment.id)
        if (meta !== undefined) {
          for (const file of await this._attachmentCandidates(attachment.id, meta)) {
            try {
              await rm(file, { force: true })
            } catch {
              // Best effort: a missing file is already the desired state.
            }
          }
        }
        indexChanged = this.attachmentIndex.delete(attachment.id) || indexChanged
      }
      this._densify(task.workspaceId, task.status)
      await this._persistTasks()
      if (indexChanged) await this._persistAttachmentIndex()
      return true
    })
  }

  /**
   * Link (or clear) the execution session of one task.
   * @param {unknown} id
   * @param {unknown} sessionId
   * @returns {Promise<object>}
   */
  async link(id, sessionId) {
    return this._enqueue(async () => {
      const task = this._requireTask(id)
      task.sessionId = normalizeSessionId(sessionId)
      task.updatedAt = new Date().toISOString()
      await this._persistTasks()
      return cloneTask(task)
    })
  }

  /**
   * Store one uploaded attachment and publish it in the metadata sidecar.
   * @param {{ name?: unknown, type?: unknown, dataBase64?: unknown }} input
   * @returns {Promise<{ id: string, name: string, size: number, type: string }>}
   */
  async saveAttachment(input) {
    return this._enqueue(async () => {
      const decoded = decodeAttachmentUpload(input)
      const id = this._nextAttachmentId()
      const workspaceId = input !== null && input !== undefined && typeof input.workspaceId === 'string'
        ? input.workspaceId
        : ''
      const workspaceDirectory = await this._workspaceAssetsDir(workspaceId)
      const directory = workspaceDirectory === null ? this.attachmentsDir : workspaceDirectory
      await mkdir(directory, { recursive: true })
      const fileName = `${id}-${decoded.name}`
      await writeFile(path.join(directory, fileName), decoded.bytes)
      const absolute = path.join(directory, fileName)
      const meta = workspaceDirectory === null
        ? { name: decoded.name, type: decoded.type, size: decoded.bytes.length, file: absolute }
        : { name: decoded.name, type: decoded.type, size: decoded.bytes.length, workspaceId, fileName, file: absolute }
      this.attachmentIndex.set(id, meta)
      await this._persistAttachmentIndex()
      return { id, name: meta.name, size: meta.size, type: meta.type }
    })
  }

  /**
   * Resolve a workspace id to its `.dsh/assets/kanban` directory.
   * @param {unknown} workspaceId
   * @returns {Promise<string | null>} null when the workspace or its directory is unknown
   */
  async _workspaceAssetsDir(workspaceId) {
    if (this.resolveWorkspacePath === undefined) return null
    if (typeof workspaceId !== 'string' || workspaceId === '') return null
    let workspacePath
    try {
      workspacePath = this.resolveWorkspacePath(workspaceId)
    } catch {
      return null
    }
    if (typeof workspacePath !== 'string' || workspacePath.trim() === '') return null
    const resolved = path.resolve(workspacePath.trim())
    try {
      const info = await stat(resolved)
      if (!info.isDirectory()) return null
    } catch {
      return null
    }
    return path.join(resolved, '.dsh', 'assets', 'kanban')
  }

  /**
   * Every path one stored attachment may live at, in preference order: the
   * workspace resolved through the live registry first, then the absolute path
   * recorded at save time, then the legacy data-directory layout.
   * @param {string} id
   * @param {object} meta
   * @returns {Promise<string[]>}
   */
  async _attachmentCandidates(id, meta) {
    const candidates = []
    if (meta !== null && meta !== undefined && typeof meta.workspaceId === 'string'
      && typeof meta.fileName === 'string') {
      const directory = await this._workspaceAssetsDir(meta.workspaceId)
      if (directory !== null) candidates.push(path.join(directory, meta.fileName))
    }
    if (meta !== null && meta !== undefined && typeof meta.file === 'string' && meta.file !== '') {
      candidates.push(meta.file)
    }
    candidates.push(path.join(this.attachmentsDir, id))
    return candidates
  }

  /**
   * Read one stored attachment.
   * @param {unknown} id
   * @returns {Promise<{ bytes: Buffer, meta: { name: string, type: string, size: number } }>}
   */
  async readAttachment(id) {
    await this._ready
    await this._tail.catch(() => undefined)
    if (typeof id !== 'string' || id === '' || !this.attachmentIndex.has(id)) {
      throw kanbanError('kanban/attachment-not-found', `Attachment ${String(id)} not found.`)
    }
    const meta = this.attachmentIndex.get(id)
    for (const file of await this._attachmentCandidates(id, meta)) {
      try {
        const bytes = await readFile(file)
        return { bytes, meta: { name: meta.name, type: meta.type, size: meta.size } }
      } catch (error) {
        if (!isMissing(error)) throw error
      }
    }
    throw kanbanError('kanban/attachment-not-found', `Attachment ${id} not found.`)
  }

  /** Wait for pending writes; safe to call more than once. */
  async close() {
    await this._ready.catch(() => undefined)
    await this._tail.catch(() => undefined)
  }
}
