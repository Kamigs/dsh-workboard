/**
 * Browser-half entry. Registers the plugin's copy, stylesheet, client store and
 * the harness surfaces: the left-sidebar panel entry, the central board
 * panel, Workboard settings, and the session-header task status menu.
 */

/**
 * Sidebar glyph: the sidebar owns the button and its accessible name; this is
 * only the decorative icon child, rendered at the size the rail asks for.
 * @param {{ size?: number, active?: boolean }} props
 * @returns {object} React element
 */
function PanelGlyph({ size }) {
  return h(Icon, { name: 'board', size: typeof size === 'number' && size > 0 ? size : 20 })
}

/** DSH currently assigns plugin settings a fixed gear, without an icon slot. */
function installSettingsNavIcon() {
  if (typeof MutationObserver !== 'function') return
  const update = () => {
    document.querySelectorAll('[data-shortcut-modal="settings"] nav button').forEach((button) => {
      button.toggleAttribute('data-kbn-settings-nav', button.textContent.trim() === t('panel.title'))
    })
  }
  const observer = new MutationObserver(update)
  observer.observe(document.body, { childList: true, characterData: true, subtree: true })
  update()
  return () => {
    observer.disconnect()
    document.querySelectorAll('[data-kbn-settings-nav]').forEach((button) => button.removeAttribute('data-kbn-settings-nav'))
  }
}

// Both navigation surfaces use the same DSH vector and inherit their text color.
const settingsBoardMask = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ICON_DATA.board.vb}" fill="none" stroke="black">${ICON_DATA.board.paths.map((path) => `<path d="${path.d}"/>`).join('')}</svg>`)
addStyle(`
[data-kbn-settings-nav] > svg { display: none; }
[data-kbn-settings-nav]::before { content: ''; display: block; width: 16px; height: 16px; flex-shrink: 0; background: currentColor; mask: url("data:image/svg+xml,${settingsBoardMask}") center / contain no-repeat; }
`)

/**
 * Client plugin body.
 * @param {object} ctx - Harness client context with the injected services.
 * @returns {void}
 */
function apply(ctx) {
  ctx.effect(
    () => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }),
    'kanban: dictionaries',
  )

  const refreshCopy = () => {
    setTranslate(ctx.locale.bind(NS))
    const snapshot = ctx.locale.getLocale()
    setLocaleId(snapshot && typeof snapshot.active === 'string' ? snapshot.active : 'en')
  }
  refreshCopy()
  ctx.effect(() => ctx.locale.subscribe(() => {
    refreshCopy()
    if (kanbanStore !== null && typeof kanbanStore.notifyLocale === 'function') kanbanStore.notifyLocale()
  }), 'kanban: locale changes')

  ctx.effect(() => {
    const element = installStyles()
    return () => {
      element.remove()
    }
  }, 'kanban: stylesheet')

  ctx.effect(installSettingsNavIcon, 'kanban: settings navigation icon')

  kanbanStore = createKanbanStore(ctx)
  // Load once at activation so session-header task links work before the board
  // panel has ever been opened; a failure keeps the board's own retry state.
  kanbanStore.refresh().catch(() => undefined)
  // Read the signed-in account once the other client services have applied.
  ctx.effect(() => {
    const timer = setTimeout(() => {
      loadKbnAccount(ctx)
    }, 0)
    return () => clearTimeout(timer)
  }, 'kanban: account profile')
  ctx.effect(() => () => {
    if (kanbanStore !== null && typeof kanbanStore.dispose === 'function') kanbanStore.dispose()
  }, 'kanban: client store')

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 20,
    locale: NS,
    label: () => t('panel.title'),
  }, PanelGlyph))

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
  }, BoardPage))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: PLUGIN_ID,
    order: 100,
    locale: NS,
    label: () => t('panel.title'),
  }, WorkboardSettings))

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'kanban-task-link',
    order: -1,
    locale: NS,
    inject: (sessionId) => ({ sessionId }),
  }, TaskLinkAction))
}

return {
  inject: ['slots', 'locale', 'layout', 'sessions', 'uiWorkspace', 'workspaces', 'fileUpload'],
  apply,
}
