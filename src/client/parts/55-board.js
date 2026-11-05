/**
 * The board panel: header + board switcher + three status columns, drag & drop,
 * empty/loading/error states, focus reveal, archive dialog and board creation.
 */
addDict(
  {
    'board.subtitle': '{todo} 个待办 · {doing} 个进行中 · {done} 个已完成',
    'board.subtitleEmpty': '选择或新建一个项目开始',
    'board.selectBoard': '选择看板',
    'board.newBoard': '新建看板',
    'board.resizeDetail': '拖动调整任务详情宽度',
    'board.newTask': '新建任务',
    'board.emptyColumn': '暂无任务',
    'board.noBoardTitle': '还没有看板',
    'board.noBoardDesc': '新建一个看板开始，不需要先绑定工作目录；第一次把 AI 任务发送到会话时再选择目录。',
    'board.errorTitle': '看板加载失败',
    'board.archived': '任务已归档',
    'detail.title': '任务详情',
    'detail.close': '关闭详情',
    'detail.emptyTitle': '选择一个任务',
    'detail.emptyDesc': '点击左侧卡片查看完整字段、附件与关联会话。',
    'detail.start': '开始日期',
    'detail.due': '截止日期',
    'detail.created': '创建时间',
    'detail.updated': '更新时间',
    'detail.description': '描述',
    'detail.tags': '标签',
    'detail.attachments': '附件',
    'detail.session': '执行会话',
    'detail.linkedSession': '已关联会话',
    'detail.noValue': '未设置',
    'detail.noDescription': '无描述',
    'detail.noAttachments': '没有附件',
    'detail.previewAttachment': '预览 {name}',
    'detail.previewHint': '点大图放大；视频与其他文件在右侧栏预览。',
    'detail.noSession': '这个任务还没有关联会话',
    'detail.aiHint': 'AI 任务可以发送到会话，执行后会话会关联回这张卡片。',
    'detail.edit': '编辑',
    'detail.run': '发送到会话',
    'detail.changeStatus': '修改任务状态',
    'detail.delete': '删除',
    'detail.deleteConfirm': '再点一次删除',
    'board.untitled': '未命名看板',
    'board.dialogTitle': '新建看板',
    'board.nameLabel': '看板名称',
    'board.namePlaceholder': '例如：Sprint 1',
    'board.nameRequired': '请填写看板名称',
    'board.createAction': '创建',
    'board.created': '看板「{title}」已创建',
    'board.dirLaterHint': '工作目录会在第一次把 AI 任务发送到会话时再选择。',
    'binding.open': '管理工作区绑定',
    'binding.bind': '绑定工作区',
    'binding.unbind': '解绑工作区',
    'binding.current': '已绑定：{title}',
    'binding.select': '选择工作区',
    'binding.placeholder': '请选择工作区',
    'binding.directory': '选择其他目录…',
    'binding.hint': '任务将移入所选工作区的看板，保留当前看板名称；目标看板已有的任务会合并保留。',
    'binding.detachHint': '任务和附件会保留在独立看板中，任务上的会话关联会解除。原工作区、会话和文件不受影响，主页仍会显示该工作区的空看板。',
    'binding.saved': '工作区已绑定',
    'binding.detached': '工作区已解绑，任务已保留在独立看板中',
  },
  {
    'board.subtitle': '{todo} to do · {doing} in progress · {done} done',
    'board.subtitleEmpty': 'Choose or create a project to begin',
    'board.selectBoard': 'Select board',
    'board.newBoard': 'New board',
    'board.resizeDetail': 'Drag to resize the task details',
    'board.newTask': 'New task',
    'board.emptyColumn': 'No tasks',
    'board.noBoardTitle': 'No boards yet',
    'board.noBoardDesc': 'Create a board to begin — no directory needed. The directory is picked the first time an AI task runs in a session.',
    'board.errorTitle': 'Could not load the board',
    'board.archived': 'Task archived',
    'detail.title': 'Task details',
    'detail.close': 'Close details',
    'detail.emptyTitle': 'Select a task',
    'detail.emptyDesc': 'Pick a card on the left to see its fields, attachments and session.',
    'detail.start': 'Start date',
    'detail.due': 'Due date',
    'detail.created': 'Created',
    'detail.updated': 'Updated',
    'detail.description': 'Description',
    'detail.tags': 'Tags',
    'detail.attachments': 'Attachments',
    'detail.session': 'Session',
    'detail.linkedSession': 'Linked session',
    'detail.noValue': 'Not set',
    'detail.noDescription': 'No description',
    'detail.noAttachments': 'No attachments',
    'detail.previewAttachment': 'Preview {name}',
    'detail.previewHint': 'Click the large image to zoom; video and other files preview in the right rail.',
    'detail.noSession': 'This task has no session yet',
    'detail.aiHint': 'AI tasks can run in a session; the session links back to this card.',
    'detail.edit': 'Edit',
    'detail.run': 'Send to session',
    'detail.changeStatus': 'Change task status',
    'detail.delete': 'Delete',
    'detail.deleteConfirm': 'Click again to delete',
    'board.untitled': 'Untitled board',
    'board.dialogTitle': 'New board',
    'board.nameLabel': 'Board name',
    'board.namePlaceholder': 'e.g. Sprint 1',
    'board.nameRequired': 'Enter a board name',
    'board.createAction': 'Create',
    'board.created': 'Board "{title}" created',
    'board.dirLaterHint': 'The working directory is chosen the first time an AI task runs in a session.',
    'binding.open': 'Manage workspace binding',
    'binding.bind': 'Bind workspace',
    'binding.unbind': 'Unbind workspace',
    'binding.current': 'Bound: {title}',
    'binding.select': 'Choose workspace',
    'binding.placeholder': 'Select a workspace',
    'binding.directory': 'Choose another directory…',
    'binding.hint': 'Tasks move into the selected workspace board and keep this board’s name. Existing tasks in the destination board are kept and merged.',
    'binding.detachHint': 'Tasks and attachments stay in a standalone board. Task session links are cleared. The workspace, conversations and files stay intact; its empty workspace board remains on Home.',
    'binding.saved': 'Workspace bound',
    'binding.detached': 'Workspace unbound. Tasks kept in a standalone board.',
  },
)

/** localStorage key remembering the user's detail-pane width across reloads. */
// Keep the original preference key so existing detail widths survive the rename.
const KBN_DETAIL_WIDTH_KEY = 'dsh-kanban:detail-width'

/**
 * Read the remembered detail width.
 * @returns {number | null}
 */
function kbnReadDetailWidth() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(KBN_DETAIL_WIDTH_KEY)
    if (typeof raw !== 'string' || raw === '') return null
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/**
 * Remember (or forget) the detail width.
 * @param {number | null} width
 * @returns {void}
 */
function kbnStoreDetailWidth(width) {
  try {
    if (typeof localStorage === 'undefined') return
    if (width === null) localStorage.removeItem(KBN_DETAIL_WIDTH_KEY)
    else localStorage.setItem(KBN_DETAIL_WIDTH_KEY, String(Math.round(width)))
  } catch {
    // Private browsing or a disabled store: the width simply is not remembered.
  }
}

/** Detail-pane width chosen by dragging; null means the responsive default. */
let kbnDetailWidth = kbnReadDetailWidth()
/** Narrowest usable detail pane. */
const KBN_DETAIL_MIN = 232
/** Widest detail pane on any screen. */
const KBN_DETAIL_MAX = 560
/** Three readable columns and the two 14px gutters between them. */
const KBN_BOARD_MIN = 3 * 216 + 2 * 14
/** Resizer width plus the two flex gaps it replaces. */
const KBN_RESIZER_SPACE = 34

/**
 * Reserve room for the three columns after the sidebar and page gutters.
 * @param {number} workbenchWidth
 * @returns {{ min: number, max: number, fallback: number, stacked: boolean }}
 */
function kbnDetailLimits(workbenchWidth) {
  const width = Number.isFinite(workbenchWidth) && workbenchWidth > 0 ? workbenchWidth : 1200
  const remaining = width - KBN_RESIZER_SPACE - KBN_BOARD_MIN
  const max = Math.max(KBN_DETAIL_MIN, Math.min(KBN_DETAIL_MAX, Math.floor(remaining)))
  const fallback = Math.min(max, 304, Math.max(248, Math.round(width * 0.26)))
  return { min: KBN_DETAIL_MIN, max, fallback, stacked: remaining < KBN_DETAIL_MIN }
}

/**
 * Clamp one requested detail width into the adaptive range.
 * @param {number} width
 * @param {{ min: number, max: number }} limits
 * @returns {number}
 */
function kbnClampDetailWidth(width, limits) {
  const rounded = Math.round(width)
  return Math.min(limits.max, Math.max(limits.min, Number.isFinite(rounded) ? rounded : limits.fallback))
}

/** Keep board identity across panel mounts, reloads and desktop restarts. */
const KBN_SELECTED_BOARD_KEY = 'dsh-workboard:selected-board'

function kbnReadSelectedBoard() {
  try {
    return localStorage.getItem(KBN_SELECTED_BOARD_KEY) || null
  } catch {
    return null
  }
}

let kbnLastWorkspaceId = kbnReadSelectedBoard()

function kbnRememberBoard(boardId) {
  if (boardId === kbnLastWorkspaceId) return
  kbnLastWorkspaceId = boardId
  try {
    if (boardId === null) localStorage.removeItem(KBN_SELECTED_BOARD_KEY)
    else localStorage.setItem(KBN_SELECTED_BOARD_KEY, boardId)
  } catch {
    // The in-memory selection still works when browser storage is unavailable.
  }
}

/**
 * Create a standalone board. A board does not need a working directory; the
 * directory is requested the first time one of its AI tasks is sent to a
 * session (handled by `dispatchTask`).
 * @param {{ open: boolean, onClose: (board?: object) => void }} props
 * @returns {object} React element
 */
function NewBoardDialog({ open, onClose }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const saving = useRef(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setBusy(false)
    setError(null)
  }, [open])

  async function save() {
    if (saving.current) return
    const name = title.trim()
    if (name === '') {
      setError(t('board.nameRequired'))
      return
    }
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      const board = await kanbanStore.createBoard(name)
      kanbanStore.toast(t('board.created', { title: board.title }), 'info')
      onClose(board)
    } catch (failure) {
      setError(messageOf(failure))
      setBusy(false)
    } finally {
      saving.current = false
    }
  }

  const footer = [
    h(DshUI.Button, { key: 'cancel', variant: 'ghost', size: 'sm', disabled: busy, onClick: () => onClose() }, t('common.cancel')),
    h(DshUI.Button, { key: 'create', variant: 'primary', size: 'sm', disabled: busy, onClick: save }, t('board.createAction')),
  ]

  return h(DshUI.Modal, {
    open,
    onClose: () => { if (!saving.current) onClose() },
    title: t('board.dialogTitle'),
    closeLabel: t('common.close'),
    className: 'kbn-new-board-dialog',
    footer,
  }, h('div', { className: 'kbn-project-dialog' },
    error !== null ? h('p', { className: 'kbn-editor-error', role: 'alert' }, error) : null,
    h(Field, { label: t('board.nameLabel') },
      h(DshUI.Input, {
        value: title,
        onChange: (event) => setTitle(event.currentTarget.value),
        placeholder: t('board.namePlaceholder'),
        maxLength: 80,
        disabled: busy,
        autoFocus: true,
        'aria-label': t('board.nameLabel'),
        onKeyDown: (event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            save()
          }
        },
      })),
    h('p', { className: 'kbn-detail-note' }, t('board.dirLaterHint'))))
}

function BoardBindingDialog({ board, workspaces, onClose }) {
  const [workspaceId, setWorkspaceId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saving = useRef(false)

  async function save(directory = false) {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      if (board.bound) await kanbanStore.unbindBoard(board.id)
      else if (directory) {
        if (!await pickBoardWorkspace(board)) return
      } else await kanbanStore.bindBoard(board.id, workspaceId)
      kanbanStore.toast(t(board.bound ? 'binding.detached' : 'binding.saved'), 'info')
      onClose()
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return h(DshUI.Modal, {
    open: true, title: t(board.bound ? 'binding.unbind' : 'binding.bind'), closeLabel: t('common.close'),
    onClose: () => { if (!saving.current) onClose() },
    footer: [
      h(DshUI.Button, { key: 'cancel', variant: 'ghost', size: 'sm', disabled: busy, onClick: onClose }, t('common.cancel')),
      h(DshUI.Button, { key: 'save', variant: 'primary', size: 'sm', loading: busy, disabled: busy || (!board.bound && !workspaceId), onClick: () => save() }, t(board.bound ? 'binding.unbind' : 'binding.bind')),
    ],
  }, h('div', { className: 'kbn-project-dialog', 'aria-busy': busy },
    board.bound ? h('p', { className: 'kbn-binding-path' }, board.path)
      : h(Fragment, null,
        h(Field, { label: t('binding.select') }, h(Select, {
          value: workspaceId, onChange: setWorkspaceId, disabled: busy, ariaLabel: t('binding.select'),
          options: [{ value: '', label: t('binding.placeholder') }, ...workspaces.map((ws) => ({ value: ws.id, label: (ws.title || ws.id) + (ws.path ? ' · ' + ws.path : '') }))],
        })),
        h(DshUI.Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => save(true), icon: h(Icon, { name: 'folderOpen', size: 16 }) }, t('binding.directory'))),
    h('p', { className: 'kbn-detail-note' }, t(board.bound ? 'binding.detachHint' : 'binding.hint')),
    error && h('p', { className: 'kbn-editor-error', role: 'alert' }, error)))
}

function useMenuPlacement(open, heightLimit, anchorSelector) {
  const [side, setSide] = useState('bottom')
  const trigger = useRef(null)
  const firstItem = useRef(null)
  const getAnchorRect = useCallback(() => {
    const anchor = anchorSelector ? trigger.current?.closest(anchorSelector) : trigger.current
    return anchor?.getBoundingClientRect() ?? null
  }, [anchorSelector])

  React.useLayoutEffect(() => {
    if (!open) return
    const menu = firstItem.current?.closest('[role="menu"]')
    if (!menu) return
    function place() {
      const rect = getAnchorRect()
      if (!rect) return
      // DSH reserves a 12px viewport inset and a 4px gap around the trigger.
      const below = window.innerHeight - rect.bottom - 16
      const above = rect.top - 16
      if (heightLimit) menu.style.maxHeight = Math.max(0, Math.min(heightLimit, Math.max(above, below))) + 'px'
      setSide(below < menu.offsetHeight && above > below ? 'top' : 'bottom')
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, getAnchorRect, heightLimit])
  return { trigger, firstItem, getAnchorRect, side }
}

function BoardSwitcher({ boards, board, onChange, disabled }) {
  const [expanded, setExpanded] = useState(false)
  const open = expanded && !disabled && boards.length > 0
  const { trigger, firstItem, getAnchorRect, side } = useMenuPlacement(open, 360, '.kbn-head-main')
  const label = t('board.selectBoard')
  return h(DshUI.Menu, {
    className: 'kbn-board-switcher', listClassName: 'kbn-board-options',
    open, side, align: 'start', portal: true, autoFocus: true, getAnchorRect,
    selectedId: board?.id,
    items: boards.map(({ id, title }, index) => ({
      id, label: h('span', { ref: index === 0 ? firstItem : undefined, className: 'kbn-board-option-name', title }, title),
    })),
    onClose: () => setExpanded(false),
    onSelect: (id) => {
      setExpanded(false)
      if (id !== board?.id) onChange(id)
    },
    anchor: h(DshUI.Button, {
      ref: trigger, variant: 'ghost', className: 'kbn-board-switcher-button',
      disabled: disabled || !boards.length, title: open ? undefined : label,
      'aria-label': board ? label + ' · ' + board.title : label, 'aria-haspopup': 'menu', 'aria-expanded': open,
      onClick: () => setExpanded((value) => !value),
      onKeyDown: (event) => {
        if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
          event.preventDefault()
          setExpanded(true)
        }
      },
    }, h('span', { className: 'kbn-board-switcher-name' }, board?.title || label),
    h(DshUI.IconChevronDownOutlineRegular, { size: 16, className: 'kbn-board-switcher-arrow', 'aria-hidden': true })),
  })
}

function TaskStatusMenu({ status, busy, onChange, listClassName }) {
  const [open, setOpen] = useState(false)
  const { trigger, firstItem, side, getAnchorRect } = useMenuPlacement(open)
  const pointer = useRef(false)

  return h('span', {
    className: 'kbn-detail-status-picker',
    onPointerDownCapture: () => { pointer.current = true },
    onKeyDownCapture: () => { pointer.current = false },
  }, h(DshUI.Menu, {
    open, side, align: 'start', portal: true, autoFocus: true, getAnchorRect,
    selectedId: status, listClassName,
    items: STATUSES.map((id, i) => ({
      id, label: h('span', { ref: i === 0 ? firstItem : undefined }, t('status.' + id)),
    })),
    onClose: () => setOpen(false),
    onSelect: (id) => {
      setOpen(false)
      if (id !== status) onChange(id, pointer.current)
    },
    anchor: h(DshUI.Button, {
      variant: 'outline', size: 'sm', className: 'kbn-detail-status-trigger',
      disabled: busy, 'aria-label': t('detail.changeStatus'), title: t('detail.changeStatus'),
      'aria-haspopup': 'menu', 'aria-expanded': open,
      onClick: (event) => {
        trigger.current = event.currentTarget
        setOpen((value) => !value)
      },
    }, h(StatusDot, { status }), h(Icon, { name: 'chevronDown', size: 12 })),
  }))
}

/**
 * Right-hand task detail sheet. A single neutral surface with divided sections,
 * deliberately a different UI form from the three status columns: no status
 * colour bar, vertical field list, attachments and session in one place.
 * @param {{ task: object | null, workspace: object | null, busy: boolean,
 *   onClose: Function, onEdit: Function, onRun: Function,
 *   onOpenSession: Function, onArchive: Function, onStatusChange: Function, onDelete: Function }} props
 * @returns {object} React element
 */
function TaskDetailPanel({
  task,
  workspace,
  busy,
  onClose,
  onEdit,
  onRun,
  onOpenSession,
  onArchive,
  onStatusChange,
  onDelete,
  onPreview,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeAttachmentId, setActiveAttachmentId] = useState(null)
  const account = useKbnAccount()
  const taskId = task === null || task === undefined ? null : task.id
  useEffect(() => {
    setConfirmDelete(false)
  }, [taskId])
  useEffect(() => {
    setActiveAttachmentId(null)
  }, [taskId])

  if (task === null || task === undefined) {
    return h('aside', { className: 'kbn-detail kbn-detail-blank', 'aria-label': t('detail.title') },
      h('span', { className: 'kbn-detail-blank-icon', 'aria-hidden': 'true' }, h(Icon, { name: 'board', size: 22 })),
      h('p', { className: 'kbn-detail-blank-title' }, t('detail.emptyTitle')),
      h('p', { className: 'kbn-detail-note' }, t('detail.emptyDesc')))
  }

  const status = STATUSES.indexOf(task.status) >= 0 ? task.status : 'todo'
  const tags = Array.isArray(task.tags) ? task.tags.filter((tag) => typeof tag === 'string' && tag !== '') : []
  const attachments = Array.isArray(task.attachments) ? task.attachments : []
  const images = attachments.filter((attachment) => kbnAttachmentKind(attachment) === 'image')
  const activeImage = images.find((attachment) => attachment.id === activeAttachmentId)
    || images[0]
    || null
  const assignee = task.assignee !== null && typeof task.assignee === 'object'
    ? task.assignee
    : { kind: 'human', name: '' }
  const isAI = assignee.kind === 'ai'
  const accountProfile = account !== null && account !== undefined ? account.profile : null
  const showAccountAvatar = !isAI && kbnAccountMatchesTask(task, accountProfile)
  const assigneeLabel = typeof assignee.name === 'string' && assignee.name.trim() !== ''
    ? assignee.name
    : (isAI ? t('assignee.ai') : (showAccountAvatar && accountProfile.name !== null ? accountProfile.name : t('assignee.human')))
  const title = typeof task.title === 'string' && task.title.trim() !== '' ? task.title : t('card.untitled')
  const description = typeof task.description === 'string' ? task.description.trim() : ''
  const linked = typeof task.sessionId === 'string' && task.sessionId !== ''
  const dueIn = typeof task.dueDate === 'string' && task.dueDate !== '' ? daysUntil(task.dueDate) : null
  const overdue = dueIn !== null && dueIn < 0

  const actions = []
  if (linked) {
    actions.push(h(Button, {
      key: 'session',
      size: 'sm',
      variant: 'ghost',
      icon: h(Icon, { name: 'link', size: 12 }),
      onClick: () => onOpenSession(task),
    }, t('action.openSession')))
  }
  actions.push(h(Button, {
    key: 'archive',
    size: 'sm',
    variant: 'ghost',
    icon: h(Icon, { name: 'archive', size: 12 }),
    disabled: busy,
    onClick: () => onArchive(task),
  }, t('card.archive')))
  actions.push(h(Button, {
    key: 'delete',
    size: 'sm',
    variant: 'danger',
    icon: h(Icon, { name: 'trash', size: 12 }),
    disabled: busy,
    onClick: () => {
      if (confirmDelete) {
        setConfirmDelete(false)
        onDelete(task)
        return
      }
      setConfirmDelete(true)
    },
  }, confirmDelete ? t('detail.deleteConfirm') : t('detail.delete')))
  if (isAI && status !== 'done') {
    actions.push(h(Button, {
      key: 'run',
      size: 'sm',
      variant: 'primary',
      icon: h(Icon, { name: 'send', size: 12 }),
      disabled: busy,
      onClick: () => onRun(task),
    }, t('detail.run')))
  }

  return h('aside', { className: 'kbn-detail', 'aria-label': t('detail.title') },
    h('header', { className: 'kbn-detail-head' },
      h('span', { className: 'kbn-detail-eyebrow' }, t('detail.title')),
      h('div', { className: 'kbn-detail-head-actions' },
        h('button', {
          type: 'button',
          className: 'kbn-card-edit kbn-detail-edit',
          'aria-label': t('detail.edit'),
          title: t('detail.edit'),
          disabled: busy || undefined,
          onClick: () => onEdit(task),
        }, h(Icon, { name: 'edit', size: 13 })),
        h(IconButton, { icon: h(Icon, { name: 'close' }), label: t('detail.close'), onClick: onClose }))),
    h('div', { className: 'kbn-detail-body' },
      h('div', { className: 'kbn-detail-content' },
        h('div', { className: 'kbn-detail-title-row' },
          h('h2', { className: 'kbn-detail-title' }, title),
          h(PriorityBadge, { priority: task.priority })),
        description !== '' && h('p', { className: 'kbn-detail-desc' }, description)),
      workspace !== null && workspace !== undefined
        ? h('p', { className: 'kbn-detail-workspace', title: workspace.path || workspace.title },
          h(Icon, { name: workspace.path !== '' ? 'folderOpen' : 'board', size: 12 }),
          h('span', null, workspace.title))
        : null,
      h('div', { className: 'kbn-detail-chips' },
        h(TaskStatusMenu, {
          key: task.id, status, busy,
          onChange: (value, animate) => onStatusChange(task, value, animate),
        }),
        h('span', { className: 'kbn-detail-status', 'data-kind': isAI ? 'ai' : 'human' },
          showAccountAvatar
            ? h(KbnAccountAvatar, { profile: accountProfile, size: 18 })
            : h(Icon, { name: isAI ? 'sparkle' : 'user', size: 12 }),
          assigneeLabel),
        linked
          ? h('span', { className: 'kbn-detail-status', 'data-tone': 'brand' },
            h(Icon, { name: 'link', size: 12 }),
            t('detail.linkedSession'))
          : null),
      h('dl', { className: 'kbn-detail-fields' },
        h('dt', null, t('detail.start')),
        h('dd', null, typeof task.startDate === 'string' && task.startDate !== '' ? task.startDate : t('detail.noValue')),
        h('dt', null, t('detail.due')),
        h('dd', { className: overdue ? 'kbn-detail-overdue' : undefined },
          typeof task.dueDate === 'string' && task.dueDate !== '' ? formatDay(task.dueDate) : t('detail.noValue')),
        h('dt', null, t('detail.created')),
        h('dd', null, typeof task.createdAt === 'string' && task.createdAt !== '' ? task.createdAt.slice(0, 10) : t('detail.noValue')),
        h('dt', null, t('detail.updated')),
        h('dd', null, typeof task.updatedAt === 'string' && task.updatedAt !== '' ? task.updatedAt.slice(0, 10) : t('detail.noValue'))),
      tags.length > 0
        ? h('section', { className: 'kbn-detail-section' },
          h('h3', { className: 'kbn-detail-section-title' }, t('detail.tags')),
          h('div', { className: 'kbn-detail-tags' },
            tags.map((tag, index) => h('span', { className: 'kbn-tag', key: index }, tag))))
        : null,
      h('section', { className: 'kbn-detail-section' },
        h('h3', { className: 'kbn-detail-section-title' }, t('detail.attachments')),
        attachments.length > 0
          ? h('div', { className: 'kbn-attach' },
            activeImage !== null
              ? h('button', {
                type: 'button',
                className: 'kbn-attach-hero',
                title: activeImage.name,
                'aria-label': t('detail.previewAttachment', { name: activeImage.name }),
                onClick: () => {
                  if (typeof onPreview === 'function') onPreview(activeImage)
                },
              },
                h('img', {
                  className: 'kbn-attach-hero-img',
                  src: kanbanStore.attachmentUrl(activeImage.id),
                  alt: activeImage.name,
                  loading: 'lazy',
                }),
                h('span', { className: 'kbn-attach-hero-cap' },
                  h(Icon, { name: 'search', size: 12 }),
                  h('span', { className: 'kbn-attach-hero-name' }, activeImage.name),
                  h('span', { className: 'kbn-attach-hero-size' }, formatBytes(activeImage.size))))
              : null,
            h('div', { className: 'kbn-attach-thumbs' },
              attachments.map((attachment) => {
                const kind = kbnAttachmentKind(attachment)
                const active = activeImage !== null && attachment.id === activeImage.id
                if (kind === 'image') {
                  return h('button', {
                    key: attachment.id,
                    type: 'button',
                    className: 'kbn-attach-thumb',
                    'data-active': active ? 'true' : undefined,
                    title: t('detail.previewAttachment', { name: attachment.name }),
                    'aria-label': t('detail.previewAttachment', { name: attachment.name }),
                    onClick: () => setActiveAttachmentId(attachment.id),
                  }, h('img', {
                    className: 'kbn-attach-thumb-img',
                    src: kanbanStore.attachmentUrl(attachment.id),
                    alt: attachment.name,
                    loading: 'lazy',
                  }))
                }
                return h('button', {
                  key: attachment.id,
                  type: 'button',
                  className: 'kbn-attach-thumb kbn-attach-thumb-file',
                  title: attachment.name,
                  'aria-label': t('detail.previewAttachment', { name: attachment.name }),
                  onClick: () => {
                    if (typeof onPreview === 'function') onPreview(attachment)
                  },
                },
                  h(Icon, { name: kbnAttachmentIcon(kind), size: 16 }),
                  h('span', { className: 'kbn-attach-thumb-ext' }, kbnAttachmentExt(attachment.name) || 'FILE'))
              })),
            h('p', { className: 'kbn-detail-note' }, t('detail.previewHint')))
          : h('p', { className: 'kbn-detail-note' }, t('detail.noAttachments'))),
      h('section', { className: 'kbn-detail-section' },
        h('h3', { className: 'kbn-detail-section-title' }, t('detail.session')),
        linked
          ? h('code', { className: 'kbn-detail-session' }, task.sessionId)
          : h('p', { className: 'kbn-detail-note' }, isAI ? t('detail.aiHint') : t('detail.noSession')))),
    h('footer', { className: 'kbn-detail-actions' }, actions))
}

/** Reveal the destination in its column and carry the card across the column gutters. */
function revealMovedCard(card, from) {
  const column = card.closest('.kbn-col-body')
  const scroller = getComputedStyle(column).overflowY === 'visible' ? card.closest('.kbn-board-region') : column
  const viewport = scroller.getBoundingClientRect()
  const bounds = card.getBoundingClientRect()
  if (bounds.top < viewport.top) scroller.scrollTop += bounds.top - viewport.top
  else if (bounds.bottom > viewport.bottom) {
    scroller.scrollTop += Math.min(bounds.top - viewport.top, bounds.bottom - viewport.bottom)
  }
  if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const board = card.closest('.kbn-board')
  const origin = board.getBoundingClientRect()
  const to = card.getBoundingClientRect()
  const x1 = from.left - origin.left
  const y1 = from.top - origin.top
  const x2 = to.left - origin.left
  const y2 = to.top - origin.top
  const lift = Math.min(36, Math.abs(x2 - x1) * 0.08)
  // Both scrollable columns clip their children. Animate an inert copy on the
  // board surface; the real card already occupies its final slot.
  const copy = card.cloneNode(true)
  copy.inert = true
  copy.setAttribute('aria-hidden', 'true')
  copy.removeAttribute('data-task-id')
  copy.classList.add('kbn-card-flight')
  copy.style.width = to.width + 'px'
  copy.style.offsetPath = `path("M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - lift} ${x2} ${y2}")`
  board.appendChild(copy)
  const conceal = card.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 260, fill: 'both' })
  const flight = copy.animate([{ offsetDistance: '0%' }, { offsetDistance: '100%' }], {
    duration: 260, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both',
  })
  function removeCopy() {
    copy.remove()
    conceal.cancel()
  }
  flight.onfinish = removeCopy
  return () => { flight.cancel(); removeCopy() }
}

/**
 * The central board panel. Standard slot props are accepted; copy, data and
 * actions come from the prelude and the module-level store.
 * @param {object} [props]
 * @returns {object} React element
 */
function BoardPage(props) {
  const store = kanbanStore
  const state = store.use((snapshot) => snapshot)
  const [workspaceId, setWorkspaceId] = useState(props?.boardId || kbnLastWorkspaceId)
  const [sendTask, setSendTask] = useState(null)
  const [editor, setEditor] = useState(null)
  const [boardOpen, setBoardOpen] = useState(false)
  const [bindingOpen, setBindingOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [selection, setSelection] = useState({ ids: [], anchorId: null })
  const [batchBusy, setBatchBusy] = useState(false)
  const movingTasks = useRef(false)
  const [drag, setDrag] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [busyTaskId, setBusyTaskId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [detailWidth, setDetailWidth] = useState(kbnDetailWidth)
  const [workbenchWidth, setWorkbenchWidth] = useState(() => window.innerWidth)
  const [resizing, setResizing] = useState(false)
  const workbenchRef = useRef(null)
  const pendingMove = useRef(null)
  const resizeStartRef = useRef(null)

  const boards = boardsOf(state)
  const selectedBoard = boardOf(state, workspaceId)
  const activeBoard = selectedBoard !== null
    ? selectedBoard
    : (boards.length > 0 ? boards[0] : null)
  const activeBoardId = activeBoard !== null ? activeBoard.id : null
  const boardTasks = activeBoardId !== null ? tasksOf(state, activeBoardId) : []
  const tasksByStatus = { todo: [], doing: [], done: [] }
  boardTasks.forEach((task) => {
    if (tasksByStatus[task.status] !== undefined) tasksByStatus[task.status].push(task)
  })
  const selectedTask = selectedTaskId === null ? null : taskById(state, selectedTaskId)
  const orderedTasks = STATUSES.flatMap((status) => tasksByStatus[status])
  const selectedTasks = orderedTasks.filter((task) => selection.ids.includes(task.id))

  function clearSelection() {
    if (movingTasks.current) return
    setSelection({ ids: [], anchorId: null })
    setSelectedTaskId(null)
  }

  function selectTask(task, event) {
    if (movingTasks.current) return
    const additive = event?.ctrlKey || event?.metaKey
    const range = event?.shiftKey
    const ids = orderedTasks.map((item) => item.id)
    if (range) {
      const anchorId = ids.includes(selection.anchorId) ? selection.anchorId : task.id
      const from = ids.indexOf(anchorId)
      const to = ids.indexOf(task.id)
      const rangeIds = ids.slice(Math.min(from, to), Math.max(from, to) + 1)
      setSelection({ ids: additive ? [...new Set([...selection.ids, ...rangeIds])] : rangeIds, anchorId })
    } else if (additive) {
      setSelection({ ids: selection.ids.includes(task.id)
        ? selection.ids.filter((id) => id !== task.id) : selection.ids.concat(task.id), anchorId: task.id })
    } else {
      setSelection({ ids: [task.id], anchorId: task.id })
    }
    setSelectedTaskId(additive || range ? null : task.id)
  }

  // Remove archived/deleted tasks and selections from a previously opened board.
  useEffect(() => {
    const live = new Set(boardTasks.map((task) => task.id))
    setSelection((current) => current.ids.every((id) => live.has(id)) && (!current.anchorId || live.has(current.anchorId))
      ? current : { ids: current.ids.filter((id) => live.has(id)), anchorId: live.has(current.anchorId) ? current.anchorId : null })
  }, [activeBoardId, state.tasks])

  async function moveSelected(ids, status, beforeId) {
    if (movingTasks.current || !ids.length) return
    movingTasks.current = true
    setBatchBusy(true)
    try {
      await store.moveTasks(ids, status, beforeId)
    } catch (error) {
      store.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      movingTasks.current = false
      setBatchBusy(false)
    }
  }

  // React mounts a new card when it changes columns. Measure its destination
  // before paint, after the host has confirmed the move and the board has reflowed.
  React.useLayoutEffect(() => {
    const move = pendingMove.current
    pendingMove.current = null
    if (!move || selectedTask?.id !== move.id || selectedTask.status !== move.status) return
    const card = workbenchRef.current?.querySelector('.kbn-card-slot > .kbn-card[data-selected=true]')
    if (card) return revealMovedCard(card, move.from)
  }, [selectedTask?.id, selectedTask?.status, activeBoardId])

  // The DSH sidebar can change the panel width without resizing the window.
  // Measure inside the page gutters. Only explicit splitter actions save a preference.
  React.useLayoutEffect(() => {
    const element = workbenchRef.current
    if (!element) return
    function measure() {
      if (element.clientWidth > 0) setWorkbenchWidth(element.clientWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const limits = kbnDetailLimits(workbenchWidth)
  const shownDetailWidth = detailWidth === null ? limits.fallback : kbnClampDetailWidth(detailWidth, limits)

  /** Store one width (clamped) and remember it across panel switches. */
  function applyDetailWidth(next) {
    const width = next === null ? null : kbnClampDetailWidth(next, limits)
    kbnDetailWidth = width
    kbnStoreDetailWidth(width)
    setDetailWidth(width)
  }

  function startResize(event) {
    if (event.button !== undefined && event.button !== 0) return
    const element = event.currentTarget
    resizeStartRef.current = { x: event.clientX, width: shownDetailWidth }
    if (element !== null && element !== undefined && typeof element.setPointerCapture === 'function') {
      try {
        element.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture is best effort; dragging still works without it.
      }
    }
    setResizing(true)
    event.preventDefault()
  }

  function moveResize(event) {
    const start = resizeStartRef.current
    if (start === null) return
    applyDetailWidth(start.width + (start.x - event.clientX))
  }

  function endResize(event) {
    if (resizeStartRef.current === null) return
    resizeStartRef.current = null
    setResizing(false)
    const element = event !== null && event !== undefined ? event.currentTarget : null
    if (element !== null && element !== undefined && typeof element.releasePointerCapture === 'function') {
      try {
        element.releasePointerCapture(event.pointerId)
      } catch {
        // Already released.
      }
    }
  }

  function keyResize(event) {
    const step = event.shiftKey ? 48 : 16
    if (event.key === 'ArrowLeft') applyDetailWidth(shownDetailWidth + step)
    else if (event.key === 'ArrowRight') applyDetailWidth(shownDetailWidth - step)
    else if (event.key === 'Home') applyDetailWidth(limits.min)
    else if (event.key === 'End') applyDetailWidth(limits.max)
    else return
    event.preventDefault()
  }

  // First mount: load the board unless something already did.
  useEffect(() => {
    if (store.getSnapshot().status === 'idle') store.refresh()
  }, [])

  // Keep a valid board selected and remember the last one.
  useEffect(() => {
    // Loading and failed requests cannot tell us whether a saved board is gone.
    if (state.status !== 'ready') return
    if (boards.length === 0) {
      kbnRememberBoard(null)
      if (workspaceId !== null) setWorkspaceId(null)
      return
    }
    if (workspaceId !== null && boardOf(state, workspaceId) !== null) {
      kbnRememberBoard(workspaceId)
      return
    }
    const fallback = kbnLastWorkspaceId !== null && boardOf(state, kbnLastWorkspaceId) !== null
      ? kbnLastWorkspaceId
      : boards[0].id
    kbnRememberBoard(fallback)
    setWorkspaceId(fallback)
  }, [state.status, state.workspaces, state.boards, workspaceId])

  // A preview belongs to the selected task; drop it when the selection moves.
  useEffect(() => {
    setPreview(null)
  }, [selectedTaskId])

  // Forget a selection whose task left the live board (archived or deleted).
  useEffect(() => {
    if (selectedTaskId === null) return
    const task = taskById(state, selectedTaskId)
    if (task === null || task.archived === true) setSelectedTaskId(null)
  }, [state.revision, state.tasks, selectedTaskId])

  // Reveal a task requested through the session header link.
  useEffect(() => {
    const id = store.takeFocusTask()
    if (id === null || id === undefined) return
    const task = taskById(store.getSnapshot(), id)
    if (task === null) {
      store.refresh()
      return
    }
    kbnRememberBoard(task.workspaceId)
    setWorkspaceId(task.workspaceId)
    setSelection({ ids: [id], anchorId: id })
    setSelectedTaskId(id)
  }, [state.revision])

  const editorTask = editor !== null && editor.mode === 'edit' ? taskById(state, editor.taskId) : null
  const editorOpen = editor !== null && (editor.mode === 'create' || editorTask !== null)

  function openCreate(status) {
    if (activeBoardId === null) {
      setBoardOpen(true)
      return
    }
    clearSelection()
    setEditor({ mode: 'create', workspaceId: activeBoardId, status })
  }

  function openEdit(task) {
    selectTask(task)
    setEditor({ mode: 'edit', taskId: task.id })
  }

  function closeEditor() {
    setEditor(null)
  }

  async function changeDetailStatus(task, status, animate) {
    if (task.status === status) return
    const board = workbenchRef.current
    const card = board?.querySelector('.kbn-card-flight') || board?.querySelector('.kbn-card[data-selected=true]')
    pendingMove.current = { id: task.id, status, from: animate ? card?.getBoundingClientRect() : null }
    setBusyTaskId(task.id)
    try {
      await store.moveTask(task.id, status)
    } catch (error) {
      if (pendingMove.current?.id === task.id) pendingMove.current = null
      store.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyTaskId((id) => id === task.id ? null : id)
    }
  }

  async function handleArchiveTask(task) {
    setBusyTaskId(task.id)
    try {
      await store.archiveTask(task.id)
      if (selectedTaskId === task.id) setSelectedTaskId(null)
      kanbanStore.toast(t('board.archived'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyTaskId(null)
    }
  }

  async function handleDeleteTask(task) {
    setBusyTaskId(task.id)
    try {
      await kanbanStore.deleteTask(task.id)
      if (selectedTaskId === task.id) setSelectedTaskId(null)
      kanbanStore.toast(t('editor.deleted'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyTaskId(null)
    }
  }

  function handleCardDragStart(task, event) {
    const tasks = selection.ids.includes(task.id) ? selectedTasks : [task]
    const rect = event.currentTarget.getBoundingClientRect()
    const heights = new Map(Array.from(workbenchRef.current?.querySelectorAll('.kbn-card') || [])
      .map((card) => [card.dataset.taskId, card.getBoundingClientRect().height]))
    // Native dragstart must finish with the source still visible and in place.
    // Only take it out of layout after the browser begins dispatching dragover.
    setDrag({ preview: false, taskIds: tasks.map((item) => item.id), height: tasks.reduce((sum, item) => sum + (heights.get(item.id) || rect.height), 0) + (tasks.length - 1) * 8, width: rect.width })
    if (!selection.ids.includes(task.id)) {
      setSelection({ ids: [task.id], anchorId: task.id })
      setSelectedTaskId(null)
    }
    const column = tasksByStatus[task.status]
    const next = column.slice(column.findIndex((item) => item.id === task.id) + 1).find((item) => !tasks.some((selected) => selected.id === item.id))
    setDropTarget({ status: task.status, beforeId: next?.id || null })
  }

  function handleCardDragEnd() {
    setDrag(null)
    setDropTarget(null)
  }

  function handleColumnDragOver(event, status) {
    if (drag === null) return
    event.preventDefault()
    if (!drag.preview) setDrag((current) => current && { ...current, preview: true })
    if (event.dataTransfer !== null && event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
    if (dropTarget === null || dropTarget.status !== status || dropTarget.beforeId !== null) {
      setDropTarget({ status, beforeId: null })
    }
  }

  function handleCardDragOver(event, task) {
    if (drag === null || drag.taskIds.includes(task.id)) return
    event.preventDefault()
    event.stopPropagation()
    if (!drag.preview) setDrag((current) => current && { ...current, preview: true })
    if (event.dataTransfer !== null && event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
    const cards = (tasksByStatus[task.status] || []).filter((item) => !drag.taskIds.includes(item.id))
    const index = cards.findIndex((item) => item.id === task.id)
    const rect = event.currentTarget.getBoundingClientRect()
    const below = event.clientY > rect.top + rect.height / 2
    let beforeId = task.id
    if (below) {
      const next = index >= 0 ? cards[index + 1] : null
      beforeId = next !== undefined && next !== null ? next.id : null
    }
    if (dropTarget === null || dropTarget.status !== task.status || dropTarget.beforeId !== beforeId) {
      setDropTarget({ status: task.status, beforeId })
    }
  }

  function handleDrop(status) {
    if (drag === null) return
    const target = dropTarget !== null && dropTarget.status === status
      ? dropTarget
      : { status, beforeId: null }
    const taskIds = drag.taskIds
    setDrag(null)
    setDropTarget(null)
    if (taskIds.includes(target.beforeId)) return
    if (taskIds.length > 1) {
      moveSelected(taskIds, status, target.beforeId)
      return
    }
    kanbanStore.moveTask(taskIds[0], status, target.beforeId === null ? undefined : target.beforeId).catch((error) => {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    })
  }

  function renderColumn(status) {
    const tasks = tasksByStatus[status] || []
    const isDropColumn = drag?.preview && dropTarget !== null && dropTarget.status === status
    const statusLabel = t('status.' + status)
    const items = []

    // A separate sibling reserves the card's full footprint without changing
    // the neighboring card's midpoint used to choose before/after insertion.
    function placeholder(key = 'drop-placeholder') {
      return h('div', {
        className: 'kbn-drop-placeholder',
        key,
        'aria-hidden': 'true',
        style: { height: drag.height + 'px' },
        onDragOver: (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
        },
        onDrop: (event) => {
          event.preventDefault()
          event.stopPropagation()
          handleDrop(status)
        },
      })
    }

    tasks.forEach((task) => {
      const showPlaceholder = isDropColumn
        && dropTarget.beforeId === task.id && !drag.taskIds.includes(task.id)
      if (showPlaceholder) items.push(placeholder())
      items.push(h('div', {
        className: 'kbn-card-slot',
        key: task.id,
        'data-task-id': task.id,
        'data-drag-source': drag?.preview && drag.taskIds.includes(task.id) ? 'true' : undefined,
        style: drag?.preview && drag.taskIds.includes(task.id) ? { width: drag.width + 'px' } : undefined,
        onDragOver: (event) => handleCardDragOver(event, task),
        onDrop: (event) => {
          event.preventDefault()
          event.stopPropagation()
          handleDrop(status)
        },
      },
        h(TaskCard, {
          task,
          workspace: activeBoard,
          selected: selection.ids.includes(task.id),
          busy: batchBusy || busyTaskId === task.id,
          onEdit: openEdit,
          onRun: setSendTask,
          onOpenSession: openTaskSession,
          onArchive: handleArchiveTask,
          onDelete: handleDeleteTask,
          onDragStart: (event) => handleCardDragStart(task, event),
          onDragEnd: handleCardDragEnd,
          onSelect: selectTask,
        })))
    })

    if (tasks.length === 0) {
      // Keep the hovered empty-state node mounted: replacing it during
      // dragover can make Chromium cancel a quick drop on the new element.
      items.push(isDropColumn ? placeholder('empty')
        : h('div', { className: 'kbn-col-empty', key: 'empty' }, t('board.emptyColumn')))
    }
    if (tasks.length > 0 && isDropColumn && dropTarget.beforeId === null) {
      items.push(placeholder())
    }

    return h('section', {
      className: 'kbn-col',
      key: status,
      'data-status': status,
      'data-drop': isDropColumn ? 'true' : undefined,
    },
      h('div', { className: 'kbn-col-head' },
        h('span', { className: 'kbn-col-dot', 'data-status': status, 'aria-hidden': 'true' }),
        h('h2', { className: 'kbn-col-title' }, statusLabel),
        h('span', { className: 'kbn-col-count' }, String(tasks.length))),
      h('div', {
        className: 'kbn-col-body',
        onDragOver: (event) => handleColumnDragOver(event, status),
        onDragLeave: (event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            // Inserting a placeholder moves the hovered card under the pointer.
            // Chromium can emit dragleave with no relatedTarget during that reflow.
            const rect = event.currentTarget.getBoundingClientRect()
            if (event.clientX >= rect.left && event.clientX < rect.right
              && event.clientY >= rect.top && event.clientY < rect.bottom) return
            setDropTarget((target) => target?.status === status ? null : target)
          }
        },
        onDrop: (event) => {
          event.preventDefault()
          handleDrop(status)
        },
      }, items))
  }

  const inlineError = state.status === 'error' && typeof state.error === 'string' && state.error !== ''
    ? h('div', { className: 'kbn-error-bar', role: 'alert' },
      h(Icon, { name: 'warning', size: 14 }),
      h('span', null, state.error),
      h(Button, {
        size: 'sm',
        variant: 'ghost',
        icon: h(Icon, { name: 'refresh', size: 12 }),
        onClick: () => store.refresh(),
      }, t('common.retry')))
    : null

  const newBoardAction = h(Button, {
    variant: 'primary',
    icon: h(Icon, { name: 'projectAdd', size: 14 }),
    onClick: () => setBoardOpen(true),
  }, t('board.newBoard'))

  let region
  if (boards.length === 0) {
    if (state.status === 'error') {
      region = h('div', { className: 'kbn-board-region' },
        h('div', { className: 'kbn-board-placeholder' },
          h(EmptyState, {
            icon: h(Icon, { name: 'warning', size: 22 }),
            title: t('board.errorTitle'),
            description: state.error || '',
            action: h(Button, {
              variant: 'outline',
              icon: h(Icon, { name: 'refresh', size: 14 }),
              onClick: () => store.refresh(),
            }, t('common.retry')),
          })))
    } else if (state.status === 'loading' || state.status === 'idle') {
      region = h('div', { className: 'kbn-board-region' },
        h('div', { className: 'kbn-board-placeholder' },
          h('div', { className: 'kbn-empty' },
            h(Spinner, { size: 20, label: t('common.loading') }))))
    } else {
      region = h('div', { className: 'kbn-board-region' },
        h('div', { className: 'kbn-board-placeholder' },
          h(EmptyState, {
            icon: h(Icon, { name: 'projectAdd', size: 22 }),
            title: t('board.noBoardTitle'),
            description: t('board.noBoardDesc'),
            action: newBoardAction,
          })))
    }
  } else {
    region = h('div', { className: 'kbn-board-region' },
      inlineError,
      h('div', {
        className: 'kbn-board',
        onClick: (event) => {
          if (!event.target.closest('.kbn-card') && !event.ctrlKey && !event.metaKey && !event.shiftKey) clearSelection()
        },
        onKeyDown: (event) => {
          if (event.key === 'Escape' && !drag) { event.preventDefault(); clearSelection() }
        },
      }, STATUSES.map(renderColumn)))
  }

  return h('div', { className: 'kbn-root' },
    h('div', { className: 'kbn-page' },
      h('header', { className: 'kbn-head' },
        h(DshUI.Button, {
          className: 'kbn-head-back', variant: 'ghost', size: 'sm', 'aria-label': t('home.back'),
          onClick: () => store.openHome(), icon: h(DshUI.IconChevronLeftOutlineRegular, { size: 16 }),
        }, t('home.back')),
        h('div', { className: 'kbn-head-main' },
          h('h1', { className: 'kbn-board-heading', 'aria-label': activeBoard?.title || t('board.selectBoard') },
            h(BoardSwitcher, {
              boards, board: activeBoard,
              onChange: (next) => {
                kbnRememberBoard(next)
                clearSelection()
                store.openBoard(next)
                setWorkspaceId(next)
              },
            })),
          h('p', { className: 'kbn-subtitle' },
            activeBoard !== null
              ? t('board.subtitle', { todo: tasksByStatus.todo.length, doing: tasksByStatus.doing.length, done: tasksByStatus.done.length })
              : t('board.subtitleEmpty')),
          activeBoard && h(DshUI.Button, {
            variant: 'ghost', size: 'sm', className: 'kbn-board-binding', disabled: state.status !== 'ready',
            title: activeBoard.path || t('binding.bind'), 'aria-label': t('binding.open'), 'aria-haspopup': 'dialog',
            onClick: () => setBindingOpen(true), icon: h(Icon, { name: 'workspace', size: 14 }),
          }, h('span', { className: 'kbn-board-binding-label' }, activeBoard.bound ? t('binding.current', { title: workspaceOf(state, activeBoard.id)?.title || activeBoard.title }) : t('binding.bind')))),
        h('div', { className: 'kbn-head-actions' },
          h(DshUI.Button, {
            variant: 'ghost', className: 'kbn-head-settings',
            title: t('settings.open'), 'aria-label': t('settings.open'), 'aria-haspopup': 'dialog',
            onClick: () => openWorkboardSettings(store.ctx),
          }, h(DshUI.IconSettingsOutlineMedium, { size: 16 })),
          activeBoard ? h(Button, {
            variant: 'primary', icon: h(Icon, { name: 'plus', size: 14 }),
            disabled: state.status !== 'ready', onClick: () => openCreate('todo'),
          }, t('board.newTask')) : newBoardAction)),

      h('div', {
        className: 'kbn-workbench',
        ref: workbenchRef,
        'data-resizing': resizing ? 'true' : undefined,
        'data-layout': limits.stacked ? 'stacked' : 'split',
        style: { '--kbn-detail-width': shownDetailWidth + 'px' },
      },
        region,
        h('div', {
          className: 'kbn-detail-resizer',
          role: 'separator',
          'aria-orientation': 'vertical',
          'aria-label': t('board.resizeDetail'),
          'aria-valuemin': limits.min,
          'aria-valuemax': limits.max,
          'aria-valuenow': shownDetailWidth,
          'data-resizing': resizing ? 'true' : undefined,
          tabIndex: 0,
          title: t('board.resizeDetail'),
          onPointerDown: startResize,
          onPointerMove: moveResize,
          onPointerUp: endResize,
          onPointerCancel: endResize,
          onKeyDown: keyResize,
          onDoubleClick: () => applyDetailWidth(null),
        }, h('span', { className: 'kbn-detail-resizer-grip', 'aria-hidden': 'true' })),
        h(TaskDetailPanel, {
          task: selectedTask,
          workspace: activeBoard,
          busy: selectedTask !== null && busyTaskId === selectedTask.id,
          onClose: clearSelection,
          onEdit: openEdit,
          onRun: setSendTask,
          onOpenSession: openTaskSession,
          onArchive: handleArchiveTask,
          onDelete: handleDeleteTask,
          onPreview: (attachment) => setPreview({ task: selectedTask, attachment }),
          onStatusChange: changeDetailStatus,
        }))),
      h(AttachmentPreviewRail, { preview, onClose: () => setPreview(null) }),

    sendTask && h(TaskSendDialog, { key: sendTask.id, task: sendTask, onClose: () => setSendTask(null) }),
    bindingOpen && activeBoard && h(BoardBindingDialog, { board: activeBoard, workspaces: state.workspaces, onClose: () => setBindingOpen(false) }),
    h(TaskEditorDialog, {
      open: editorOpen,
      mode: editor !== null ? editor.mode : 'create',
      task: editorTask,
      columnStatus: editor?.status,
      workspaceId: editor !== null && typeof editor.workspaceId === 'string' ? editor.workspaceId : activeBoardId,
      onClose: closeEditor,
    }),
    h(NewBoardDialog, {
      open: boardOpen,
      onClose: (board) => {
        setBoardOpen(false)
        if (board !== null && board !== undefined && typeof board.id === 'string') {
          kbnRememberBoard(board.id)
          store.openBoard(board.id)
          setWorkspaceId(board.id)
          clearSelection()
        }
      },
    }),
    h(ToastHost))
}
