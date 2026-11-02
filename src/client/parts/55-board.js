/**
 * The board panel: header + board switcher + three status columns, drag & drop,
 * empty/loading/error states, focus reveal, archive dialog and board creation.
 */
addDict(
  {
    'board.subtitle': '{open} 个未完成 · {done} 个已完成',
    'board.subtitleEmpty': '选择或新建一个项目开始',
    'board.selectBoard': '选择看板',
    'board.newBoard': '新建看板',
    'board.archive': '查看归档任务',
    'board.resizeDetail': '拖动调整任务详情宽度',
    'board.archiveCount': '归档任务数量 {count}',
    'board.newTask': '新建任务',
    'board.addToColumn': '在「{status}」中新建任务',
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
    'detail.aiHint': 'AI 任务可以开会话执行，执行后会话会关联回这张卡片。',
    'detail.edit': '编辑',
    'detail.run': '开会话执行',
    'detail.archive': '归档',
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
  },
  {
    'board.subtitle': '{open} open · {done} done',
    'board.subtitleEmpty': 'Choose or create a project to begin',
    'board.selectBoard': 'Select board',
    'board.newBoard': 'New board',
    'board.archive': 'View archived tasks',
    'board.resizeDetail': 'Drag to resize the task details',
    'board.archiveCount': '{count} archived tasks',
    'board.newTask': 'New task',
    'board.addToColumn': 'Add task to {status}',
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
    'detail.run': 'Run in session',
    'detail.archive': 'Archive',
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
/** Board pane floor: three 190px columns plus two 14px gaps. */
const KBN_BOARD_MIN = 600
/** Resizer width plus the two flex gaps it replaces. */
const KBN_RESIZER_SPACE = 34

/**
 * Width limits for the detail pane at the current workbench size. The upper
 * bound adapts to the window so the three columns never collapse.
 * @param {number} workbenchWidth
 * @returns {{ min: number, max: number, fallback: number }}
 */
function kbnDetailLimits(workbenchWidth) {
  const width = Number.isFinite(workbenchWidth) && workbenchWidth > 0 ? workbenchWidth : 1200
  const max = Math.max(KBN_DETAIL_MIN, Math.min(KBN_DETAIL_MAX, Math.round(width - KBN_RESIZER_SPACE - KBN_BOARD_MIN)))
  const fallback = Math.min(max, Math.max(KBN_DETAIL_MIN, Math.round(width * 0.26)))
  return { min: KBN_DETAIL_MIN, max, fallback }
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

/** Last workspace shown in this page's lifetime; panel switches return to it. */
let kbnLastWorkspaceId = null

/**
 * Create a standalone board. A board does not need a working directory; the
 * directory is requested the first time one of its AI tasks is sent to a
 * session (handled by `runTaskInNewSession`).
 * @param {{ open: boolean, onClose: (board?: object) => void }} props
 * @returns {object} React element
 */
function NewBoardDialog({ open, onClose }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setBusy(false)
    setError(null)
  }, [open])

  async function save() {
    const name = title.trim()
    if (name === '') {
      setError(t('board.nameRequired'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const board = await kanbanStore.createBoard(name)
      kanbanStore.toast(t('board.created', { title: board.title }), 'info')
      onClose(board)
    } catch (failure) {
      setError(messageOf(failure))
      setBusy(false)
    }
  }

  const footer = [
    h(Button, { key: 'cancel', variant: 'ghost', size: 'sm', disabled: busy, onClick: () => onClose() }, t('common.cancel')),
    h(Button, { key: 'create', variant: 'primary', size: 'sm', disabled: busy, onClick: save }, t('board.createAction')),
  ]

  return h(Modal, {
    open,
    onClose: () => onClose(),
    title: t('board.dialogTitle'),
    icon: h(Icon, { name: 'projectAdd', size: 16 }),
    width: 440,
    busy,
    footer,
  }, h('div', { className: 'kbn-project-dialog' },
    error !== null ? h('p', { className: 'kbn-editor-error', role: 'alert' }, error) : null,
    h(Field, { label: t('board.nameLabel') },
      h(Input, {
        value: title,
        onChange: (value) => setTitle(kbnFieldValue(value)),
        placeholder: t('board.namePlaceholder'),
        maxLength: 80,
        ariaLabel: t('board.nameLabel'),
        onKeyDown: (event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            save()
          }
        },
      })),
    h('p', { className: 'kbn-detail-note' }, t('board.dirLaterHint'))))
}

/**
 * Right-hand task detail sheet. A single neutral surface with divided sections,
 * deliberately a different UI form from the three status columns: no status
 * colour bar, vertical field list, attachments and session in one place.
 * @param {{ task: object | null, workspace: object | null, busy: boolean,
 *   onClose: Function, onEdit: Function, onRun: Function,
 *   onOpenSession: Function, onArchive: Function, onDelete: Function }} props
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
  if (status === 'done') {
    actions.push(h(Button, {
      key: 'archive',
      size: 'sm',
      variant: 'ghost',
      icon: h(Icon, { name: 'archive', size: 12 }),
      disabled: busy,
      onClick: () => onArchive(task),
    }, t('detail.archive')))
  }
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
      h('div', { className: 'kbn-detail-title-row' },
        h('h2', { className: 'kbn-detail-title' }, title),
        h(PriorityBadge, { priority: task.priority })),
      workspace !== null && workspace !== undefined
        ? h('p', { className: 'kbn-detail-workspace', title: workspace.path || workspace.title },
          h(Icon, { name: workspace.path !== '' ? 'folderOpen' : 'board', size: 12 }),
          h('span', null, workspace.title))
        : null,
      h('div', { className: 'kbn-detail-chips' },
        h('span', { className: 'kbn-detail-status', 'data-status': status },
          h(StatusDot, { status }),
          t('status.' + status)),
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
      h('section', { className: 'kbn-detail-section' },
        h('h3', { className: 'kbn-detail-section-title' }, t('detail.description')),
        h('p', { className: 'kbn-detail-desc' }, description !== '' ? description : t('detail.noDescription'))),
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

/**
 * The central board panel. Standard slot props are accepted; copy, data and
 * actions come from the prelude and the module-level store.
 * @param {object} [props]
 * @returns {object} React element
 */
function BoardPage(props) {
  const store = kanbanStore
  const state = store.use((snapshot) => snapshot)
  const [workspaceId, setWorkspaceId] = useState(kbnLastWorkspaceId)
  const [editor, setEditor] = useState(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [busyTaskId, setBusyTaskId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dataMenuOpen, setDataMenuOpen] = useState(false)
  const [importState, setImportState] = useState(null)
  const [detailWidth, setDetailWidth] = useState(kbnDetailWidth)
  const [resizing, setResizing] = useState(false)
  const workbenchRef = useRef(null)
  const resizeStartRef = useRef(null)
  const importFileRef = useRef(null)

  const boards = boardsOf(state)
  const selectedBoard = boardOf(state, workspaceId)
  const activeBoard = selectedBoard !== null
    ? selectedBoard
    : (boards.length > 0 ? boards[0] : null)
  const activeBoardId = activeBoard !== null ? activeBoard.id : null
  const boardTasks = activeBoardId !== null ? tasksOf(state, activeBoardId) : []
  const archivedCount = archivedTasks(state).length
  const tasksByStatus = { todo: [], doing: [], done: [] }
  boardTasks.forEach((task) => {
    if (tasksByStatus[task.status] !== undefined) tasksByStatus[task.status].push(task)
  })
  const selectedTask = selectedTaskId === null ? null : taskById(state, selectedTaskId)

  /** Measured width of the workbench row (fallback for the first render). */
  function workbenchWidth() {
    const element = workbenchRef.current
    if (element !== null && element !== undefined && Number.isFinite(element.clientWidth) && element.clientWidth > 0) {
      return element.clientWidth
    }
    if (typeof window !== 'undefined' && Number.isFinite(window.innerWidth) && window.innerWidth > 0) return window.innerWidth
    return 1200
  }

  /** Current limits for the resize handle. */
  function detailLimits() {
    return kbnDetailLimits(workbenchWidth())
  }

  /** Store one width (clamped) and remember it across panel switches. */
  function applyDetailWidth(next) {
    const limits = detailLimits()
    const width = next === null ? null : kbnClampDetailWidth(next, limits)
    kbnDetailWidth = width
    kbnStoreDetailWidth(width)
    setDetailWidth(width)
  }

  function startResize(event) {
    if (event.button !== undefined && event.button !== 0) return
    const element = event.currentTarget
    const limits = detailLimits()
    const detail = workbenchRef.current === null || workbenchRef.current === undefined
      ? null
      : workbenchRef.current.querySelector('.kbn-detail')
    const measured = detail === null ? limits.fallback : Math.round(detail.getBoundingClientRect().width)
    resizeStartRef.current = { x: event.clientX, width: kbnClampDetailWidth(measured, limits) }
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
    const limits = detailLimits()
    const step = event.shiftKey ? 48 : 16
    if (event.key === 'ArrowLeft') applyDetailWidth((detailWidth === null ? limits.fallback : detailWidth) + step)
    else if (event.key === 'ArrowRight') applyDetailWidth((detailWidth === null ? limits.fallback : detailWidth) - step)
    else if (event.key === 'Home') applyDetailWidth(limits.min)
    else if (event.key === 'End') applyDetailWidth(limits.max)
    else return
    event.preventDefault()
  }

  // A remembered width may come from a wider window; clamp it on mount.
  useEffect(() => {
    if (kbnDetailWidth === null) return
    const limits = kbnDetailLimits(workbenchWidth())
    const clamped = kbnClampDetailWidth(kbnDetailWidth, limits)
    if (clamped !== kbnDetailWidth) {
      kbnDetailWidth = clamped
      kbnStoreDetailWidth(clamped)
      setDetailWidth(clamped)
    }
  }, [])

  // Keep a dragged width inside the adaptive range when the window changes.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined
    const onResize = () => {
      if (kbnDetailWidth === null) return
      const limits = kbnDetailLimits(workbenchWidth())
      const clamped = kbnClampDetailWidth(kbnDetailWidth, limits)
      if (clamped !== kbnDetailWidth) {
        kbnDetailWidth = clamped
        setDetailWidth(clamped)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // First mount: load the board unless something already did.
  useEffect(() => {
    if (store.getSnapshot().status === 'idle') store.refresh()
  }, [])

  // Keep a valid board selected and remember the last one.
  useEffect(() => {
    if (boards.length === 0) {
      if (workspaceId !== null) setWorkspaceId(null)
      return
    }
    if (workspaceId !== null && boardOf(state, workspaceId) !== null) {
      kbnLastWorkspaceId = workspaceId
      return
    }
    const fallback = kbnLastWorkspaceId !== null && boardOf(state, kbnLastWorkspaceId) !== null
      ? kbnLastWorkspaceId
      : boards[0].id
    kbnLastWorkspaceId = fallback
    setWorkspaceId(fallback)
  }, [state.workspaces, state.boards, workspaceId])

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
    kbnLastWorkspaceId = task.workspaceId
    setWorkspaceId(task.workspaceId)
    setSelectedTaskId(id)
  }, [state.revision])

  const editorTask = editor !== null && editor.mode === 'edit' ? taskById(state, editor.taskId) : null
  const editorOpen = editor !== null && (editor.mode === 'create' || editorTask !== null)

  function openCreate(status) {
    if (activeBoardId === null) {
      setBoardOpen(true)
      return
    }
    setSelectedTaskId(null)
    setEditor({ mode: 'create', workspaceId: activeBoardId, status })
  }

  function openEdit(task) {
    setSelectedTaskId(task.id)
    setEditor({ mode: 'edit', taskId: task.id })
  }

  function closeEditor() {
    setEditor(null)
  }

  function handleSaved(saved) {
    // A column's ＋ button creates in that column even though the create API
    // always starts in To do; the status field itself still wins when edited.
    if (editor === null || editor.mode !== 'create') return
    if (saved === null || saved === undefined) return
    if (typeof editor.status !== 'string' || editor.status === 'todo') return
    if (saved.status !== 'todo') return
    kanbanStore.moveTask(saved.id, editor.status).catch((error) => {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    })
  }

  async function handleArchiveTask(task) {
    setBusyTaskId(task.id)
    try {
      await setTaskArchivedWithSession(task, true)
      if (selectedTaskId === task.id) setSelectedTaskId(null)
      kanbanStore.toast(t('board.archived'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyTaskId(null)
    }
  }

  async function handleRunTask(task) {
    if (typeof runTaskInNewSession !== 'function') return
    setBusyTaskId(task.id)
    try {
      await runTaskInNewSession(task)
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyTaskId(null)
    }
  }

  function handleOpenSession(task) {
    if (typeof openTaskSession !== 'function') return
    try {
      const result = openTaskSession(task.id)
      if (result !== null && result !== undefined && typeof result.catch === 'function') {
        result.catch((error) => {
          kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
        })
      }
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
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

  function handleExport() {
    setDataMenuOpen(false)
    try {
      const payload = kbnExportPayload(store.getSnapshot())
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = kbnExportFileName()
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      store.toast(t('data.exported', { count: payload.tasks.length }), 'info')
    } catch (error) {
      store.toast(t('data.exportFailed', { message: messageOf(error) }), 'error')
    }
  }

  function handleImportPick() {
    setDataMenuOpen(false)
    const input = importFileRef.current
    if (input !== null && input !== undefined) input.click()
  }

  async function handleImportFile(event) {
    const input = event !== null && event !== undefined ? event.target : null
    const file = input !== null && input !== undefined
      && input.files !== null && input.files !== undefined && input.files.length > 0
      ? input.files[0]
      : null
    if (input !== null && input !== undefined) input.value = ''
    if (file === null || file === undefined) return
    if (activeBoard === null) {
      store.toast(t('data.importNoWorkspace'), 'error')
      return
    }
    let text
    try {
      text = await file.text()
    } catch {
      store.toast(t('data.readFailed'), 'error')
      return
    }
    const parsed = kbnParseImport(text)
    if (!parsed.ok) {
      store.toast(t('data.parseFailed'), 'error')
      return
    }
    if (parsed.tasks.length === 0) {
      store.toast(t('data.importEmpty'), 'error')
      return
    }
    setImportState({
      fileName: file.name,
      tasks: parsed.tasks,
      invalid: parsed.invalid,
      workspaceId: activeBoard.id,
      workspaceTitle: activeBoard.title,
      busy: false,
      progress: null,
      error: null,
    })
  }

  async function confirmImport() {
    if (importState === null || importState.busy === true) return
    const target = importState
    setImportState(Object.assign({}, target, { busy: true, error: null, progress: { done: 0, total: target.tasks.length } }))
    try {
      const result = await kbnImportTasks(store, target.workspaceId, target.tasks, (done, total) => {
        setImportState((previous) => (previous === null
          ? null
          : Object.assign({}, previous, { progress: { done, total } })))
      })
      await store.refresh()
      setImportState(null)
      store.toast(result.failed > 0
        ? t('data.importPartial', { created: result.created, failed: result.failed })
        : t('data.importDone', { created: result.created }), result.failed > 0 ? 'error' : 'info')
    } catch (error) {
      setImportState((previous) => (previous === null
        ? null
        : Object.assign({}, previous, { busy: false, error: messageOf(error) })))
    }
  }

  function handleCardDragStart(task) {
    setDrag({ taskId: task.id })
    setDropTarget(null)
  }

  function handleCardDragEnd() {
    setDrag(null)
    setDropTarget(null)
  }

  function handleColumnDragOver(event, status) {
    if (drag === null) return
    event.preventDefault()
    if (event.dataTransfer !== null && event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
    if (dropTarget === null || dropTarget.status !== status || dropTarget.beforeId !== null) {
      setDropTarget({ status, beforeId: null })
    }
  }

  function handleCardDragOver(event, task) {
    if (drag === null || drag.taskId === task.id) return
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer !== null && event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
    const cards = (tasksByStatus[task.status] || []).filter((item) => item.id !== drag.taskId)
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
    const taskId = drag.taskId
    setDrag(null)
    setDropTarget(null)
    if (typeof target.beforeId === 'string' && target.beforeId === taskId) return
    kanbanStore.moveTask(taskId, status, target.beforeId === null ? undefined : target.beforeId).catch((error) => {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    })
  }

  function renderColumn(status) {
    const tasks = tasksByStatus[status] || []
    const isDropColumn = drag !== null && dropTarget !== null && dropTarget.status === status
    const statusLabel = t('status.' + status)
    const items = []

    tasks.forEach((task) => {
      const showLine = drag !== null && dropTarget !== null && dropTarget.status === status
        && dropTarget.beforeId === task.id && drag.taskId !== task.id
      items.push(h('div', {
        className: 'kbn-card-slot',
        key: task.id,
        'data-task-id': task.id,
        onDragOver: (event) => handleCardDragOver(event, task),
        onDrop: (event) => {
          event.preventDefault()
          event.stopPropagation()
          handleDrop(status)
        },
      },
        showLine ? h('div', { className: 'kbn-drop-line', 'aria-hidden': 'true' }) : null,
        h(TaskCard, {
          task,
          workspace: activeBoard,
          selected: selectedTaskId === task.id,
          busy: busyTaskId === task.id,
          onEdit: openEdit,
          onRun: handleRunTask,
          onOpenSession: handleOpenSession,
          onArchive: handleArchiveTask,
          onDelete: handleDeleteTask,
          onDragStart: () => handleCardDragStart(task),
          onDragEnd: handleCardDragEnd,
          onSelect: (selected) => setSelectedTaskId(selected.id),
        })))
    })

    if (tasks.length === 0) {
      items.push(h('div', { className: 'kbn-col-empty', key: 'empty' }, t('board.emptyColumn')))
    }
    if (drag !== null && dropTarget !== null && dropTarget.status === status && dropTarget.beforeId === null) {
      items.push(h('div', { className: 'kbn-drop-line', key: 'drop-end', 'aria-hidden': 'true' }))
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
        h('span', { className: 'kbn-col-count' }, String(tasks.length)),
        h('button', {
          type: 'button',
          className: 'kbn-col-add',
          'aria-label': t('board.addToColumn', { status: statusLabel }),
          title: t('board.addToColumn', { status: statusLabel }),
          onClick: () => openCreate(status),
        }, h(Icon, { name: 'plus', size: 14 }))),
      h('div', {
        className: cx('kbn-col-body', isDropColumn ? 'kbn-col-drop kbn-drop-target' : null),
        onDragOver: (event) => handleColumnDragOver(event, status),
        onDrop: (event) => {
          event.preventDefault()
          handleDrop(status)
        },
      }, items))
  }

  const openCount = boardTasks.filter((task) => task.status !== 'done').length
  const doneCount = boardTasks.filter((task) => task.status === 'done').length
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
      h('div', { className: 'kbn-board' }, STATUSES.map(renderColumn)))
  }

  return h('div', { className: 'kbn-root' },
    h('div', { className: 'kbn-page' },
      h('header', { className: 'kbn-head' },
        h('div', { className: 'kbn-head-main' },
          h('h1', { className: 'kbn-title' }, t('panel.title')),
          h('p', { className: 'kbn-subtitle' },
            activeBoard !== null
              ? t('board.subtitle', { open: openCount, done: doneCount })
              : t('board.subtitleEmpty'))),
        h('div', { className: 'kbn-head-actions' },
          h('span', { className: 'kbn-badge-wrap' },
            h(IconButton, {
              icon: h(Icon, { name: 'archive' }),
              label: t('board.archive'),
              onClick: () => setArchiveOpen(true),
            }),
            archivedCount > 0
              ? h('span', {
                className: 'kbn-chip-count',
                'aria-label': t('board.archiveCount', { count: archivedCount }),
                title: t('board.archiveCount', { count: archivedCount }),
              }, archivedCount > 99 ? '99+' : String(archivedCount))
              : null),
          h('span', { className: 'kbn-data-anchor' },
            h(IconButton, {
              icon: h(Icon, { name: 'data' }),
              label: t('data.trigger'),
              onClick: () => setDataMenuOpen((open) => !open),
              ariaExpanded: dataMenuOpen,
              ariaHasPopup: 'menu',
            }),
            h(KbnDataMenu, {
              open: dataMenuOpen,
              onClose: () => setDataMenuOpen(false),
              onExport: handleExport,
              onImport: handleImportPick,
            })),
          newBoardAction)),

      h('div', { className: 'kbn-ws-bar' },
        h('div', { className: 'kbn-ws-select' },
          h(Select, {
            value: activeBoardId === null ? '' : activeBoardId,
            onChange: (value) => {
              const next = kbnFieldValue(value)
              kbnLastWorkspaceId = next
              setDataMenuOpen(false)
              setSelectedTaskId(null)
              setWorkspaceId(next)
            },
            options: boards.map((board) => ({ value: board.id, label: board.title })),
            placeholder: t('board.selectBoard'),
            ariaLabel: t('board.selectBoard'),
          }))),

      h('div', {
        className: 'kbn-workbench',
        ref: workbenchRef,
        'data-resizing': resizing ? 'true' : undefined,
        style: detailWidth === null ? undefined : { '--kbn-detail-width': detailWidth + 'px' },
      },
        region,
        h('div', {
          className: 'kbn-detail-resizer',
          role: 'separator',
          'aria-orientation': 'vertical',
          'aria-label': t('board.resizeDetail'),
          'aria-valuemin': detailLimits().min,
          'aria-valuemax': detailLimits().max,
          'aria-valuenow': detailWidth === null ? detailLimits().fallback : detailWidth,
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
          onClose: () => setSelectedTaskId(null),
          onEdit: openEdit,
          onRun: handleRunTask,
          onOpenSession: handleOpenSession,
          onArchive: handleArchiveTask,
          onDelete: handleDeleteTask,
          onPreview: (attachment) => setPreview({ task: selectedTask, attachment }),
        }))),
      h(AttachmentPreviewRail, { preview, onClose: () => setPreview(null) }),

    h(ArchiveDialog, { open: archiveOpen, onClose: () => setArchiveOpen(false) }),
    h(TaskEditorDialog, {
      open: editorOpen,
      mode: editor !== null ? editor.mode : 'create',
      task: editorTask,
      workspaceId: editor !== null && typeof editor.workspaceId === 'string' ? editor.workspaceId : activeBoardId,
      onClose: closeEditor,
      onSaved: handleSaved,
    }),
    h('input', {
      ref: importFileRef,
      type: 'file',
      accept: 'application/json,.json',
      className: 'kbn-visually-hidden',
      tabIndex: -1,
      'aria-hidden': 'true',
      onChange: handleImportFile,
    }),
    h(KbnImportDialog, {
      state: importState,
      onCancel: () => setImportState(null),
      onConfirm: confirmImport,
    }),
    h(NewBoardDialog, {
      open: boardOpen,
      onClose: (board) => {
        setBoardOpen(false)
        if (board !== null && board !== undefined && typeof board.id === 'string') {
          kbnLastWorkspaceId = board.id
          setWorkspaceId(board.id)
          setSelectedTaskId(null)
        }
      },
    }),
    h(ToastHost))
}
