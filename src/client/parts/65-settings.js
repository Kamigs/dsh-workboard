/** Workboard contributes one section to the DSH settings shell. */
addDict({
  'settings.open': '工作看板设置',
  'settings.target': '看板列表',
  'settings.editName': '编辑名称',
  'settings.renameUnavailable': '看板改名接口暂不可用，请重启 DSH 后重试。',
  'settings.boardMissing': '该看板已不存在，请重新打开设置。',
  'settings.saved': '看板名称已保存',
  'settings.exportAll': '导出所有看板的任务。导入的任务会添加到上方选中的看板。',
  'settings.unavailable': 'DSH 设置暂时不可用，请重新打开看板后重试。',
}, {
  'settings.open': 'Workboard settings',
  'settings.target': 'Boards',
  'settings.editName': 'Edit name',
  'settings.renameUnavailable': 'The board rename endpoint is unavailable. Restart DSH and try again.',
  'settings.boardMissing': 'This board no longer exists. Reopen settings.',
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

function SettingsBoardRow({ board, selected, onSelect, disabled }) {
  const [name, setName] = useState(board.title)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const rowRef = useRef(null)
  const saving = useRef(false)
  const title = name.trim()

  function finishEditing() {
    setEditing(false)
    setError('')
    setTimeout(() => rowRef.current?.querySelector('.kbn-board-name-action')?.focus(), 0)
  }

  async function save(event) {
    event.preventDefault()
    if (saving.current || disabled) return
    if (!editing) {
      setName(board.title)
      setError('')
      setEditing(true)
      return
    }
    if (!title) return
    if (title === board.title) {
      finishEditing()
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await kanbanStore.renameBoard(board.id, title)
      finishEditing()
      kanbanStore.toast(t('settings.saved'), 'info')
    } catch (failure) {
      if (failure.code === 'kanban/board-not-found') setError(t('settings.boardMissing'))
      else if (failure.status === 404) setError(t('settings.renameUnavailable'))
      else setError(messageOf(failure))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  function handleKeyDown(event) {
    if (!editing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (!saving.current) finishEditing()
    }
    if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
  }

  return h('li', { ref: rowRef, className: 'kbn-settings-board', 'data-selected': selected, 'data-editing': editing, onKeyDown: handleKeyDown },
    h('input', {
      type: 'radio', name: 'kbn-settings-board', checked: selected,
      'aria-label': board.title, onChange: onSelect, disabled: disabled || busy,
    }),
    h('form', { className: 'kbn-board-name-form', onSubmit: save, 'aria-busy': busy },
      editing ? h(Input, {
        value: name, onChange: (value) => { setName(value); setError('') },
        ariaLabel: t('board.nameLabel'), maxLength: 80, disabled: busy, autoFocus: true,
      }) : h('button', { type: 'button', className: 'kbn-board-name', onClick: onSelect, disabled, title: board.title }, board.title),
      h(DshUI.Button, {
        className: 'kbn-board-name-action kbn-board-icon-button', type: 'submit', variant: 'ghost', size: 'sm',
        disabled: busy || disabled || (editing && !title), loading: busy,
        'aria-label': (editing ? t('common.save') : t('settings.editName')) + ' · ' + board.title,
        title: editing ? t('common.save') : t('settings.editName'),
      },
      h('span', { className: 'kbn-board-name-caption kbn-board-name-edit', 'aria-hidden': true },
        h(DshUI.IconEditOutlineRegular, { size: 16 })),
      h('span', { className: 'kbn-board-name-caption kbn-board-name-save', 'aria-hidden': true },
        h(Icon, { name: 'check', size: 16 }))),
      editing && h(DshUI.Button, {
        className: 'kbn-board-icon-button', type: 'button', variant: 'ghost', size: 'sm', disabled: busy,
        'aria-label': t('common.cancel'), title: t('common.cancel'), onClick: finishEditing,
        icon: h(Icon, { name: 'close', size: 16 }),
      })),
    error && h('p', { className: 'kbn-import-error', role: 'alert' }, error))
}

function WorkboardSettings({ close }) {
  const store = kanbanStore
  const state = store.use((snapshot) => snapshot)
  const boards = boardsOf(state)
  const [boardId, setBoardId] = useState(kbnLastWorkspaceId)
  const [boardOpen, setBoardOpen] = useState(false)
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
      h('div', { className: 'kbn-settings-heading' },
        h('h3', null, t('settings.target')),
        h(DshUI.Button, {
          variant: 'ghost', size: 'sm', disabled: !!importState,
          onClick: () => setBoardOpen(true),
        }, h(Icon, { name: 'projectAdd', size: 16 }), t('board.newBoard'))),
      activeBoard ? h('ul', { className: 'kbn-settings-boards', 'aria-label': t('settings.target') },
        boards.map((board) => h(SettingsBoardRow, {
          key: board.id, board, selected: board.id === activeBoard.id,
          onSelect: () => setBoardId(board.id), disabled: !!importState,
        })))
        : h('p', null, t('board.noBoardTitle'))),
    h('section', { className: 'kbn-settings-group' },
      h('h3', null, t('archive.title'), ' (', archivedTasks(state).length, ')'),
      h(ArchivedTaskList, { close })),
    h('section', { className: 'kbn-settings-group' },
      h('div', { className: 'kbn-settings-copy' },
        h('h3', null, t('data.trigger')),
        h('p', { className: 'kbn-detail-note' }, t('settings.exportAll'))),
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
    h(NewBoardDialog, { open: boardOpen, onClose: (board) => {
      setBoardOpen(false)
      if (board) setBoardId(board.id)
    } }),
    h(ToastHost))
}

addStyle(`
.kbn-settings { display: grid; gap: 24px; color: var(--dsw-alias-label-primary); }
.kbn-settings-group { min-width: 0; }
.kbn-settings-group + .kbn-settings-group { padding-top: 24px; border-top: 1px solid var(--dsw-alias-border-l2); }
.kbn-settings-group > * + * { margin-top: 12px; }
.kbn-settings-group > h3 + .kbn-detail-note { margin-top: 4px; }
.kbn-settings-group > .kbn-detail-note p { margin: 0; }
.kbn-settings-group > .kbn-detail-note p + p { margin-top: 4px; }
.kbn-settings-group > .kbn-archive-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; min-height: 112px; margin-top: 12px; padding: 24px 20px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); text-align: center; }
.kbn-settings-group > h3, .kbn-settings-heading > h3, .kbn-settings-copy > h3 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; }
.kbn-settings-copy { display: grid; gap: 4px; }
.kbn-settings-copy > * { margin: 0; }
.kbn-settings-group > .kbn-empty { min-height: 0; padding: 16px; }
.kbn-settings-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.kbn-settings-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.kbn-settings-actions .kbn-input-wrap { flex: 1; min-width: 100px; }
.kbn-settings-boards { display: grid; gap: 6px; margin-bottom: 0; padding: 0; list-style: none; }
.kbn-settings-board { display: grid; grid-template-columns: 16px minmax(0, 1fr); align-items: center; gap: 6px 10px; padding: 4px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); }
.kbn-settings-board[data-selected="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.kbn-settings-board > input { margin: 0; width: 16px; height: 16px; accent-color: var(--dsw-alias-label-primary); }
.kbn-settings-board .kbn-import-error { grid-column: 2; margin: 0; }
.kbn-board-name-form { display: flex; align-items: center; gap: 4px; min-width: 0; }
.kbn-board-name-form > .kbn-input-wrap { flex: 1; min-width: 0; }
.kbn-board-name-form .kbn-input { height: 32px; font-size: 14px; font-weight: 400; }
.kbn-board-name { flex: 1; min-width: 0; height: 32px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-size: 14px; font-weight: 400; line-height: 20px; text-align: start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.kbn-settings-board .kbn-board-icon-button { flex-shrink: 0; width: 28px; height: 28px; min-width: 28px; padding: 0; }
.kbn-board-name-action { display: grid !important; order: 1; }
.kbn-board-name-caption { grid-area: 1 / 1; display: flex; align-items: center; justify-content: center; gap: 6px; pointer-events: none; transition: opacity 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1); }
.kbn-board-name-save { opacity: 0; transform: translateY(5px) scale(.96); }
.kbn-settings-board[data-editing="true"] .kbn-board-name-edit { opacity: 0; transform: translateY(-5px) scale(.96); }
.kbn-settings-board[data-editing="true"] .kbn-board-name-save { opacity: 1; transform: translateY(0) scale(1); }
@media (prefers-reduced-motion: reduce) {
  .kbn-board-name-caption { transition: none; }
}
`)
