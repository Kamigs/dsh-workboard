/**
 * Board card pieces: the colored status dot, the priority chip and the task
 * card itself (draggable, with hover-revealed actions).
 */
addDict(
  {
    'card.untitled': '未命名任务',
    'card.start': '开始 {date}',
    'card.due': '截止 {date}',
    'card.overdue': '已逾期',
    'card.attachments': '{count} 个附件',
    'card.linked': '已关联会话',
    'card.edit': '编辑任务',
    'card.run': '开会话执行',
    'card.openSession': '打开关联会话',
    'card.archive': '归档任务',
    'card.tagsMore': '还有 {count} 个标签',
    'assignee.ai': 'AI',
    'assignee.human': '人工',
  },
  {
    'card.untitled': 'Untitled task',
    'card.start': 'Start {date}',
    'card.due': 'Due {date}',
    'card.overdue': 'Overdue',
    'card.attachments': '{count} attachments',
    'card.linked': 'Linked session',
    'card.edit': 'Edit task',
    'card.run': 'Run in new session',
    'card.openSession': 'Open linked session',
    'card.archive': 'Archive task',
    'card.tagsMore': '{count} more tags',
    'assignee.ai': 'AI',
    'assignee.human': 'Human',
  },
)

/** Priority → chip tone (ARCHITECTURE.md §7: low idle, medium business, high warn, urgent error). */
const KBN_PRIORITY_TONES = {
  low: 'neutral',
  medium: 'brand',
  high: 'warn',
  urgent: 'danger',
}

/**
 * Read a widget's `onChange` payload defensively: the foundation widgets pass
 * the value, but a raw event is tolerated so board parts never crash on either.
 * @param {any} input
 * @returns {any}
 */
function kbnFieldValue(input) {
  if (input !== null && typeof input === 'object' && input.target !== undefined
    && input.target !== null && typeof input.target.value === 'string') {
    return input.target.value
  }
  return input
}

/**
 * 8px colored status dot plus its text label, so status is never color-only.
 * @param {{ status?: 'todo' | 'doing' | 'done', label?: string }} props
 * @returns {object} React element
 */
function StatusDot({ status, label }) {
  const value = STATUSES.indexOf(status) >= 0 ? status : 'todo'
  const text = typeof label === 'string' && label !== '' ? label : t('status.' + value)
  return h('span', { className: 'kbn-status', 'data-status': value, title: text },
    h('span', { className: 'kbn-col-dot', 'data-status': value, 'aria-hidden': 'true' }),
    h('span', { className: 'kbn-status-text' }, text))
}

/**
 * Priority chip: colored tone plus the written level.
 * @param {{ priority?: 'low' | 'medium' | 'high' | 'urgent' }} props
 * @returns {object} React element
 */
function PriorityBadge({ priority }) {
  const value = PRIORITIES.indexOf(priority) >= 0 ? priority : 'low'
  const tone = KBN_PRIORITY_TONES[value] || 'neutral'
  const icon = value === 'urgent' || value === 'high'
    ? h(Icon, { name: 'warning', size: 12 })
    : null
  return h('span', {
    className: 'kbn-chip kbn-priority',
    'data-tone': tone,
    'data-priority': value,
    title: t('priority.' + value),
  }, icon, t('priority.' + value))
}

/**
 * One icon-only card action.
 * @param {{ name: string, label: string, disabled?: boolean, onClick?: Function }} props
 * @returns {object} React element
 */
function CardAction({ name, label, disabled, onClick }) {
  return h('button', {
    type: 'button',
    className: 'kbn-card-action',
    'aria-label': label,
    title: label,
    disabled: disabled || undefined,
    onClick: disabled
      ? undefined
      : (event) => {
        event.stopPropagation()
        if (typeof onClick === 'function') onClick(event)
      },
  }, h(Icon, { name, size: 14 }))
}

/**
 * Run-in-session control for AI tasks, styled like the Harness composer's
 * send button: a filled blue circle carrying the host's send glyph.
 * @param {{ label: string, disabled?: boolean, onClick?: Function }} props
 * @returns {object} React element
 */
function CardSendButton({ label, disabled, onClick }) {
  return h('button', {
    type: 'button',
    className: 'kbn-card-send',
    'aria-label': label,
    title: label,
    disabled: disabled || undefined,
    onClick: disabled
      ? undefined
      : (event) => {
        event.stopPropagation()
        if (typeof onClick === 'function') onClick(event)
      },
  }, h(Icon, { name: 'send', size: 14 }))
}

/**
 * One task card.
 * @param {object} props
 * @returns {object} React element
 */
function TaskCard({
  task,
  workspace,
  selected,
  busy,
  onEdit,
  onRun,
  onOpenSession,
  onArchive,
  onDelete,
  onDragStart,
  onDragEnd,
  onSelect,
}) {
  const [dragging, setDragging] = useState(false)
  const account = useKbnAccount()
  if (task === null || task === undefined) return null

  const tags = Array.isArray(task.tags) ? task.tags.filter((tag) => typeof tag === 'string' && tag !== '') : []
  const shownTags = tags.slice(0, 3)
  const hiddenTags = tags.length - shownTags.length
  const attachments = Array.isArray(task.attachments) ? task.attachments : []
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
  const dueIn = typeof task.dueDate === 'string' && task.dueDate !== '' ? daysUntil(task.dueDate) : null
  const overdue = dueIn !== null && dueIn < 0
  const soon = dueIn !== null && dueIn >= 0 && dueIn <= 2

  const actions = []
  if (typeof task.sessionId === 'string' && task.sessionId !== '') {
    actions.push(h(CardAction, {
      key: 'session',
      name: 'link',
      label: t('card.openSession'),
      disabled: busy,
      onClick: () => {
        if (typeof onOpenSession === 'function') onOpenSession(task)
      },
    }))
  }
  if (task.status === 'done') {
    actions.push(h(CardAction, {
      key: 'archive',
      name: 'archive',
      label: t('card.archive'),
      disabled: busy,
      onClick: () => {
        if (typeof onArchive === 'function') onArchive(task)
      },
    }))
  }
  const showSend = isAI && task.status !== 'done'

  const dates = []
  if (typeof task.startDate === 'string' && task.startDate !== '') {
    dates.push(h('span', { className: 'kbn-card-date', key: 'start' },
      h(Icon, { name: 'clock', size: 12 }),
      t('card.start', { date: formatDay(task.startDate) })))
  }
  if (typeof task.dueDate === 'string' && task.dueDate !== '') {
    const dueLabel = t('card.due', { date: formatDay(task.dueDate) })
    const fullLabel = overdue ? dueLabel + ' · ' + t('card.overdue') : dueLabel
    dates.push(h('span', {
      className: 'kbn-card-date',
      key: 'due',
      'data-overdue': overdue ? 'true' : undefined,
      'data-soon': !overdue && soon ? 'true' : undefined,
      'aria-label': fullLabel,
      title: fullLabel,
    },
      h(Icon, { name: 'clock', size: 12 }),
      dueLabel,
      overdue ? h(Icon, { name: 'warning', size: 12 }) : null))
  }

  function beginDrag(event) {
    setDragging(true)
    if (event !== null && event !== undefined && event.dataTransfer !== null && event.dataTransfer !== undefined) {
      try {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', task.id)
      } catch (error) {
        // Some embedded browsers expose a read-only DataTransfer; dragging still works.
      }
    }
    if (typeof onDragStart === 'function') onDragStart(event)
  }

  function endDrag() {
    setDragging(false)
    if (typeof onDragEnd === 'function') onDragEnd()
  }

  const select = () => {
    if (typeof onSelect === 'function') onSelect(task)
  }

  return h('article', {
    className: 'kbn-card',
    role: 'button',
    tabIndex: 0,
    draggable: busy ? false : true,
    'aria-label': title,
    'data-task-id': task.id,
    'data-selected': selected ? 'true' : undefined,
    'data-dragging': dragging ? 'true' : undefined,
    'data-ai': isAI ? 'true' : undefined,
    'data-has-send': showSend ? 'true' : undefined,
    onClick: select,
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
      event.preventDefault()
      select()
    },
    onDragStart: beginDrag,
    onDragEnd: endDrag,
  },
    h('div', { className: 'kbn-card-head' },
      h('h3', { className: 'kbn-card-title', title }, title),
      h('div', { className: 'kbn-card-side' },
        h('button', {
          type: 'button',
          className: 'kbn-card-edit',
          'aria-label': t('card.edit'),
          title: t('card.edit'),
          disabled: busy || undefined,
          onClick: (event) => {
            event.stopPropagation()
            if (typeof onEdit === 'function') onEdit(task)
          },
        }, h(Icon, { name: 'edit', size: 13 })),
        h(PriorityBadge, { priority: task.priority }))),

    typeof task.description === 'string' && task.description.trim() !== ''
      ? h('p', { className: 'kbn-card-desc' }, task.description.trim())
      : null,

    shownTags.length > 0
      ? h('div', { className: 'kbn-card-tags' },
        shownTags.map((tag, index) => h('span', { className: 'kbn-tag', key: index, title: tag }, tag)),
        hiddenTags > 0
          ? h('span', {
            className: 'kbn-tag kbn-tag-more',
            title: tags.slice(3).join(', '),
            'aria-label': t('card.tagsMore', { count: hiddenTags }),
          }, '+' + hiddenTags)
          : null)
      : null,

    dates.length > 0 ? h('div', { className: 'kbn-card-row' }, h('div', { className: 'kbn-dates' }, dates)) : null,

    h('div', { className: 'kbn-card-foot' },
      h('span', {
        className: 'kbn-assignee',
        'data-kind': isAI ? 'ai' : 'human',
        title: assigneeLabel,
      },
        showAccountAvatar
          ? h(KbnAccountAvatar, { profile: accountProfile, size: 16 })
          : h(Icon, { name: isAI ? 'sparkle' : 'user', size: 12 }),
        h('span', { className: 'kbn-assignee-name' }, assigneeLabel)),
      attachments.length > 0
        ? h('span', {
          className: 'kbn-attach-count',
          title: t('card.attachments', { count: attachments.length }),
          'aria-label': t('card.attachments', { count: attachments.length }),
        },
          h(Icon, { name: 'paperclip', size: 12 }),
          String(attachments.length))
        : null,
      typeof task.sessionId === 'string' && task.sessionId !== ''
        ? h('span', {
          className: 'kbn-attach-count',
          title: t('card.linked'),
          'aria-label': t('card.linked'),
        }, h(Icon, { name: 'link', size: 12 }))
        : null,
      h(StatusDot, { status: task.status }),
      h('div', { className: 'kbn-card-actions' }, actions)),
    showSend
      ? h(CardSendButton, {
        label: t('card.run'),
        disabled: busy,
        onClick: () => {
          if (typeof onRun === 'function') onRun(task)
        },
      })
      : null,
  )
}
