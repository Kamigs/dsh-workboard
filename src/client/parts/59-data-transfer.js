/**
 * Board import / export.
 *
 * Export produces one JSON document with every task (fields, tags, assignee and
 * attachment metadata). Attachment bytes and session links stay on this machine,
 * so they are not part of the document. Import creates new tasks in the project
 * currently selected on the board; ids, archived state and sessions are not
 * carried over, which keeps an import additive and safe to repeat.
 */
addDict(
  {
    'data.trigger': '数据导入导出',
    'data.export': '导出数据',
    'data.import': '导入数据',
    'data.exported': '已导出 {count} 个任务',
    'data.exportFailed': '导出失败：{message}',
    'data.importTitle': '导入数据',
    'data.importFile': '文件',
    'data.importTarget': '导入到',
    'data.importCount': '{count} 个任务可导入',
    'data.importInvalid': '{count} 条记录无法识别，将跳过',
    'data.importEmpty': '文件里没有可导入的任务',
    'data.importNoWorkspace': '请先选择一个项目，再导入数据',
    'data.importing': '正在导入… {done}/{total}',
    'data.importDone': '已导入 {created} 个任务',
    'data.importPartial': '已导入 {created} 个任务，{failed} 个失败',
    'data.importFailed': '导入失败：{message}',
    'data.importConfirm': '开始导入',
    'data.importCancel': '取消',
    'data.readFailed': '无法读取这个文件',
    'data.parseFailed': '不是有效的任务看板导出文件',
    'data.attachmentNote': '附件文件不会被导入；任务字段、标签与指派会保留。',
  },
  {
    'data.trigger': 'Import or export data',
    'data.export': 'Export data',
    'data.import': 'Import data',
    'data.exported': 'Exported {count} tasks',
    'data.exportFailed': 'Export failed: {message}',
    'data.importTitle': 'Import data',
    'data.importFile': 'File',
    'data.importTarget': 'Import into',
    'data.importCount': '{count} tasks can be imported',
    'data.importInvalid': '{count} records are unrecognized and will be skipped',
    'data.importEmpty': 'This file has no importable tasks',
    'data.importNoWorkspace': 'Select a project before importing data',
    'data.importing': 'Importing… {done}/{total}',
    'data.importDone': 'Imported {created} tasks',
    'data.importPartial': 'Imported {created} tasks, {failed} failed',
    'data.importFailed': 'Import failed: {message}',
    'data.importConfirm': 'Start import',
    'data.importCancel': 'Cancel',
    'data.readFailed': 'This file could not be read',
    'data.parseFailed': 'This is not a valid task-board export',
    'data.attachmentNote': 'Attachment files are not imported; task fields, tags and assignee are kept.',
  },
)

/** Marker written into every export document. */
const KBN_DATA_FORMAT = 'dsh-workboard'
/** Current export schema version. */
const KBN_DATA_VERSION = 1
/** Upper bound for one import, so a huge file cannot flood the board. */
const KBN_IMPORT_LIMIT = 1000
/** Calendar-day pattern accepted on import. */
const KBN_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** @param {unknown} value */
function kbnIsObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Build the export document from the live snapshot.
 * @param {object} snapshot - client store snapshot
 * @returns {object}
 */
function kbnExportPayload(snapshot) {
  const tasks = snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.tasks) ? snapshot.tasks : []
  const workspaces = snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.workspaces)
    ? snapshot.workspaces
    : []
  return {
    format: KBN_DATA_FORMAT,
    version: KBN_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      title: workspace.title,
      path: workspace.path,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      workspaceId: task.workspaceId,
      title: task.title,
      description: task.description,
      status: task.status,
      startDate: task.startDate,
      dueDate: task.dueDate,
      priority: task.priority,
      tags: Array.isArray(task.tags) ? task.tags.slice() : [],
      attachments: Array.isArray(task.attachments)
        ? task.attachments.map((attachment) => ({
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
        }))
        : [],
      assignee: kbnIsObject(task.assignee)
        ? { kind: task.assignee.kind, name: task.assignee.name }
        : { kind: 'human', name: '' },
      archived: task.archived === true,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })),
  }
}

/**
 * File name for one export.
 * @param {Date} [date]
 * @returns {string}
 */
function kbnExportFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return 'dsh-workboard-' + date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
    + '-' + pad(date.getHours()) + pad(date.getMinutes()) + '.json'
}

/**
 * Validate one imported record into a create input.
 * @param {unknown} raw
 * @returns {object}
 */
function kbnNormalizeImportTask(raw) {
  if (!kbnIsObject(raw)) throw new Error('not an object')
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (title === '' || title.length > 200) throw new Error('invalid title')
  const status = STATUSES.includes(raw.status) ? raw.status : 'todo'
  const priority = PRIORITIES.includes(raw.priority) ? raw.priority : 'medium'
  const day = (value) => (typeof value === 'string' && KBN_DAY_PATTERN.test(value) ? value : null)
  const tags = []
  if (Array.isArray(raw.tags)) {
    for (const entry of raw.tags) {
      if (typeof entry !== 'string') continue
      const tag = entry.trim()
      if (tag !== '' && !tags.includes(tag) && tags.length < 12) tags.push(tag)
    }
  }
  const assigneeRaw = kbnIsObject(raw.assignee) ? raw.assignee : {}
  const kind = assigneeRaw.kind === 'ai' || assigneeRaw.kind === 'human' ? assigneeRaw.kind : 'human'
  const name = typeof assigneeRaw.name === 'string' ? assigneeRaw.name.trim() : ''
  return {
    title,
    description: typeof raw.description === 'string' ? raw.description.slice(0, 20000) : '',
    status,
    startDate: day(raw.startDate),
    dueDate: day(raw.dueDate),
    priority,
    tags,
    assignee: { kind, name },
  }
}

/**
 * Parse one export document (or a bare task array).
 * @param {string} text
 * @returns {{ ok: boolean, reason?: string, tasks: object[], invalid: number }}
 */
function kbnParseImport(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'parse', tasks: [], invalid: 0 }
  }
  let source
  if (Array.isArray(parsed)) {
    source = parsed
  } else if (kbnIsObject(parsed) && Array.isArray(parsed.tasks)) {
    if (typeof parsed.version === 'number' && parsed.version > KBN_DATA_VERSION) {
      return { ok: false, reason: 'version', tasks: [], invalid: 0 }
    }
    source = parsed.tasks
  } else {
    return { ok: false, reason: 'format', tasks: [], invalid: 0 }
  }
  const tasks = []
  let invalid = 0
  for (const raw of source) {
    try {
      tasks.push(kbnNormalizeImportTask(raw))
    } catch {
      invalid += 1
    }
  }
  const overflow = Math.max(0, tasks.length - KBN_IMPORT_LIMIT)
  return { ok: true, tasks: tasks.slice(0, KBN_IMPORT_LIMIT), invalid: invalid + overflow }
}

/**
 * Create every imported task in one workspace, sequentially so the column order
 * follows the file.
 * @param {object} store - client store
 * @param {string} workspaceId
 * @param {object[]} tasks - normalized create inputs
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<{ created: number, failed: number }>}
 */
async function kbnImportTasks(store, workspaceId, tasks, onProgress) {
  let created = 0
  let failed = 0
  for (let index = 0; index < tasks.length; index += 1) {
    try {
      await store.createTask(workspaceId, tasks[index])
      created += 1
    } catch {
      failed += 1
    }
    if (typeof onProgress === 'function') onProgress(index + 1, tasks.length)
  }
  return { created, failed }
}

/**
 * Confirmation sheet shown between picking a file and importing it.
 * @param {{ state: object | null, onCancel: Function, onConfirm: Function }} props
 * @returns {object} React element
 */
function KbnImportReview({ state, onCancel, onConfirm }) {
  if (!state) return null
  const busy = state.busy
  return h('div', { className: 'kbn-import', role: 'group', 'aria-label': t('data.importTitle') },
    h('div', { className: 'kbn-import-row' },
      h('span', { className: 'kbn-import-label' }, t('data.importFile')),
      h('span', { className: 'kbn-import-value', title: state.fileName }, state.fileName)),
    h('div', { className: 'kbn-import-row' },
      h('span', { className: 'kbn-import-label' }, t('data.importTarget')),
      h('span', { className: 'kbn-import-value' }, state.workspaceTitle)),
    h('p', { className: 'kbn-import-count' }, t('data.importCount', { count: state.tasks.length })),
    state.invalid > 0
      ? h('p', { className: 'kbn-import-note' }, t('data.importInvalid', { count: state.invalid }))
      : null,
    h('p', { className: 'kbn-import-note' }, t('data.attachmentNote')),
    busy && state.progress !== null && state.progress !== undefined
      ? h('p', { className: 'kbn-import-progress', role: 'status' },
        t('data.importing', { done: state.progress.done, total: state.progress.total }))
      : null,
    state.error !== null && state.error !== undefined
      ? h('p', { className: 'kbn-import-error', role: 'alert' }, state.error)
      : null,
    h('div', { className: 'kbn-settings-actions' },
      h(DshUI.Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: onCancel }, t('data.importCancel')),
      h(DshUI.Button, { variant: 'primary', size: 'sm', disabled: busy, onClick: onConfirm }, t('data.importConfirm'))))
}

addStyle(`
.kbn-import { display: flex; flex-direction: column; gap: 8px; }
.kbn-import-row { display: flex; gap: 8px; font-size: 13px; line-height: 20px; min-width: 0; }
.kbn-import-label { flex: none; color: var(--dsw-alias-label-tertiary); }
.kbn-import-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); }
.kbn-import-count { margin: 4px 0 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.kbn-import-note { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.kbn-import-progress { margin: 2px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.kbn-import-error { margin: 2px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
`)
