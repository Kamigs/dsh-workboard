/** Workboard contributes one section to the DSH settings shell. */
addDict({
  'settings.open': '工作看板设置',
  'settings.target': '当前看板',
  'settings.saved': '看板名称已保存',
  'settings.exportAll': '导出所有看板的任务。导入的任务会添加到上方选中的看板。',
  'settings.unavailable': 'DSH 设置暂时不可用，请重新打开看板后重试。',
}, {
  'settings.open': 'Workboard settings',
  'settings.target': 'Current board',
  'settings.saved': 'Board name saved',
  'settings.exportAll': 'Export tasks from all boards. Imported tasks are added to the board selected above.',
  'settings.unavailable': 'DSH settings are unavailable. Reopen the board and try again.',
})

function openWorkboardSettings(ctx) {
  // DSH registers the same root settings store instance for its sidebar and shortcut.
  const handle = ctx.slots.entriesOfSlot('sidebar.settings')[0]?.store
  const shell = handle && ctx.slots.resolveStore(handle)
  if (shell?.actions?.openSection) shell.actions.openSection(PLUGIN_ID)
  else kanbanStore.toast(t('settings.unavailable'), 'error')
}

function BoardNameField({ board }) {
  const [name, setName] = useState(board.title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const title = name.trim()
  async function save(event) {
    event.preventDefault()
    if (!title || title === board.title || busy) return
    setBusy(true)
    setError('')
    try {
      await kanbanStore.renameBoard(board.id, title)
      kanbanStore.toast(t('settings.saved'), 'info')
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }
  return h('form', { onSubmit: save },
    h(Field, { label: t('board.nameLabel') },
      h('div', { className: 'kbn-settings-actions' },
        h(Input, { value: name, onChange: setName, ariaLabel: t('board.nameLabel'), maxLength: 80, disabled: busy }),
        h(DshUI.Button, { type: 'submit', variant: 'outline', size: 'sm', disabled: busy || !title || title === board.title }, t('common.save')))),
    error && h('p', { className: 'kbn-import-error', role: 'alert' }, error))
}

function WorkboardSettings({ close }) {
  const store = kanbanStore
  const state = store.use((snapshot) => snapshot)
  const boards = boardsOf(state)
  const [boardId, setBoardId] = useState(kbnLastWorkspaceId)
  const activeBoard = boards.find((board) => board.id === boardId) || boards[0] || null
  const [importState, setImportState] = useState(null)
  const importFileRef = useRef(null)

  function handleExport() {
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

  return h('div', { className: 'kbn-settings' },
    h('section', { className: 'kbn-settings-group' },
      h('h3', null, t('settings.target')),
      activeBoard ? h(Fragment, null,
        h(Select, {
          value: activeBoard.id, options: boards.map((board) => ({ value: board.id, label: board.title })),
          onChange: setBoardId, ariaLabel: t('board.selectBoard'), disabled: !!importState,
        }),
        h(BoardNameField, { key: activeBoard.id + ':' + activeBoard.title, board: activeBoard }))
        : h('p', null, t('board.noBoardTitle'))),
    h('section', { className: 'kbn-settings-group' },
      h('h3', null, t('data.trigger')),
      h('p', { className: 'kbn-detail-note' }, t('settings.exportAll')),
      h('div', { className: 'kbn-settings-actions' },
        h(DshUI.Button, { variant: 'outline', size: 'sm', onClick: handleExport }, t('data.export')),
        h(DshUI.Button, { variant: 'outline', size: 'sm', onClick: handleImportPick, disabled: !activeBoard || !!importState }, t('data.import'))),
      h('input', {
        ref: importFileRef,
        type: 'file',
        accept: 'application/json,.json',
        className: 'kbn-visually-hidden',
        tabIndex: -1,
        'aria-hidden': 'true',
        onChange: handleImportFile,
      }),
      h(KbnImportReview, {
        state: importState,
        onCancel: () => setImportState(null),
        onConfirm: confirmImport,
      })),
    h('details', { className: 'kbn-settings-group' },
      h('summary', null, t('archive.title'), ' (', archivedTasks(state).length, ')'),
      h(ArchivedTaskList, { close })),
    state.toast && h('p', { role: 'status', className: 'kbn-detail-note' }, state.toast.message))
}

addStyle(`
.kbn-settings { display: grid; gap: 16px; color: var(--dsw-alias-label-primary); }
.kbn-settings-group { min-width: 0; padding: 16px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); }
.kbn-settings-group > * + * { margin-top: 12px; }
.kbn-settings-group h3, .kbn-settings-group summary { margin: 0; font-size: 14px; font-weight: 600; }
.kbn-settings-group summary { cursor: pointer; }
.kbn-settings-group > .kbn-empty { min-height: 0; padding: 16px; }
.kbn-settings-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.kbn-settings-actions .kbn-input-wrap { flex: 1; min-width: 100px; }
`)
