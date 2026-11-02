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
function buildTaskBrief(task, workspace) {
  const lines = []
  lines.push(t('bridge.prompt.title'))
  lines.push('')
  lines.push(t('bridge.prompt.task', { title: task.title }))
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
  if (typeof task.description === 'string' && task.description.trim() !== '') {
    lines.push('')
    lines.push(t('bridge.prompt.description'))
    lines.push(task.description.trim())
  }
  lines.push('')
  lines.push(t('bridge.prompt.request'))
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
    const renamed = await session.rename(t('bridge.sessionTitle', { title: title }))
    void renamed
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

/**
 * Create (or reuse) a session in the task's workspace, link it to the card and
 * send the task brief. The board calls this from the card's run button.
 * @param {object} task
 * @returns {Promise<string | null>} the session id, or null when cancelled
 */
async function runTaskInNewSession(task) {
  if (kanbanStore === null) throw new Error(t('bridge.error.noWorkspace'))
  const ctx = kanbanStore.ctx
  const found = bridgeLookup(task.id)
  if (found === null) throw new Error(t('bridge.error.noWorkspace'))

  const workspaceId = await ensureBoardWorkspace(found.task)
  if (workspaceId === null) return null
  const refreshed = bridgeLookup(task.id)
  const promptTask = refreshed !== null ? refreshed.task : found.task
  const workspace = refreshed !== null ? refreshed.workspace : found.workspace

  let sessionId
  try {
    sessionId = await ctx.uiWorkspace.connectWorkspace(workspaceId)
    if (typeof sessionId !== 'string' || sessionId === '') throw new Error(t('api.badResponse'))
  } catch (error) {
    throw new Error(t('bridge.error.create', { message: messageOf(error) }))
  }

  try {
    await kanbanStore.linkSession(promptTask.id, sessionId)
  } catch (error) {
    throw new Error(t('bridge.error.link', { message: messageOf(error) }))
  }
  try {
    await promptSession(ctx, sessionId, buildTaskBrief(promptTask, workspace), promptTask.title)
  } catch (error) {
    throw new Error(t('bridge.error.prompt', { message: messageOf(error) }))
  }
  const current = taskById(kanbanStore.getSnapshot(), promptTask.id)
  if (current !== null && current.status === 'todo') {
    try {
      await kanbanStore.moveTask(promptTask.id, 'doing')
    } catch (error) {
      kanbanStore.toast(t('bridge.error.move', { message: messageOf(error) }), 'error')
      return sessionId
    }
  }
  ctx.uiWorkspace.openSession(sessionId)
  return sessionId
}

/**
 * Open the session linked to a task, creating one when the task is an AI task
 * without a session yet.
 * @param {string} taskId
 * @returns {Promise<void>}
 */
async function openTaskSession(taskId) {
  const found = bridgeLookup(taskId)
  if (found === null) return
  const { task } = found
  if (typeof task.sessionId === 'string' && task.sessionId !== '') {
    kanbanStore.ctx.uiWorkspace.openSession(task.sessionId)
    return
  }
  if (task.assignee && task.assignee.kind === 'ai') {
    await runTaskInNewSession(task)
  }
}

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
