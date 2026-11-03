/**
 * Task ↔ Session bridge.
 *
 * An AI task can be executed by a harness session: the board asks for a session
 * in the task's workspace, links it to the card, sends the task brief as the
 * first prompt, and from then on the card and the session header link to each
 * other.
 *
 * `ctx` comes from the store (`kanbanStore.ctx`) because this part is loaded
 * before the entry runs; all exported functions are hoisted declarations so
 * board parts can call them from event handlers.
 */
addDict(
  {
    'bridge.prompt.title': '你要执行任务看板中的一个任务。',
    'bridge.prompt.workspace': '工作区：{title}（{path}）',
    'bridge.prompt.task': '任务：{title}',
    'bridge.prompt.status': '当前状态：{status}',
    'bridge.prompt.priority': '紧急程度：{priority}',
    'bridge.prompt.start': '开始日期：{date}',
    'bridge.prompt.due': '截止日期：{date}',
    'bridge.prompt.tags': '标签：{tags}',
    'bridge.prompt.description': '任务描述：',
    'bridge.prompt.request': '请直接开始执行这个任务，完成后给出结果摘要；必要时先列出计划再动手。',
    'bridge.prompt.discuss': '先讨论这个任务：提出需要澄清的问题或建议方案，等待我确认后再执行。讨论阶段不要修改文件或运行命令。',
    'send.title': '发送任务',
    'send.destination': '发送到',
    'send.new': '新建会话',
    'send.current': '当前会话',
    'send.linked': '关联会话',
    'send.mode': '发送方式',
    'send.execute': '直接执行',
    'send.discuss': '先讨论',
    'send.submit': '发送',
    'send.unavailable': '会话已变更或不可用，请重新选择。',
    'send.relink': '发送后，任务将关联到所选会话。',
    'bridge.sessionTitle': '[任务] {title}',
    'bridge.link.label': '关联任务',
    'bridge.error.noWorkspace': '找不到任务所在的工作区',
    'bridge.error.create': '创建会话失败：{message}',
    'bridge.error.link': '未能关联会话，任务尚未发送。{message}',
    'bridge.error.attachment': '附件「{name}」准备失败，任务尚未发送。{message}',
    'bridge.error.prompt': '未能确认任务已发送，请打开关联会话查看。{message}',
    'bridge.error.move': '任务已发送，请手动更新卡片状态。{message}',
    'bridge.bind.hint': '这个看板还没有工作目录，请选择一个目录再创建会话。',
    'bridge.bind.cancelled': '已取消选择工作目录',
    'bridge.bind.done': '已为看板「{title}」绑定工作目录',
    'bridge.bind.failed': '绑定工作目录失败：{message}',
  },
  {
    'bridge.prompt.title': 'You are executing a task from the task board.',
    'bridge.prompt.workspace': 'Workspace: {title} ({path})',
    'bridge.prompt.task': 'Task: {title}',
    'bridge.prompt.status': 'Status: {status}',
    'bridge.prompt.priority': 'Priority: {priority}',
    'bridge.prompt.start': 'Start date: {date}',
    'bridge.prompt.due': 'Due date: {date}',
    'bridge.prompt.tags': 'Tags: {tags}',
    'bridge.prompt.description': 'Task description:',
    'bridge.prompt.request': 'Start working on this task now and finish with a result summary; lay out a short plan first when useful.',
    'bridge.prompt.discuss': 'Discuss the task first: ask clarifying questions or propose an approach, then wait for my confirmation. Do not change files or run commands during discussion.',
    'send.title': 'Send task',
    'send.destination': 'Destination',
    'send.new': 'New session',
    'send.current': 'Current session',
    'send.linked': 'Linked session',
    'send.mode': 'Send mode',
    'send.execute': 'Execute now',
    'send.discuss': 'Discuss first',
    'send.submit': 'Send',
    'send.unavailable': 'The session changed or is unavailable. Choose a destination again.',
    'send.relink': 'Sending will link the task to the selected session.',
    'bridge.sessionTitle': '[Task] {title}',
    'bridge.link.label': 'Linked tasks',
    'bridge.error.noWorkspace': 'The task workspace could not be found',
    'bridge.error.create': 'Could not create a session: {message}',
    'bridge.error.link': 'Could not link the session. The brief was not sent. {message}',
    'bridge.error.attachment': 'Could not prepare “{name}”. The task was not sent. {message}',
    'bridge.error.prompt': 'Could not confirm delivery. Open the linked session to check. {message}',
    'bridge.error.move': 'The brief was sent. Update the card status manually. {message}',
    'bridge.bind.hint': 'This board has no working directory yet — pick one to create its first session.',
    'bridge.bind.cancelled': 'Working-directory selection cancelled',
    'bridge.bind.done': 'Board "{title}" is now bound to its working directory',
    'bridge.bind.failed': 'Could not bind the working directory: {message}',
  },
)

/**
 * Resolve a task and its workspace from the current store snapshot.
 * @param {string} taskId
 * @returns {{ task: object, workspace: object } | null}
 */
function bridgeLookup(taskId) {
  if (kanbanStore === null) return null
  const snapshot = kanbanStore.getSnapshot()
  const task = taskById(snapshot, taskId)
  if (task === null) return null
  const workspace = workspaceOf(snapshot, task.workspaceId)
  return { task, workspace }
}

/**
 * Build the first prompt for a task's execution session.
 * @param {object} task
 * @param {object | null} workspace
 * @returns {string}
 */
function buildTaskBrief(task, workspace, mode) {
  const lines = []
  if (mode !== 'discuss') lines.push(t('bridge.prompt.title'))
  if (lines.length) lines.push('')
  lines.push(t('bridge.prompt.task', { title: taskContentText(task) }))
  if (workspace !== null) {
    lines.push(t('bridge.prompt.workspace', { title: workspace.title, path: workspace.path }))
  }
  lines.push(t('bridge.prompt.status', { status: t('status.' + task.status) }))
  lines.push(t('bridge.prompt.priority', { priority: t('priority.' + task.priority) }))
  if (task.startDate !== null) lines.push(t('bridge.prompt.start', { date: task.startDate }))
  if (task.dueDate !== null) lines.push(t('bridge.prompt.due', { date: task.dueDate }))
  if (Array.isArray(task.tags) && task.tags.length > 0) {
    lines.push(t('bridge.prompt.tags', { tags: task.tags.join('、') }))
  }
  lines.push('')
  lines.push(t(mode === 'discuss' ? 'bridge.prompt.discuss' : 'bridge.prompt.request'))
  return lines.join('\n')
}

/** Convert a board file into the same image block or session-scoped file receipt the DSH composer sends. */
async function prepareSessionAttachment(ctx, sessionId, attachment) {
  try {
    const response = await fetch(kanbanStore.attachmentUrl(attachment.id), { credentials: 'same-origin' })
    if (!response.ok) throw new Error(t('api.httpError', { status: response.status }))
    const blob = await response.blob()
    const mediaType = blob.type || attachment.type
    if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mediaType)) {
      return { type: 'image', mediaType, name: attachment.name, data: await kanbanReadFileBase64(blob) }
    }
    const upload = await ctx.fileUpload.upload(sessionId, blob, attachment.name)
    if (!upload.ok) throw new Error(upload.error.message)
    return { type: 'file', receiptId: upload.value.receiptId }
  } catch (error) {
    throw new Error(t('bridge.error.attachment', { name: attachment.name, message: messageOf(error) }))
  }
}

/**
 * Queue the brief and attachments in the selected session, naming a newly created one.
 * @param {object} ctx - client context from the store
 * @param {string} sessionId
 * @param {object[]} content - ordered native prompt blocks
 * @param {string} title - session title to write when the host accepts it
 * @returns {Promise<void>}
 */
async function promptSession(ctx, sessionId, content, title) {
  const reference = ctx.sessions.retain(sessionId, { source: 'gateway' })
  try {
    await reference.ready
    const session = reference.binding.session
    if (title) await session.rename(t('bridge.sessionTitle', { title }))
    const result = await session.prompt(content, 'queue')
    if (result !== undefined && result !== null && result.ok === false) {
      const message = result.error && result.error.message ? result.error.message : String(result.error)
      throw new Error(message)
    }
  } finally {
    reference.release()
  }
}

/**
 * Resolve the Harness workspace a task's board runs in. A standalone board has
 * no directory yet: the first AI session asks for one, creates the workspace and
 * migrates the board's tasks onto it.
 * @param {object} task
 * @returns {Promise<string | null>} the workspace id, or null when cancelled
 */
async function ensureBoardWorkspace(task) {
  if (kanbanStore === null) return null
  const board = boardOf(kanbanStore.getSnapshot(), task.workspaceId)
  if (board === null || board.bound) return task.workspaceId
  const ctx = kanbanStore.ctx
  kanbanStore.toast(t('bridge.bind.hint'), 'info')
  let directory = null
  try {
    directory = await ctx.uiWorkspace.pickDirectory()
  } catch (error) {
    throw new Error(t('bridge.bind.failed', { message: messageOf(error) }))
  }
  if (directory === null || directory === undefined || directory === '') {
    kanbanStore.toast(t('bridge.bind.cancelled'), 'info')
    return null
  }
  let created
  try {
    created = await ctx.workspaces.create({ path: directory })
  } catch (error) {
    throw new Error(t('bridge.bind.failed', { message: messageOf(error) }))
  }
  const workspaceId = created !== null && created !== undefined ? created.workspaceId : undefined
  if (typeof workspaceId !== 'string' || workspaceId === '') {
    throw new Error(t('bridge.bind.failed', { message: 'no workspace id' }))
  }
  await kanbanStore.bindBoard(board.id, workspaceId)
  try {
    await ctx.workspaces.rename(workspaceId, board.title)
  } catch {
    // The workspace keeps its directory-derived title; binding still succeeded.
  }
  kbnLastWorkspaceId = workspaceId
  kanbanStore.toast(t('bridge.bind.done', { title: board.title }), 'info')
  return workspaceId
}

// The main-view reference survives opening the board. Workspace membership
// and archive state come from the same public catalogs used by the DSH sidebar.
function dispatchDestinations(task) {
  const ctx = kanbanStore.ctx
  const sessions = ctx.sessions.list.getSnapshot()
  const workspaces = ctx.workspaces.list.getSnapshot()
  const members = workspaces.items.find((workspace) => workspace.workspaceId === task.workspaceId)?.sessionIds || []
  const tasks = kanbanStore.getSnapshot().tasks
  const destinations = []
  for (const id of members) {
    const session = sessions.byId[id]
    if (!session || workspaces.archivedSessionIds.includes(id)) continue
    if (tasks.some((other) => other.id !== task.id && other.sessionId === id)) continue
    const linked = id === task.sessionId
    if (!linked && !session.retainedBy?.mainView) continue
    destinations.push({
      value: id, label: t(linked ? 'send.linked' : 'send.current'),
      title: session.displayTitle || id,
    })
  }
  destinations.push({ value: 'new', label: t('send.new') })
  return destinations
}

async function dispatchTask(task, destination, mode) {
  const ctx = kanbanStore.ctx
  const found = bridgeLookup(task.id)
  if (!found || found.task.archived || found.task.status === 'done' ||
      found.task.sessionId !== task.sessionId) throw new Error(t('send.unavailable'))
  if (destination !== 'new' && !dispatchDestinations(found.task).some((item) => item.value === destination)) {
    throw new Error(t('send.unavailable'))
  }
  const workspaceId = await ensureBoardWorkspace(found.task)
  if (workspaceId === null) return null
  const refreshed = bridgeLookup(task.id)
  if (!refreshed) throw new Error(t('send.unavailable'))
  let sessionId = destination
  if (destination === 'new') {
    try {
      sessionId = await ctx.sessions.create({ workspaceId })
      if (!sessionId) throw new Error(t('api.badResponse'))
    } catch (error) {
      throw new Error(t('bridge.error.create', { message: messageOf(error) }))
    }
  }
  let linkedTask
  try {
    linkedTask = await kanbanStore.linkSession(task.id, sessionId, task.sessionId)
  } catch (error) {
    throw new Error(t('bridge.error.link', { message: messageOf(error) }))
  }
  const content = []
  for (const attachment of linkedTask.attachments || []) {
    content.push(await prepareSessionAttachment(ctx, sessionId, attachment))
  }
  content.push({ type: 'text', text: buildTaskBrief(linkedTask, refreshed.workspace, mode) })
  try {
    await promptSession(ctx, sessionId, content, destination === 'new' ? linkedTask.title : null)
  } catch (error) {
    throw new Error(t('bridge.error.prompt', { message: messageOf(error) }))
  }
  const current = taskById(kanbanStore.getSnapshot(), task.id)
  if (mode === 'execute' && current?.status === 'todo') {
    try {
      await kanbanStore.moveTask(task.id, 'doing')
    } catch (error) {
      kanbanStore.toast(t('bridge.error.move', { message: messageOf(error) }), 'error')
      return sessionId
    }
  }
  ctx.uiWorkspace.openSession(sessionId)
  return sessionId
}

function TaskSendDialog({ task, onClose }) {
  const destinations = dispatchDestinations(task)
  const initial = destinations.some((item) => item.value === task.sessionId) ? task.sessionId : 'new'
  const [destination, setDestination] = useState(initial)
  const [mode, setMode] = useState('execute')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const selected = destinations.find((item) => item.value === destination)
  async function send() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await dispatchTask(task, destination, mode)
      onClose()
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return h(DshUI.Modal, {
    open: true, title: t('send.title'), closeLabel: t('common.close'),
    onClose: () => { if (!pending.current) onClose() },
    footer: h('div', { className: 'kbn-send-footer' },
      h(DshUI.Button, { variant: 'ghost', disabled: busy, onClick: onClose }, t('common.cancel')),
      h(DshUI.Button, { variant: 'primary', disabled: busy || !selected, onClick: send }, t('send.submit'))),
  }, h('div', { className: 'kbn-send-form' },
    h('strong', null, task.title),
    h('span', null, t('send.destination')),
    h(DshUI.SegmentedControl, {
      id: 'kbn-destination', label: t('send.destination'), value: destination,
      options: destinations, onChange: setDestination, disabled: busy,
    }),
    selected?.title && h('div', { className: 'kbn-send-note' }, selected.title),
    task.sessionId && destination !== task.sessionId && h('div', { className: 'kbn-send-note' }, t('send.relink')),
    h('span', null, t('send.mode')),
    h(DshUI.SegmentedControl, {
      id: 'kbn-mode', label: t('send.mode'), value: mode, onChange: setMode, disabled: busy,
      options: ['execute', 'discuss'].map((value) => ({ value, label: t('send.' + value) })),
    }),
    error && h('p', { role: 'alert', className: 'kbn-editor-error' }, error)))
}

addStyle(`
.kbn-send-form { display: grid; gap: 10px; overflow-wrap: anywhere; }
.kbn-send-form > strong { margin-bottom: 6px; }
.kbn-send-note { color: var(--dsw-alias-label-secondary); }
.kbn-send-footer { display: flex; justify-content: flex-end; gap: 8px; }
`)

async function openTaskSession(task) {
  if (!task.sessionId) return
  try {
    await kanbanStore.ctx.uiWorkspace.openSession(task.sessionId)
  } catch (error) {
    kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
  }
}

function TaskLinkAction({ sessionId }) {
  const linked = tasksForSession(kanbanStore.use(), sessionId)
  if (!linked.length) return null
  return h(SessionTaskMenu, { key: sessionId, sessionId, tasks: linked })
}

function SessionTaskMenu({ sessionId, tasks }) {
  const [content, setContent] = useState(null)
  const open = content !== null
  function toggle(event) {
    const root = event.currentTarget.closest('[data-phase]')
    const body = root?.querySelector('[data-conversation-content]')
    setContent((current) => !current && body?.dataset.conversationSession === sessionId ? body : null)
  }
  // The native menu adds a 4px gap below this virtual anchor. Reading the
  // content bounds on placement follows sidebar resizing without tracking scroll.
  const getAnchorRect = useCallback(() => {
    if (!content) return null
    const bounds = content.getBoundingClientRect()
    const width = Math.min(288, Math.max(0, bounds.width - 32))
    return new DOMRect(bounds.right - 16 - width, bounds.top + 8, width, 0)
  }, [content])
  const label = t('bridge.link.label')
  const items = [{ type: 'label', id: 'heading', text: label }, ...tasks.map((task) => ({
    id: task.id,
    label: h('span', { className: 'kbn-session-task-row' },
      h('span', { className: 'kbn-session-task-name', title: task.title }, task.title),
      h(DshUI.Pill, { className: 'kbn-session-task-status', 'data-status': task.status }, t('status.' + task.status))),
  }))]
  return h(DshUI.Menu, {
    open, align: 'end', portal: true, autoFocus: true, getAnchorRect, minWidthFromAnchor: true,
    items, listClassName: 'kbn-session-tasks',
    onClose: () => setContent(null),
    onSelect: (id) => {
      setContent(null)
      kanbanStore.setFocusTask(id)
      kanbanStore.ctx.layout.selectPanel(PANEL_ID)
    },
    anchor: h(DshUI.Button, {
      variant: open ? 'toolbar' : 'ghost', size: 'sm', title: label,
      'aria-label': label, 'aria-haspopup': 'menu', 'aria-expanded': open,
      onClick: toggle,
    }, h(DshUI.IconFlatListOutlineRegular, { size: 16 })),
  })
}

addStyle(`
/* DSH sets the surface's minimum width from the conversation anchor. */
.kbn-session-tasks { width: 0; }
.kbn-session-task-row { display: flex; align-items: center; gap: 12px; width: 100%; }
.kbn-session-task-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.kbn-session-task-status { flex: none; }
.kbn-session-task-status[data-status=doing] { color: var(--dsw-alias-state-business-primary); }
.kbn-session-task-status[data-status=done] { color: var(--dsw-alias-state-success-primary); }
`)
