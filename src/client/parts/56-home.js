/** Workboard overview. Interactive controls and glyphs come from DSH itself. */
addDict({
  'home.subtitle': '所有看板与灵感，都在这里。',
  'home.back': '返回',
  'home.boards': '任务看板',
  'home.boardCount': '{count} 个看板',
  'home.unbound': '未绑定工作目录',
  'home.empty': '创建你的第一块看板',
  'home.emptyHint': '先记录任务，首次发送 AI 任务时再选择工作目录。',
  'home.searchBoards': '搜索看板',
  'home.noResults': '没有匹配的看板',
  'home.retry': '重新加载',
  'home.reorderHint': '拖动卡片排序，也可使用卡片上的前移 / 后移按钮。',
  'home.moveEarlier': '前移',
  'home.moveLater': '后移',
  'home.orderSaving': '正在保存看板顺序…',
  'home.orderSaved': '看板顺序已保存',
  'heat.title': '完成记录',
  'heat.subtitle': '最近一年 · 每日完成任务数',
  'heat.total': '共完成 {count} 项',
  'heat.day': '{date}：完成 {count} 项任务',
  'heat.note': '从启用此功能起记录；同一任务每天计一次。',
  'heat.less': '少',
  'heat.more': '多',
  'heat.empty': '完成一项任务，点亮今天。',
  'notes.title': '灵感便签',
  'notes.subtitle': '随手记下想法，便签修改自动保存。',
  'notes.count': '{count} 张便签',
  'notes.search': '搜索便签',
  'notes.placeholder': '写下你的下一个灵感…',
  'notes.add': '添加便签',
  'notes.edit': '编辑便签',
  'notes.done': '完成编辑',
  'notes.delete': '删除便签',
  'notes.deleteHint': '这张便签将被永久删除。',
  'notes.empty': '给下一个好点子，留点空间。',
  'notes.noResults': '没有匹配的便签',
  'notes.saving': '正在保存…',
  'notes.pending': '等待保存…',
  'notes.saved': '已保存',
  'notes.failed': '保存失败，内容已保留',
  'notes.required': '便签内容不能为空',
  'notes.retry': '重试保存',
  'notes.limit': '最多 4000 字',
  'notes.yellow': '浅黄', 'notes.pink': '浅粉', 'notes.blue': '浅蓝',
  'notes.mint': '薄荷绿', 'notes.purple': '淡紫', 'notes.neutral': '中性',
}, {
  'home.subtitle': 'Your boards and ideas, together.',
  'home.back': 'Back',
  'home.boards': 'Boards',
  'home.boardCount': '{count} boards',
  'home.unbound': 'No working directory yet',
  'home.empty': 'Create your first board',
  'home.emptyHint': 'Capture tasks now. Choose a directory when sending your first AI task.',
  'home.searchBoards': 'Search boards',
  'home.noResults': 'No matching boards',
  'home.retry': 'Reload',
  'home.reorderHint': 'Drag cards to reorder, or use each card’s move earlier / later buttons.',
  'home.moveEarlier': 'Move earlier',
  'home.moveLater': 'Move later',
  'home.orderSaving': 'Saving board order…',
  'home.orderSaved': 'Board order saved',
  'heat.title': 'Completions',
  'heat.subtitle': 'Past year · tasks completed each day',
  'heat.total': '{count} completions',
  'heat.day': '{date}: {count} tasks completed',
  'heat.note': 'Recorded since this feature was enabled; each task counts once per day.',
  'heat.less': 'Less',
  'heat.more': 'More',
  'heat.empty': 'Complete a task to light up today.',
  'notes.title': 'Ideas',
  'notes.subtitle': 'Capture a thought. Changes to notes save automatically.',
  'notes.count': '{count} notes',
  'notes.search': 'Search notes',
  'notes.placeholder': 'Write down your next idea…',
  'notes.add': 'Add note',
  'notes.edit': 'Edit note',
  'notes.done': 'Finish editing',
  'notes.delete': 'Delete note',
  'notes.deleteHint': 'This note will be permanently deleted.',
  'notes.empty': 'Leave some room for your next good idea.',
  'notes.noResults': 'No matching notes',
  'notes.saving': 'Saving…',
  'notes.pending': 'Waiting to save…',
  'notes.saved': 'Saved',
  'notes.failed': 'Could not save. Your changes are kept.',
  'notes.required': 'A note cannot be empty',
  'notes.retry': 'Retry save',
  'notes.limit': 'Up to 4000 characters',
  'notes.yellow': 'Yellow', 'notes.pink': 'Pink', 'notes.blue': 'Blue',
  'notes.mint': 'Mint', 'notes.purple': 'Purple', 'notes.neutral': 'Neutral',
})

const KBN_NOTE_COLORS = ['yellow', 'pink', 'blue', 'mint', 'purple', 'neutral']
const KBN_HEAT_CELL_SIZE = 24
const KBN_HEAT_GAP = 4
const KBN_HEAT_WEEKS = 52

function kbnLocalDay(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
}

/** Calendar arithmetic stays local across DST; duplicate completions count once per task/day. */
function kbnHeatmap(completions, today) {
  const end = parseDay(today)
  const start = new Date(end)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (KBN_HEAT_WEEKS - 1) * 7)
  const byDay = new Map()
  for (const event of completions) {
    const at = new Date(event.at)
    if (!Number.isFinite(at.getTime())) continue
    const day = kbnLocalDay(at)
    if (!byDay.has(day)) byDay.set(day, new Set())
    byDay.get(day).add(event.taskId)
  }
  return Array.from({ length: KBN_HEAT_WEEKS * 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const day = kbnLocalDay(date)
    return { day, date, future: day > today, count: byDay.get(day)?.size || 0 }
  })
}

function CompletionHeatmap({ completions }) {
  const [today, setToday] = useState(todayISO)
  const weeks = KBN_HEAT_WEEKS
  const [cursor, setCursor] = useState(null)
  const root = useRef(null)
  useEffect(() => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = setTimeout(() => setToday(todayISO()), next - now + 100)
    return () => clearTimeout(timer)
  }, [today])
  const days = useMemo(() => kbnHeatmap(completions, today), [completions, today])
  const total = days.reduce((sum, day) => sum + (day.future ? 0 : day.count), 0)
  const active = cursor && days.some((day) => day.day === cursor) ? cursor : today
  const formatter = new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  const months = []
  for (let week = 0; week < weeks; week++) {
    const date = days[week * 7].date
    const previous = days[(week - 1) * 7]?.date
    if (!previous || date.getMonth() !== previous.getMonth()) {
      if (months.length) months[months.length - 1].end = week
      months.push({ week, end: weeks, date })
    }
  }
  // Leave a partial opening month unlabeled when its year would be clipped.
  if (months.length > 1 && months[0].end < 4) months.shift()
  function move(event, index) {
    const delta = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key]
    let next = delta === undefined ? null : index + delta
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = days.findIndex((day) => day.day === today)
    if (next === null) return
    event.preventDefault()
    next = Math.max(0, Math.min(days.findIndex((day) => day.day === today), next))
    setCursor(days[next].day)
    root.current?.querySelectorAll('[data-heat-day]')[next]?.focus()
  }
  return h('section', {
    className: 'kbn-home-section kbn-heat', 'aria-labelledby': 'kbn-heat-title',
    style: { '--kbn-heat-max-width': (weeks * (KBN_HEAT_CELL_SIZE + KBN_HEAT_GAP) - KBN_HEAT_GAP + 6) + 'px' },
  },
    h('div', { className: 'kbn-home-section-head' },
      h('div', null, h('h2', { id: 'kbn-heat-title' }, t('heat.title')), h('p', null, t('heat.subtitle'))),
      h('span', { className: 'kbn-home-count' }, t('heat.total', { count: total }))),
    h('div', { className: 'kbn-heat-chart', style: { '--kbn-heat-weeks': weeks } },
      h('div', { className: 'kbn-heat-months', 'aria-hidden': true }, months.map(({ week, end, date }, index) => {
        const label = index === 0 || date.getFullYear() !== months[index - 1].date.getFullYear()
          ? date.getFullYear() + '/' + (date.getMonth() + 1)
          : new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', { month: 'short' }).format(date)
        const column = Math.max(0, Math.min(week, weeks - 2))
        return h('span', { key: week, style: { gridColumn: (column + 1) + ' / ' + (end + 1) } },
          h('span', { className: 'kbn-heat-month-full' }, label),
          h('span', { className: 'kbn-heat-month-compact' }, date.getMonth() + 1))
      })),
      h('div', { ref: root, className: 'kbn-heat-grid', role: 'group', 'aria-label': t('heat.title') }, days.map((day, index) => {
        const label = t('heat.day', { date: formatter.format(day.date), count: day.count })
        return h(DshUI.Tooltip, { key: day.day, label, side: 'top', portal: true, disabled: day.future },
          h(DshUI.Button, {
            className: 'kbn-heat-cell', variant: 'ghost', size: 'sm',
            'data-heat-day': day.day, 'data-level': Math.min(4, day.count),
            'data-today': day.day === today, 'data-future': day.future,
            disabled: day.future, tabIndex: day.day === active ? 0 : -1,
            'aria-label': label, onFocus: () => setCursor(day.day), onKeyDown: (event) => move(event, index),
          }))
      }))),
    h('div', { className: 'kbn-heat-foot' },
      h('p', null, total === 0 ? t('heat.empty') : t('heat.note')),
      h('div', { className: 'kbn-heat-legend', 'aria-hidden': true },
        t('heat.less'), [0, 1, 2, 3, 4].map((level) => h('span', { key: level, className: 'kbn-heat-sample', 'data-level': level })), t('heat.more'))),
    total === 0 ? h('p', { className: 'kbn-heat-explanation' }, t('heat.note')) : null)
}

function NoteColors({ value, onChange, disabled = false }) {
  return h('div', { className: 'kbn-note-colors', role: 'group', 'aria-label': localeId === 'zh' ? '便签颜色' : 'Note color' },
    KBN_NOTE_COLORS.map((color) => h(DshUI.Tooltip, { key: color, label: t('notes.' + color), side: 'top', portal: true },
      h(DshUI.Button, {
        variant: 'ghost', size: 'sm', className: 'kbn-note-swatch', 'data-note-color': color,
        'aria-label': t('notes.' + color), 'aria-pressed': color === value, disabled,
        onClick: () => onChange(color),
      }, color === value ? h(DshUI.IconCheckOutlineRegular, { size: 14 }) : null))))
}

/** The host InlineEditor supplies sizing, composition handling and focus.
 * Plain Enter remains a newline; Cmd/Ctrl+Enter uses its native save handler. */
function NoteEditor({ value, onChange, onSave, onClose, label }) {
  return h('div', {
    className: 'kbn-note-editor',
    onKeyDownCapture: (event) => {
      if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) event.stopPropagation()
    },
  }, h(DshUI.InlineEditor, { value, label, onChange: (value) => onChange(value.slice(0, 4000)), onSave, onCancel: onClose }))
}

function IdeaCard({ note, draft, status }) {
  const store = kanbanStore
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const current = draft ? { ...note, ...draft } : note
  const editButton = useRef(null)
  const save = () => store.flushNote(note.id).then(() => {
    if ((store.getSnapshot().noteEdits[note.id]?.content ?? note.content).trim()) {
      setEditing(false)
      editButton.current?.focus()
    }
  }).catch(() => undefined)
  const statusKey = { pending: 'pending', saving: 'saving', saved: 'saved', error: 'failed', empty: 'required' }[status]
  async function remove() {
    setDeleting(true)
    setError('')
    try { await store.deleteNote(note.id); setConfirm(false) }
    catch (failure) { setError(messageOf(failure)); setDeleting(false) }
  }
  return h('article', { className: 'kbn-note-card', 'data-note-color': current.color, 'data-note-id': note.id, 'data-editing': editing },
    h('div', { className: 'kbn-note-body' }, editing
      ? h(NoteEditor, { value: current.content, label: t('notes.edit'), onChange: (content) => store.editNote(note.id, { content }), onSave: save, onClose: save })
      : h('p', { className: 'kbn-note-content' }, current.content)),
    editing ? h(NoteColors, { value: current.color, onChange: (color) => store.editNote(note.id, { color }) }) : null,
    h('div', { className: 'kbn-note-foot' },
      h('time', { className: 'kbn-note-save', dateTime: note.updatedAt }, new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(note.updatedAt))),
      statusKey ? h('span', { className: 'kbn-note-save', role: 'status' }, t('notes.' + statusKey)) : null,
      status === 'error' ? h(DshUI.Button, { size: 'sm', variant: 'ghost', onClick: () => store.flushNote(note.id).catch(() => undefined) }, t('notes.retry')) : null,
      h('div', { className: 'kbn-note-actions' },
        editing ? h(DshUI.Button, { size: 'sm', variant: 'ghost', onClick: save }, t('notes.done'))
          : h(DshUI.Tooltip, { label: t('notes.edit'), side: 'top', portal: true },
            h(DshUI.Button, { ref: editButton, size: 'sm', variant: 'ghost', 'aria-label': t('notes.edit'), onClick: () => setEditing(true) }, h(DshUI.IconEditOutlineRegular, { size: 16 }))),
        h(DshUI.Tooltip, { label: t('notes.delete'), side: 'top', portal: true },
          h(DshUI.Button, { size: 'sm', variant: 'ghost', 'aria-label': t('notes.delete'), onClick: () => setConfirm(true) }, h(DshUI.IconTrashOutlineRegular, { size: 16 }))))),
    h(DshUI.Modal, {
      open: confirm, onClose: () => { if (!deleting) setConfirm(false) }, title: t('notes.delete'), closeLabel: t('common.close'),
      footer: h(Fragment, null,
        h(DshUI.Button, { size: 'sm', variant: 'ghost', disabled: deleting, onClick: () => setConfirm(false) }, t('common.cancel')),
        h(DshUI.Button, { size: 'sm', variant: 'primary', disabled: deleting, onClick: remove }, t('notes.delete'))),
    }, h('p', null, t('notes.deleteHint')), error ? h('p', { role: 'alert' }, error) : null))
}

function IdeasSection({ state }) {
  const store = kanbanStore
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(Boolean(state.noteDraft.content))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const draft = state.noteDraft
  const notes = state.notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((note) => (state.noteEdits[note.id]?.content || note.content).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  async function add() {
    if (pending.current || !draft.content.trim()) return
    pending.current = true
    setBusy(true)
    setError('')
    const input = { ...draft }
    try {
      await store.createNote(input)
      if (store.getSnapshot().noteDraft.content === input.content) {
        store.setNoteDraft({ content: '' })
        setExpanded(false)
      }
    } catch (failure) { setError(messageOf(failure)) }
    finally { pending.current = false; setBusy(false) }
  }
  return h('section', { className: 'kbn-home-section kbn-ideas', 'aria-labelledby': 'kbn-ideas-title' },
    h('div', { className: 'kbn-home-section-head' },
      h('div', null, h('h2', { id: 'kbn-ideas-title' }, t('notes.title')), h('p', null, t('notes.subtitle'))),
      h('div', { className: 'kbn-home-section-tools' },
        h('span', { className: 'kbn-home-count' }, t('notes.count', { count: state.notes.length })),
        h(DshUI.Input, { className: 'kbn-home-search', value: query, onChange: (event) => setQuery(event.currentTarget.value), placeholder: t('notes.search'), 'aria-label': t('notes.search'), icon: h(DshUI.IconSearchOutlineRegular, { size: 16 }) }))),
    h('div', { className: 'kbn-note-composer', 'data-note-color': draft.color, 'aria-busy': busy },
      expanded ? h(NoteEditor, { value: draft.content, label: t('notes.placeholder'), onChange: (content) => store.setNoteDraft({ content }), onSave: add, onClose: () => setExpanded(false) })
        : h(DshUI.Button, { variant: 'ghost', className: 'kbn-note-prompt', onClick: () => setExpanded(true) }, draft.content || t('notes.placeholder')),
      h('div', { className: 'kbn-note-compose-foot' },
        h(NoteColors, { value: draft.color, onChange: (color) => store.setNoteDraft({ color }), disabled: busy }),
        h('div', { className: 'kbn-note-submit' },
          h('span', { className: 'kbn-note-shortcut' }, '⌘ / Ctrl + Enter'),
          h(DshUI.Button, { variant: 'primary', size: 'sm', disabled: busy || !draft.content.trim(), onClick: add, icon: h(DshUI.IconPlusOutlineRegular, { size: 16 }) }, t('notes.add')))),
      draft.content.length >= 4000 ? h('p', { className: 'kbn-note-save' }, t('notes.limit')) : null,
      error ? h('div', { className: 'kbn-home-error', role: 'alert' }, error) : null),
    notes.length ? h('div', { className: 'kbn-notes-grid' }, notes.map((note) => h(IdeaCard, { key: note.id, note, draft: state.noteEdits[note.id], status: state.noteStatus[note.id] })))
      : h('p', { className: 'kbn-home-empty-note' }, t(query ? 'notes.noResults' : 'notes.empty')))
}

function WorkboardHome({ state }) {
  const store = kanbanStore
  const [query, setQuery] = useState('')
  const [newBoard, setNewBoard] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [previewOrder, setPreviewOrder] = useState(null)
  const previewOrderRef = useRef(null)
  const [orderBusy, setOrderBusy] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')
  const moving = useRef(false)
  const dragRef = useRef(null)
  const ignoreClickUntil = useRef(0)
  const boards = boardsOf(state)
  const visible = boards.filter((board) => (board.title + ' ' + board.path).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const stats = useMemo(() => {
    const result = new Map()
    for (const task of state.tasks) {
      if (task.archived) continue
      if (!result.has(task.workspaceId)) result.set(task.workspaceId, { todo: 0, doing: 0, done: 0 })
      result.get(task.workspaceId)[task.status]++
    }
    return result
  }, [state.tasks])

  async function moveBoard(id, beforeId) {
    if (moving.current || id === beforeId || state.status !== 'ready') return
    moving.current = true
    setOrderBusy(true)
    setOrderMessage(t('home.orderSaving'))
    try {
      await store.moveBoard(id, beforeId)
      setOrderMessage(t('home.orderSaved'))
    } catch (failure) {
      setOrderMessage('')
      store.toast(t('toast.failed', { message: messageOf(failure) }), 'error')
    } finally {
      moving.current = false
      setOrderBusy(false)
      previewOrderRef.current = null
      setPreviewOrder(null)
    }
  }

  function endDrag(clearPreview = true) {
    dragRef.current = null
    setDragId(null)
    if (clearPreview) {
      previewOrderRef.current = null
      setPreviewOrder(null)
    }
    ignoreClickUntil.current = Date.now() + 250
  }

  function previewBoard(targetId) {
    const id = dragRef.current
    if (!id) return
    // Wait for native dragover before hiding the source or moving grid items.
    setDragId(id)
    if (id === targetId) return
    const order = previewOrderRef.current || boards.map((board) => board.id)
    const target = order.indexOf(targetId)
    const next = order.filter((entry) => entry !== id)
    next.splice(target, 0, id)
    previewOrderRef.current = next
    setPreviewOrder(next)
  }
  return h('div', { className: 'kbn-root' },
    h('div', { className: 'kbn-home', 'data-workboard-view': 'home' },
      h('header', { className: 'kbn-home-head' },
        h('div', null, h('h1', null, t('panel.title')), h('p', null, t('home.subtitle'))),
        h('div', { className: 'kbn-home-head-actions' },
          h(DshUI.Tooltip, { label: t('settings.open'), side: 'bottom', portal: true },
            h(DshUI.Button, { variant: 'ghost', size: 'sm', 'aria-label': t('settings.open'), onClick: () => openWorkboardSettings(store.ctx) }, h(DshUI.IconSettingsOutlineMedium, { size: 18 }))),
          h(DshUI.Button, { variant: 'primary', disabled: state.status !== 'ready', icon: h(DshUI.IconPlusOutlineRegular, { size: 16 }), onClick: () => setNewBoard(true) }, t('board.newBoard')))),
      state.status === 'error' ? h('div', { className: 'kbn-home-error', role: 'alert' },
        h(DshUI.IconWarningTriangleOutlineRegular, { size: 18 }), h('span', null, state.error),
        h(DshUI.Button, { variant: 'ghost', size: 'sm', onClick: () => store.refresh() }, t('home.retry'))) : null,
      state.status === 'idle' || (state.status === 'loading' && state.revision === 0)
        ? h('div', { className: 'kbn-home-loading', role: 'status' }, h(DshUI.IconLoadingOutlineRegular, { size: 22 }), t('common.loading'))
        : h(Fragment, null,
          h(CompletionHeatmap, { completions: state.completions }),
          h('div', { className: 'kbn-home-content' },
            h('section', { className: 'kbn-home-section kbn-home-board-section', 'aria-labelledby': 'kbn-boards-title' },
              h('div', { className: 'kbn-home-section-head' },
                h('div', { className: 'kbn-home-section-title' }, h('h2', { id: 'kbn-boards-title' }, t('home.boards')), h('span', { className: 'kbn-home-count' }, t('home.boardCount', { count: boards.length }))),
                h(DshUI.Input, { className: 'kbn-home-search', value: query, onChange: (event) => setQuery(event.currentTarget.value), placeholder: t('home.searchBoards'), 'aria-label': t('home.searchBoards'), icon: h(DshUI.IconSearchOutlineRegular, { size: 16 }) })),
              visible.length ? h('div', { className: 'kbn-home-boards', 'aria-busy': orderBusy }, visible.map((board, index) => {
                const counts = stats.get(board.id) || { todo: 0, doing: 0, done: 0 }
                const later = visible[index + 1]
                const afterLater = later ? boards[boards.findIndex((entry) => entry.id === later.id) + 1]?.id || null : null
                return h('div', {
                  key: board.id, className: 'kbn-home-board-slot', draggable: !orderBusy && state.status === 'ready',
                  'data-dragging': dragId === board.id,
                  style: { order: previewOrder ? previewOrder.indexOf(board.id) : index },
                  onDragStart: (event) => {
                    if (moving.current || event.target.closest?.('.kbn-home-board-moves')) { event.preventDefault(); return }
                    dragRef.current = board.id
                    previewOrderRef.current = boards.map((entry) => entry.id)
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', board.id)
                  },
                  onDragEnd: () => endDrag(!moving.current),
                  onDragOver: (event) => {
                    if (!dragRef.current) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    previewBoard(board.id)
                  },
                  onDrop: (event) => {
                    if (!dragRef.current) return
                    event.preventDefault()
                    const id = dragRef.current
                    const order = previewOrderRef.current || boards.map((entry) => entry.id)
                    const before = order[order.indexOf(id) + 1] || null
                    endDrag(false)
                    moveBoard(id, before)
                  },
                }, h(DshUI.Button, { variant: 'outline', className: 'kbn-home-board', 'data-board-id': board.id, onClick: () => {
                  if (!dragRef.current && Date.now() >= ignoreClickUntil.current) store.openBoard(board.id)
                } },
                  h('span', { className: 'kbn-home-board-title' }, h(DshUI.IconFlatListOutlineRegular, { size: 18 }), h('span', null, board.title)),
                  h('span', { className: 'kbn-home-board-path', title: board.path || t('home.unbound') }, board.path || t('home.unbound')),
                  h('span', { className: 'kbn-home-board-counts' }, STATUSES.map((status) => h('span', { key: status }, h('i', { 'data-status': status, 'aria-hidden': true }), t('status.' + status), h('strong', null, counts[status]))))),
                  h('div', { className: 'kbn-home-board-moves' },
                    h(DshUI.Button, { variant: 'ghost', size: 'sm', draggable: false, disabled: orderBusy || state.status !== 'ready' || index === 0, title: t('home.moveEarlier'), 'aria-label': t('home.moveEarlier') + ' · ' + board.title, onClick: () => moveBoard(board.id, visible[index - 1].id) }, h(DshUI.IconChevronLeftOutlineRegular, { size: 14 })),
                    h(DshUI.Button, { variant: 'ghost', size: 'sm', draggable: false, disabled: orderBusy || state.status !== 'ready' || !later, title: t('home.moveLater'), 'aria-label': t('home.moveLater') + ' · ' + board.title, onClick: () => moveBoard(board.id, afterLater) }, h(DshUI.IconChevronRightOutlineRegular, { size: 14 }))))
              })) : h('div', { className: 'kbn-home-empty' }, h('h3', null, t(query ? 'home.noResults' : 'home.empty')), !query ? h('p', null, t('home.emptyHint')) : null),
              boards.length > 1 && h('p', { className: 'kbn-home-order-hint', role: 'status', 'aria-live': 'polite' }, orderMessage || t('home.reorderHint'))),
            h(IdeasSection, { state })))),
    h(NewBoardDialog, { open: newBoard, onClose: (board) => { setNewBoard(false); if (board) store.openBoard(board.id) } }),
    state.toast ? h(DshUI.Toast, { key: state.toast.id, text: state.toast.message, holdMs: 4000, onDone: () => undefined }) : null)
}

function WorkboardPage() {
  const state = kanbanStore.use()
  useEffect(() => {
    if (state.status === 'ready' && state.boardId && !boardOf(state, state.boardId)) kanbanStore.openHome()
  }, [state.status, state.boardId, state.workspaces, state.boards])
  return state.boardId && boardOf(state, state.boardId)
    ? h(BoardPage, { key: state.boardId, boardId: state.boardId })
    : h(WorkboardHome, { state })
}

addStyle(`
.kbn-panel-glyph{display:inline-flex;align-items:center;justify-content:center}
.kbn-home{flex:1;min-width:0;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent;padding:28px clamp(18px,4%,56px) 48px;container:workboard-home / inline-size}
.kbn-home h1,.kbn-home h2,.kbn-home h3,.kbn-home p{margin:0}
.kbn-home h1{font-size:24px;line-height:32px;font-weight:600}
.kbn-home h2{font-size:17px;line-height:24px;font-weight:600}
.kbn-home-head,.kbn-home-section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.kbn-home-head p,.kbn-home-section-head p{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;margin-top:4px}
.kbn-home-head-actions,.kbn-home-section-tools,.kbn-home-section-title{display:flex;align-items:center;gap:12px;min-width:0}
.kbn-home-section{margin-top:32px}
.kbn-home-content{display:grid;grid-template-columns:minmax(0,1fr);gap:32px;margin-top:32px;align-items:start}
.kbn-home-content>.kbn-home-section{min-width:0;margin-top:0;container-type:inline-size}
.kbn-home-section-head{margin-bottom:16px}
.kbn-home-count{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}
.kbn-home-search{width:200px;max-width:100%}
.kbn-home-boards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:14px}
.kbn-home-board-slot{position:relative;min-width:0;border-radius:var(--dsw-radius-lg)}
.kbn-home-board-slot[draggable=true]{cursor:grab}
.kbn-home-board-slot[data-dragging=true]{outline:1.5px dashed var(--dsw-alias-state-business-primary);outline-offset:-1.5px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 6%,transparent);cursor:grabbing}
.kbn-home-board-slot[data-dragging=true]>*{visibility:hidden}
.kbn-home-board-slot>.kbn-home-board{width:100%;height:100%!important}
.kbn-home-board-slot .kbn-home-board-title{padding-inline-end:58px}
.kbn-home-board-moves{position:absolute;inset-block-start:12px;inset-inline-end:10px;display:flex;gap:2px}
.kbn-home-board-moves>button{display:inline-flex;align-items:center;justify-content:center;width:28px!important;min-width:28px!important;height:28px!important;padding:0!important}
.kbn-home-order-hint{margin-top:10px!important;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.kbn-home-board{display:flex!important;flex-direction:column;align-items:stretch!important;justify-content:flex-start!important;gap:10px!important;height:auto!important;min-width:0;white-space:normal!important;text-align:start;padding:18px!important;border-radius:var(--dsw-radius-lg)!important}
.kbn-home-board-title{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:550;min-width:0}
.kbn-home-board-title>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kbn-home-board-title>svg{flex-shrink:0;color:var(--dsw-alias-label-secondary)}
.kbn-home-board-path{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-secondary)}
.kbn-home-board-counts{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.kbn-home-board-counts>span{display:flex;align-items:center;gap:5px}
.kbn-home-board-counts strong{font-weight:500;color:var(--dsw-alias-label-primary)}
.kbn-home-board-counts i{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.kbn-home-board-counts i[data-status=doing]{background:var(--dsw-alias-state-business-primary)}
.kbn-home-board-counts i[data-status=done]{background:var(--dsw-alias-state-success-primary)}
.kbn-home-empty{padding:24px;border:1px dashed var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg)}
.kbn-home-empty h3{font-size:14px;font-weight:500}
.kbn-home-empty p,.kbn-home-empty-note{margin-top:6px!important;color:var(--dsw-alias-label-secondary);font-size:13px}
.kbn-home-empty-note{padding:16px 0}
.kbn-home-error{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;color:var(--dsw-alias-state-error-primary);font-size:13px}
.kbn-home-error>span{flex:1}
.kbn-home-loading{display:flex;align-items:center;justify-content:center;gap:10px;min-height:280px;color:var(--dsw-alias-label-secondary)}
.kbn-heat{padding-bottom:24px;border-bottom:1px solid var(--dsw-alias-border-l4)}
.kbn-heat-chart{--kbn-heat-gap:clamp(1px,.25cqw,4px);width:100%;max-width:var(--kbn-heat-max-width);margin-inline:auto;padding:3px;box-sizing:border-box}
.kbn-heat-months{display:grid;grid-template-columns:repeat(var(--kbn-heat-weeks),minmax(0,1fr));gap:var(--kbn-heat-gap);margin-bottom:8px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
.kbn-heat-months>span{grid-row:1;white-space:nowrap;overflow:hidden}
.kbn-heat-month-compact{display:none}
.kbn-heat-grid{display:grid;grid-template-rows:repeat(7,auto);grid-template-columns:repeat(var(--kbn-heat-weeks),minmax(0,1fr));grid-auto-flow:column;gap:var(--kbn-heat-gap)}
.kbn-heat-cell{min-width:0!important;width:100%;height:auto!important;aspect-ratio:1;min-height:0!important;padding:0!important;border:0!important;border-radius:3px!important}
.kbn-heat-cell[data-today=true]{outline:1px solid var(--dsw-alias-label-tertiary);outline-offset:2px}
.kbn-heat-cell:focus-visible{outline:2px solid var(--dsw-focus-ring-color)!important;outline-offset:2px}
.kbn-heat-cell[data-future=true]{visibility:hidden}
.kbn-heat-cell[data-level="0"],.kbn-heat-sample[data-level="0"]{background:var(--dsw-alias-interactive-bg-hover)!important}
.kbn-heat-cell[data-level="1"],.kbn-heat-sample[data-level="1"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 25%,var(--dsw-alias-bg-base))!important}
.kbn-heat-cell[data-level="2"],.kbn-heat-sample[data-level="2"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,var(--dsw-alias-bg-base))!important}
.kbn-heat-cell[data-level="3"],.kbn-heat-sample[data-level="3"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 70%,var(--dsw-alias-bg-base))!important}
.kbn-heat-cell[data-level="4"],.kbn-heat-sample[data-level="4"]{background:var(--dsw-alias-state-success-primary)!important}
.kbn-heat-foot{display:flex;justify-content:space-between;gap:12px;margin-top:14px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.kbn-heat-explanation{margin-top:4px!important;color:var(--dsw-alias-label-secondary);font-size:11px}
.kbn-heat-legend{display:flex;align-items:center;gap:5px}
.kbn-heat-sample{width:10px;height:10px;border-radius:2px}
.kbn-note-composer,.kbn-note-card{--kbn-note-accent:#dcae38;--kbn-note-bg:color-mix(in srgb,var(--kbn-note-accent) 18%,var(--dsw-alias-bg-base));background:var(--kbn-note-bg);color:var(--dsw-alias-label-primary);border:1px solid color-mix(in srgb,var(--kbn-note-accent) 24%,var(--dsw-alias-border-l4));border-radius:var(--dsw-radius-lg)}
[data-note-color=yellow]{--kbn-note-accent:#dcae38}
[data-note-color=pink]{--kbn-note-accent:#dc82a6}
[data-note-color=blue]{--kbn-note-accent:#71b5e4}
[data-note-color=mint]{--kbn-note-accent:#62b5a6}
[data-note-color=purple]{--kbn-note-accent:#a58ad7}
[data-note-color=neutral]{--kbn-note-accent:#aca69c}
.kbn-note-composer{padding:16px 18px;margin-bottom:18px}
.kbn-note-prompt{display:block!important;width:100%;min-height:68px;height:auto!important;text-align:start;white-space:pre-wrap!important;overflow-wrap:anywhere;justify-content:flex-start!important;align-items:flex-start!important;padding:0!important;color:var(--dsw-alias-label-secondary)!important;background:transparent!important}
.kbn-note-compose-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px}
.kbn-note-colors{display:flex;gap:7px;align-items:center}
.kbn-note-swatch{width:22px!important;min-width:22px!important;height:22px!important;padding:0!important;border:1px solid var(--dsw-alias-border-l3)!important;border-radius:7px!important;background:color-mix(in srgb,var(--kbn-note-accent,#dcae38) 40%,var(--dsw-alias-bg-base))!important;color:var(--dsw-alias-label-primary)!important}
.kbn-note-swatch[aria-pressed=true]{outline:1px solid var(--dsw-alias-label-secondary);outline-offset:2px}
.kbn-note-submit{display:flex;align-items:center;gap:12px;margin-left:auto}
.kbn-note-shortcut{font-size:11px;color:var(--dsw-alias-label-secondary)}
.kbn-notes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:16px;align-items:start}
.kbn-note-card{display:flex;flex-direction:column;gap:12px;min-height:178px;padding:18px 16px 10px;box-shadow:0 3px 10px color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent);animation:kbn-note-arrive .18s ease-out}
.kbn-note-body{flex:1;min-width:0}
.kbn-note-content{font-size:16px;line-height:26px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow-y:auto;scrollbar-width:thin}
.kbn-note-editor textarea{font:inherit;font-size:16px;line-height:26px;width:100%;min-height:68px;max-height:280px;overflow-y:auto!important;color:inherit;box-sizing:border-box}
.kbn-note-foot{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-height:28px}
.kbn-note-save{font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.kbn-note-actions{margin-left:auto;display:flex;align-items:center;gap:2px}
.kbn-note-actions button{padding-inline:6px}
@keyframes kbn-note-arrive{from{opacity:.6;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@container workboard-home (min-width:1120px){.kbn-home-content{grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}.kbn-home-content>.kbn-home-section>.kbn-home-section-head{min-height:48px}}
@container workboard-home (max-width:540px){.kbn-heat-month-full{display:none}.kbn-heat-month-compact{display:inline}}
@container (max-width:540px){.kbn-home-head-actions{gap:6px}.kbn-home-search{width:160px}.kbn-home-section-tools{flex-wrap:wrap}.kbn-note-shortcut{display:none}.kbn-home h1{font-size:21px}.kbn-home-section{margin-top:26px}}
@media(prefers-reduced-motion:reduce){.kbn-note-card{animation:none}}
`)
