/**
 * Client state store for the task board.
 *
 * One module-level singleton (`kanbanStore`) is created by `90-entry.js` and read
 * by every board component. Snapshots are immutable; components subscribe with
 * `use(selector, isEqual?)`, which wraps `useSyncExternalStore` and keeps the
 * selector result referentially stable between unrelated renders.
 *
 * Mutations update the local snapshot from the host response (optimistic where
 * that is safe — update/archive/restore/delete — and authoritative for `move`,
 * whose response carries the whole reordered task list). Failures reject with an
 * `Error` carrying the host message and roll the optimistic change back.
 */

/** @type {ReturnType<typeof createKanbanStore> | null} */
let kanbanStore = null

/** Host route table (ARCHITECTURE.md §3). */
const KANBAN_API_PATHS = {
  state: '/api/kanban.state',
  boardCreate: '/api/kanban.board.create',
  boardBind: '/api/kanban.board.bind',
  create: '/api/kanban.task.create',
  update: '/api/kanban.task.update',
  move: '/api/kanban.task.move',
  archive: '/api/kanban.task.archive',
  restore: '/api/kanban.task.restore',
  delete: '/api/kanban.task.delete',
  link: '/api/kanban.task.link',
  upload: '/api/kanban.attachment.upload',
  attachment: '/api/kanban.attachment',
}

/** Toast auto-dismiss delay (ARCHITECTURE.md §5). */
const KANBAN_TOAST_MS = 4000

/** Empty snapshot used before the first load. */
function kanbanEmptySnapshot() {
  return {
    status: 'idle',
    workspaces: [],
    boards: [],
    tasks: [],
    error: null,
    toast: null,
    revision: 0,
    busy: false,
  }
}

/**
 * Read one file as bare base64 (no `data:` prefix) for the upload route.
 * @param {File} file
 * @returns {Promise<string>}
 */
function kanbanReadFileBase64(file) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader !== 'function') {
      reject(new Error(t('api.readFailed')))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error(t('api.readFailed')))
    reader.readAsDataURL(file)
  })
}

/**
 * Create the board store bound to the plugin's client context.
 * @param {object} ctx - Harness client context (`layout`, `uiWorkspace`, `workspaces`, …)
 * @returns {object} the store
 */
function createKanbanStore(ctx) {
  let snapshot = kanbanEmptySnapshot()
  let listeners = new Set()
  let disposed = false
  let toastTimer = null
  let toastSeq = 0
  let refreshToken = 0
  let focusTaskId = null

  function getSnapshot() {
    return snapshot
  }

  function emit() {
    if (disposed) return
    listeners.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        // A broken subscriber must not stop the others from updating.
        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          console.error('[kanban] subscriber failed', error)
        }
      }
    })
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  /** Replace the snapshot with the previous object plus `patch`, then notify. */
  function setSnapshot(patch) {
    snapshot = Object.assign({}, snapshot, patch)
    emit()
  }

  /** Replace the snapshot as a new object, bumping `revision` for data changes. */
  function commit(patch) {
    setSnapshot(Object.assign({}, patch, { revision: snapshot.revision + 1 }))
  }

  /**
   * Subscribe one component to a slice of the snapshot.
   * @param {(state: object) => any} [selector]
   * @param {(left: any, right: any) => boolean} [isEqual]
   * @returns {any}
   */
  function use(selector, isEqual) {
    const select = typeof selector === 'function' ? selector : null
    const equal = typeof isEqual === 'function' ? isEqual : Object.is
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    const cache = useRef(null)
    const next = select === null ? state : select(state)
    if (cache.current === null || !equal(cache.current.value, next)) {
      cache.current = { value: next }
    }
    return cache.current.value
  }

  /** Put one host task into the snapshot (replacing an existing entry). */
  function replaceTask(task) {
    if (task === null || task === undefined || typeof task.id !== 'string') return
    const tasks = snapshot.tasks.slice()
    const index = tasks.findIndex((item) => item !== null && item.id === task.id)
    if (index >= 0) tasks[index] = task
    else tasks.push(task)
    commit({ tasks })
  }

  /**
   * Fetch the whole board state. Keeps the last good data when the request fails.
   * @returns {Promise<void>}
   */
  async function refresh() {
    const token = ++refreshToken
    setSnapshot({ status: 'loading' })
    try {
      const body = await apiGet(KANBAN_API_PATHS.state)
      if (token !== refreshToken) return
      setSnapshot({
        status: 'ready',
        workspaces: body !== null && Array.isArray(body.workspaces) ? body.workspaces : [],
        boards: body !== null && Array.isArray(body.boards) ? body.boards : [],
        tasks: body !== null && Array.isArray(body.tasks) ? body.tasks : [],
        error: null,
        revision: snapshot.revision + 1,
      })
    } catch (error) {
      if (token !== refreshToken) return
      setSnapshot({ status: 'error', error: messageOf(error) })
    }
  }

  /**
   * Create a task in one workspace.
   * @param {string} workspaceId
   * @param {object} input
   * @returns {Promise<object>} the created task
   */
  async function createTask(workspaceId, input) {
    const body = await apiPost(KANBAN_API_PATHS.create, { workspaceId, input: input || {} })
    const task = body !== null ? body.task : null
    if (task === null || task === undefined || typeof task.id !== 'string') {
      throw new Error(t('api.badResponse'))
    }
    replaceTask(task)
    return task
  }

  /**
   * Patch one task (optimistic, then the host's authoritative task).
   * @param {string} id
   * @param {object} patch
   * @returns {Promise<object>} the updated task
   */
  async function updateTask(id, patch) {
    const previous = taskById(snapshot, id)
    if (previous !== null) replaceTask(Object.assign({}, previous, patch))
    try {
      const body = await apiPost(KANBAN_API_PATHS.update, { id, patch })
      const task = body !== null ? body.task : null
      if (task === null || task === undefined) throw new Error(t('api.badResponse'))
      replaceTask(task)
      return task
    } catch (error) {
      if (previous !== null) replaceTask(previous)
      throw error
    }
  }

  /**
   * Move a task into a column, optionally before another task. Authoritative:
   * the host returns the whole reordered task list.
   * @param {string} id
   * @param {'todo' | 'doing' | 'done'} status
   * @param {string} [beforeId]
   * @returns {Promise<void>}
   */
  async function moveTask(id, status, beforeId) {
    const payload = { id, status }
    if (typeof beforeId === 'string' && beforeId !== '') payload.beforeId = beforeId
    const body = await apiPost(KANBAN_API_PATHS.move, payload)
    const tasks = body !== null && Array.isArray(body.tasks) ? body.tasks : null
    if (tasks === null) throw new Error(t('api.badResponse'))
    commit({ tasks })
  }

  /** Archive or restore only the specified board task, preserving its session link. */
  async function setTaskArchived(id, archived) {
    const previous = taskById(snapshot, id)
    if (previous !== null) {
      replaceTask({ ...previous, archived, archivedAt: archived ? new Date().toISOString() : null })
    }
    try {
      const path = archived ? KANBAN_API_PATHS.archive : KANBAN_API_PATHS.restore
      const body = await apiPost(path, { id })
      if (body?.task?.id !== id || body.task.archived !== archived) throw new Error(t('api.badResponse'))
      replaceTask(body.task)
      return body.task
    } catch (error) {
      if (previous !== null) replaceTask(previous)
      // A lost response can follow a successful write. Reconcile only with the board.
      await refresh()
      const saved = taskById(snapshot, id)
      if (snapshot.status === 'ready' && saved?.archived === archived) return saved
      throw error
    }
  }

  /**
   * Delete one task (optimistic removal, restored on failure).
   * @param {string} id
   * @returns {Promise<void>}
   */
  async function deleteTask(id) {
    const previous = taskById(snapshot, id)
    const index = snapshot.tasks.findIndex((item) => item !== null && item.id === id)
    if (index >= 0) {
      const tasks = snapshot.tasks.slice()
      tasks.splice(index, 1)
      commit({ tasks })
    }
    try {
      await apiPost(KANBAN_API_PATHS.delete, { id })
    } catch (error) {
      if (previous !== null) {
        const tasks = snapshot.tasks.slice()
        tasks.splice(Math.min(index < 0 ? tasks.length : index, tasks.length), 0, previous)
        commit({ tasks })
      }
      throw error
    }
  }

  /**
   * Link (or unlink, with `null`) a harness session to a task.
   * @param {string} id
   * @param {string | null} sessionId
   * @returns {Promise<object>} the updated task
   */
  async function linkSession(id, sessionId, expectedSessionId) {
    const body = await apiPost(KANBAN_API_PATHS.link, {
      id, expectedSessionId,
      sessionId: typeof sessionId === 'string' && sessionId !== '' ? sessionId : null,
    })
    const task = body !== null ? body.task : null
    if (task === null || task === undefined) throw new Error(t('api.badResponse'))
    replaceTask(task)
    return task
  }

  /**
   * Upload one attachment; returns the host attachment record.
   * @param {File} file
   * @returns {Promise<{ id: string, name: string, size: number, type: string }>}
   */
  /**
   * Create one standalone board (no workspace directory yet).
   * @param {string} title
   * @returns {Promise<object>} the created board
   */
  async function createBoard(title) {
    const body = await apiPost(KANBAN_API_PATHS.boardCreate, { title })
    const board = body !== null && body !== undefined ? body.board : null
    if (board === null || board === undefined || typeof board.id !== 'string') {
      throw new Error(t('api.badResponse'))
    }
    commit({ boards: (snapshot.boards || []).concat([board]) })
    return board
  }

  /**
   * Bind one standalone board to a workspace directory; the host moves its tasks
   * to the workspace board and the snapshot is reloaded.
   * @param {string} boardId
   * @param {string} workspaceId
   * @returns {Promise<void>}
   */
  async function bindBoard(boardId, workspaceId) {
    await apiPost(KANBAN_API_PATHS.boardBind, { boardId, workspaceId })
    await refresh()
  }

  async function uploadAttachment(file, workspaceId) {
    if (file === null || file === undefined) throw new Error(t('api.noFile'))
    const data = await kanbanReadFileBase64(file)
    const body = await apiPost(KANBAN_API_PATHS.upload, {
      name: typeof file.name === 'string' ? file.name : 'attachment',
      type: typeof file.type === 'string' ? file.type : '',
      workspaceId: typeof workspaceId === 'string' ? workspaceId : '',
      data,
    })
    const attachment = body !== null ? body.attachment : null
    if (attachment === null || attachment === undefined) throw new Error(t('api.badResponse'))
    return attachment
  }

  /**
   * Same-origin download URL for one stored attachment.
   * @param {string} id
   * @returns {string}
   */
  function attachmentUrl(id) {
    return KANBAN_API_PATHS.attachment + '?id=' + encodeURIComponent(String(id))
  }

  /** Request that the board reveal/select one task on its next revision change. */
  function setFocusTask(taskId) {
    if (typeof taskId !== 'string' || taskId === '') return
    focusTaskId = taskId
    commit({})
  }

  /** Consume a pending reveal request. @returns {string | null} */
  function takeFocusTask() {
    const id = focusTaskId
    focusTaskId = null
    return id
  }

  /** Toggle the lightweight global busy flag. */
  function setBusy(flag) {
    setSnapshot({ busy: Boolean(flag) })
  }

  /** Show one toast for 4s; a newer toast replaces the current one. */
  function toast(message, kind) {
    const id = ++toastSeq
    if (toastTimer !== null) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
    setSnapshot({
      toast: {
        id,
        message: typeof message === 'string' ? message : String(message),
        kind: kind === 'error' ? 'error' : 'info',
      },
    })
    toastTimer = setTimeout(() => {
      toastTimer = null
      if (snapshot.toast !== null && snapshot.toast.id === id) setSnapshot({ toast: null })
    }, KANBAN_TOAST_MS)
  }

  /** Re-render every subscriber after a locale change (copy is read at render). */
  function notifyLocale() {
    commit({})
  }

  /** Release subscriptions and timers; called by the plugin entry on dispose. */
  function dispose() {
    disposed = true
    if (toastTimer !== null) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
    listeners.clear()
    listeners = new Set()
    focusTaskId = null
  }

  return {
    use,
    getSnapshot,
    subscribe,
    refresh,
    createTask,
    updateTask,
    moveTask,
    archiveTask: (id) => setTaskArchived(id, true),
    restoreTask: (id) => setTaskArchived(id, false),
    deleteTask,
    linkSession,
    createBoard,
    bindBoard,
    uploadAttachment,
    attachmentUrl,
    setFocusTask,
    takeFocusTask,
    setBusy,
    toast,
    notifyLocale,
    dispose,
    ctx,
  }
}

/* ------------------------------------------------------------------ derived */

/**
 * Active (non-archived) tasks of one workspace, in board order.
 * @param {object} snapshot
 * @param {string} workspaceId
 * @returns {object[]}
 */
function tasksOf(snapshot, workspaceId) {
  if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.tasks)) return []
  return snapshot.tasks
    .filter((task) => task !== null && task !== undefined
      && task.workspaceId === workspaceId
      && task.archived !== true)
    .slice()
    .sort((left, right) => {
      const leftOrder = typeof left.order === 'number' ? left.order : 0
      const rightOrder = typeof right.order === 'number' ? right.order : 0
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return String(left.createdAt || '').localeCompare(String(right.createdAt || ''))
    })
}

/**
 * Archived tasks, most recently archived first.
 * @param {object} snapshot
 * @returns {object[]}
 */
function archivedTasks(snapshot) {
  if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.tasks)) return []
  return snapshot.tasks
    .filter((task) => task !== null && task !== undefined && task.archived === true)
    .slice()
    .sort((left, right) => {
      const leftAt = String(left.archivedAt || left.updatedAt || '')
      const rightAt = String(right.archivedAt || right.updatedAt || '')
      return rightAt.localeCompare(leftAt)
    })
}

/**
 * One task by id, archived or not.
 * @param {object} snapshot
 * @param {string} id
 * @returns {object | null}
 */
function taskById(snapshot, id) {
  if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.tasks)) return null
  if (typeof id !== 'string' || id === '') return null
  const found = snapshot.tasks.find((task) => task !== null && task !== undefined && task.id === id)
  return found === undefined ? null : found
}

function tasksForSession(snapshot, sessionId) {
  if (!sessionId) return []
  return snapshot.tasks.filter((task) => !task.archived && task.sessionId === sessionId)
}

/**
 * One workspace by id.
 * @param {object} snapshot
 * @param {string} workspaceId
 * @returns {object | null}
 */
function workspaceOf(snapshot, workspaceId) {
  if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.workspaces)) return null
  if (typeof workspaceId !== 'string' || workspaceId === '') return null
  const found = snapshot.workspaces.find((workspace) => workspace !== null
    && workspace !== undefined
    && workspace.id === workspaceId)
  return found === undefined ? null : found
}

/**
 * Every board the selector offers: each harness workspace is a board bound to
 * its directory, followed by standalone boards that are not bound yet.
 * @param {object} snapshot
 * @returns {Array<{ id: string, title: string, path: string, bound: boolean }>}
 */
function boardsOf(snapshot) {
  const boards = []
  if (snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.workspaces)) {
    for (const workspace of snapshot.workspaces) {
      if (workspace === null || workspace === undefined) continue
      boards.push({
        id: workspace.id,
        title: typeof workspace.title === 'string' && workspace.title !== '' ? workspace.title : String(workspace.path || ''),
        path: typeof workspace.path === 'string' ? workspace.path : '',
        bound: true,
      })
    }
  }
  if (snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.boards)) {
    for (const board of snapshot.boards) {
      if (board === null || board === undefined || typeof board.id !== 'string') continue
      boards.push({
        id: board.id,
        title: typeof board.title === 'string' && board.title !== '' ? board.title : t('board.untitled'),
        path: '',
        bound: false,
      })
    }
  }
  return boards
}

/**
 * One board by id (bound workspace board or standalone board).
 * @param {object} snapshot
 * @param {string} boardId
 * @returns {{ id: string, title: string, path: string, bound: boolean } | null}
 */
function boardOf(snapshot, boardId) {
  if (typeof boardId !== 'string' || boardId === '') return null
  const found = boardsOf(snapshot).find((board) => board.id === boardId)
  return found === undefined ? null : found
}
