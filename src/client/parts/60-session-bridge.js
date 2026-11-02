/**
 * Task ↔ Session bridge.
 *
 * An AI task can be executed by a harness session: the board asks for a session
 * in the task's workspace, links it to the card, sends the task brief as the
 * first prompt, and from then on the card and the session header link to each
 * other. Archiving a Done task archives its session too.
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
    'bridge.link.title': '该会话属于任务：{title}',
    'bridge.link.label': '任务',
    'bridge.link.open': '打开任务卡片',
    'bridge.error.noWorkspace': '找不到任务所在的工作区',
    'bridge.error.create': '创建会话失败：{message}',
    'bridge.error.link': '未能关联会话，任务尚未发送。{message}',
    'bridge.error.prompt': '未能确认任务已发送，请打开关联会话查看。{message}',
    'bridge.error.move': '任务已发送，请手动更新卡片状态。{message}',
    'bridge.error.archive': '归档会话失败：{message}',
    'bridge.error.restore': '恢复会话失败：{message}',
    'bridge.error.unconfirmed': '会话状态已更新，卡片状态暂时无法确认。请刷新看板后核对。{message}',
    'bridge.error.rollback': '卡片更新失败，关联会话也未能回到原状态。请核对后重试。{message} / {rollback}',
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
    'bridge.link.title': 'This session belongs to the task: {title}',
    'bridge.link.label': 'Task',
    'bridge.link.open': 'Open task card',
    'bridge.error.noWorkspace': 'The task workspace could not be found',
    'bridge.error.create': 'Could not create a session: {message}',
    'bridge.error.link': 'Could not link the session. The brief was not sent. {message}',
    'bridge.error.prompt': 'Could not confirm delivery. Open the linked session to check. {message}',
    'bridge.error.move': 'The brief was sent. Update the card status manually. {message}',
    'bridge.error.archive': 'Could not archive the session: {message}',
    'bridge.error.restore': 'Could not restore the session: {message}',
    'bridge.error.unconfirmed': 'Session updated. Refresh the board to check the card status. {message}',
    'bridge.error.rollback': 'Card update failed and the session could not be returned to its previous state. Check both before retrying. {message} / {rollback}',
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

/**
 * Send the task brief into one session as its first queued prompt.
 * @param {object} ctx - client context from the store
 * @param {string} sessionId
 * @param {string} text
 * @param {string} title - session title to write when the host accepts it
 * @returns {Promise<void>}
 */
async function promptSession(ctx, sessionId, text, title) {
  const reference = ctx.sessions.retain(sessionId, { source: 'gateway' })
  try {
    await reference.ready
    const session = reference.binding.session
    if (title) await session.rename(t('bridge.sessionTitle', { title }))
    const result = await session.prompt([{ type: 'text', text }], 'queue')
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
  try {
    await kanbanStore.linkSession(task.id, sessionId, task.sessionId)
  } catch (error) {
    throw new Error(t('bridge.error.link', { message: messageOf(error) }))
  }
  try {
    const brief = buildTaskBrief(refreshed.task, refreshed.workspace, mode)
    await promptSession(ctx, sessionId, brief, destination === 'new' ? refreshed.task.title : null)
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

/**
 * Apply the same archive state to the session and the card. If a card reply
 * is lost, read back the durable state before deciding whether to undo.
 */
async function setTaskArchivedWithSession(task, archived) {
  const store = kanbanStore
  const updateCard = archived ? store.archiveTask : store.restoreTask
  const id = task.sessionId
  if (typeof id !== 'string' || id === '') return updateCard(task.id)

  const { uiWorkspace, workspaces } = store.ctx
  const previouslyArchived = workspaces.list?.getSnapshot().archivedSessionIds?.includes(id)
  try {
    if (archived) await uiWorkspace.archiveSession(id, { stopActivity: true })
    else await uiWorkspace.unarchiveSession(id)
  } catch (error) {
    throw new Error(t(archived ? 'bridge.error.archive' : 'bridge.error.restore', { message: messageOf(error) }))
  }
  try {
    return await updateCard(task.id)
  } catch (error) {
    await store.refresh()
    const snapshot = store.getSnapshot()
    const confirmed = taskById(snapshot, task.id)
    if (snapshot.status !== 'ready' || !confirmed || confirmed.sessionId !== id) {
      throw new Error(t('bridge.error.unconfirmed', { message: messageOf(error) }))
    }
    if (confirmed.archived === archived) return confirmed
    if (previouslyArchived !== archived) {
      try {
        if (archived) await uiWorkspace.unarchiveSession(id)
        else await uiWorkspace.archiveSession(id, { stopActivity: false })
      } catch (rollback) {
        throw new Error(t('bridge.error.rollback', { message: messageOf(error), rollback: messageOf(rollback) }))
      }
    }
    throw error
  }
}

/**
 * Session-header entry: visible only while the open session is linked to a task.
 * Clicking it selects the board panel and reveals the card.
 * @param {{ sessionId?: string, t?: Function }} props
 * @returns {object | null} React element or null
 */
function TaskLinkAction({ sessionId, t: tr }) {
  const translate = typeof tr === 'function' ? tr : t
  const linked = kanbanStore.use(
    (snapshot) => taskForSession(snapshot, sessionId),
    (left, right) => (left === null || left === undefined)
      ? (right === null || right === undefined)
      : (right !== null && right !== undefined && left.id === right.id && left.title === right.title),
  )
  if (!linked) return null
  const open = () => {
    kanbanStore.setFocusTask(linked.id)
    kanbanStore.ctx.layout.selectPanel(PANEL_ID)
  }
  return h(
    'button',
    {
      type: 'button',
      className: 'kbn-header-task',
      title: translate('bridge.link.title', { title: linked.title }),
      'aria-label': translate('bridge.link.open') + ': ' + linked.title,
      onClick: open,
    },
    h(Icon, { name: 'board', size: 14 }),
    h('span', { className: 'kbn-header-task-label' }, translate('bridge.link.label')),
    h('span', { className: 'kbn-header-task-title' }, linked.title),
  )
}


addStyle(`
.kbn-header-task {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  height: 28px;
  padding: 0 8px;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}
.kbn-header-task:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.kbn-header-task:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -2px;
}
.kbn-header-task-label { color: var(--dsw-alias-label-tertiary); flex: none; }
.kbn-header-task-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
`)
