/**
 * Archive settings: archived tasks grouped by board, with restore, inline
 * two-click delete and a jump to the linked harness session.
 */
addDict(
  {
    'archive.title': '归档任务',
    'archive.emptyTitle': '暂无归档任务',
    'archive.emptyDesc': '归档的任务会出现在这里，恢复后会回到原来的状态列。',
    'archive.restore': '恢复',
    'archive.confirmDelete': '确认删除',
    'archive.restored': '任务已恢复',
    'archive.deleted': '任务已删除',
    'archive.archivedOn': '归档于 {date}',
    'archive.noDate': '归档日期未知',
    'archive.tagsMore': '还有 {count} 个标签',
    'archive.showMore': '展开其余 {count} 项',
    'archive.showLess': '收起',
  },
  {
    'archive.title': 'Archived tasks',
    'archive.emptyTitle': 'No archived tasks',
    'archive.emptyDesc': 'Archived tasks appear here. Restore a task to return it to its original column.',
    'archive.restore': 'Restore',
    'archive.confirmDelete': 'Confirm delete',
    'archive.restored': 'Task restored',
    'archive.deleted': 'Task deleted',
    'archive.archivedOn': 'Archived {date}',
    'archive.noDate': 'Archived date unknown',
    'archive.tagsMore': '{count} more tags',
    'archive.showMore': 'Show {count} more',
    'archive.showLess': 'Show less',
  },
)

/** Compare two archived-task lists by the fields the dialog renders. */
function kbnSameArchived(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].id !== right[index].id) return false
    if (left[index].updatedAt !== right[index].updatedAt) return false
    if (left[index].archivedAt !== right[index].archivedAt) return false
  }
  return true
}

/**
 * Display day for one archived task (archived timestamp sliced to a day).
 * @param {object} task
 * @returns {string}
 */
function archiveDay(task) {
  const iso = typeof task.archivedAt === 'string' && task.archivedAt !== ''
    ? task.archivedAt
    : (typeof task.updatedAt === 'string' ? task.updatedAt : '')
  return iso.length >= 10 ? formatDay(iso.slice(0, 10)) : ''
}

/**
 * Archived-task manager.
 * @param {{ close: Function }} props
 * @returns {object} React element
 */
function ArchivedTaskList({ close }) {
  const state = kanbanStore.use((snapshot) => snapshot)
  const archived = archivedTasks(state)
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [expandedBoards, setExpandedBoards] = useState({})

  useEffect(() => {
    if (confirmId === null) return undefined
    const timer = setTimeout(() => setConfirmId(null), 5000)
    return () => clearTimeout(timer)
  }, [confirmId])

  async function handleRestore(task) {
    setBusyId(task.id)
    setConfirmId(null)
    try {
      await kanbanStore.restoreTask(task.id)
      kanbanStore.toast(t('archive.restored'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(task) {
    setBusyId(task.id)
    setConfirmId(null)
    try {
      await kanbanStore.deleteTask(task.id)
      kanbanStore.toast(t('archive.deleted'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const groups = []
  const byWorkspace = new Map()
  archived.forEach((task) => {
    const key = typeof task.workspaceId === 'string' ? task.workspaceId : ''
    let group = byWorkspace.get(key)
    if (group === undefined) {
      group = { id: key, workspace: boardOf(state, key), tasks: [] }
      byWorkspace.set(key, group)
      groups.push(group)
    }
    group.tasks.push(task)
  })

  let body
  if (state.status === 'loading' && archived.length === 0) {
    body = h('div', { className: 'kbn-empty' }, h(Spinner, { size: 20, label: t('common.loading') }))
  } else if (archived.length === 0) {
    body = h('div', { className: 'kbn-archive-empty kbn-detail-note' },
      h('p', null, t('archive.emptyTitle')),
      h('p', null, t('archive.emptyDesc')))
  } else {
    body = h('div', { className: 'kbn-archive' },
      groups.map((group) => {
        const workspaceTitle = group.workspace !== null && group.workspace !== undefined
          ? String(group.workspace.title || '')
          : t('common.none')
        const workspacePath = group.workspace !== null && group.workspace !== undefined && typeof group.workspace.path === 'string'
          ? group.workspace.path
          : ''
        const expanded = !!expandedBoards[group.id]
        const visibleTasks = expanded ? group.tasks : group.tasks.slice(0, 3)
        const listId = 'kbn-archive-tasks-' + encodeURIComponent(group.id)
        return h('section', { className: 'kbn-archive-group', key: group.id },
          h('h4', { className: 'kbn-archive-group-title' },
            h('span', null, workspaceTitle),
            h('span', { className: 'kbn-archive-count' }, '(', group.tasks.length, ')'),
            workspacePath !== '' ? h('span', { className: 'kbn-archive-ws', title: workspacePath }, workspacePath) : null),
          h('div', { id: listId, className: 'kbn-archive-rows' }, visibleTasks.map((task) => {
            const tags = Array.isArray(task.tags)
              ? task.tags.filter((tag) => typeof tag === 'string' && tag !== '')
              : []
            const shownTags = tags.slice(0, 4)
            const hiddenTags = tags.length - shownTags.length
            const day = archiveDay(task)
            const rowBusy = busyId === task.id
            const actions = []
            if (typeof task.sessionId === 'string' && task.sessionId !== '') {
              actions.push(h(Button, {
                key: 'session',
                size: 'sm',
                variant: 'ghost',
                icon: h(Icon, { name: 'link', size: 12 }),
                disabled: rowBusy,
                onClick: () => { close(); openTaskSession(task) },
              }, t('action.openSession')))
            }
            actions.push(h(Button, {
              key: 'restore',
              size: 'sm',
              variant: 'ghost',
              icon: h(Icon, { name: 'unarchive', size: 12 }),
              busy: rowBusy,
              onClick: () => handleRestore(task),
            }, t('archive.restore')))
            if (confirmId === task.id) {
              actions.push(h(Button, {
                key: 'delete',
                size: 'sm',
                variant: 'danger',
                icon: h(Icon, { name: 'trash', size: 12 }),
                disabled: rowBusy,
                onClick: () => handleDelete(task),
              }, t('archive.confirmDelete')))
            } else {
              actions.push(h(Button, {
                key: 'delete',
                size: 'sm',
                variant: 'ghost',
                icon: h(Icon, { name: 'trash', size: 12 }),
                disabled: rowBusy,
                onClick: () => setConfirmId(task.id),
              }, t('common.delete')))
            }
            return h('div', { className: 'kbn-archive-row', key: task.id },
              h('div', { className: 'kbn-archive-main' },
                h('span', { className: 'kbn-archive-title' }, String(task.title || t('card.untitled'))),
                h('div', { className: 'kbn-archive-meta' },
                  h('span', null,
                    h(Icon, { name: 'clock', size: 12 }),
                    day !== '' ? t('archive.archivedOn', { date: day }) : t('archive.noDate')),
                  shownTags.map((tag, index) => h('span', { className: 'kbn-tag', key: index, title: tag }, tag)),
                  hiddenTags > 0
                    ? h('span', {
                      className: 'kbn-tag kbn-tag-more',
                      title: tags.slice(4).join(', '),
                      'aria-label': t('archive.tagsMore', { count: hiddenTags }),
                    }, '+' + hiddenTags)
                    : null)),
              h('div', { className: 'kbn-archive-actions' }, actions))
          })),
          group.tasks.length > 3 && h(DshUI.Button, {
            variant: 'ghost', size: 'sm', className: 'kbn-archive-more',
            'aria-expanded': expanded, 'aria-controls': listId,
            'aria-label': workspaceTitle + ' · ' + (expanded ? t('archive.showLess') : t('archive.showMore', { count: group.tasks.length - 3 })),
            onClick: () => {
              setConfirmId(null)
              setExpandedBoards((previous) => ({ ...previous, [group.id]: !previous[group.id] }))
            },
          }, expanded ? t('archive.showLess') : t('archive.showMore', { count: group.tasks.length - 3 })))
      }))
  }

  return body
}
