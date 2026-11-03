/**
 * Browser-half smoke test without a browser.
 *
 * Loads the built `lib/client.js` through a fake `window.__ModuleLoader__`,
 * supplies a minimal React renderer (single-pass, hook shim) and a fake Harness
 * client context, then renders every surface the plugin registers: the sidebar
 * glyph, the board panel, the task link in a session header, the task editor
 * dialog and the archive dialog. It catches undefined identifiers, broken
 * property access on store snapshots and bad slot registration shapes before
 * installing into the live Harness.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundlePath = join(root, 'lib/client.js')
if (!existsSync(bundlePath)) {
  console.error('smoke: lib/client.js missing, run node scripts/build-client.mjs first')
  process.exit(1)
}

/* ------------------------------------------------------------------ mini React */
let hooks = []
let hookIndex = 0
let instances = new Map()
const effects = []
const renderedElements = []

function slot(initial) {
  if (hookIndex >= hooks.length) hooks.push({ value: initial })
  return hooks[hookIndex++]
}

const React = {
  Fragment: Symbol('Fragment'),
  createElement(type, props, ...children) {
    const merged = Object.assign({}, props)
    if (children.length === 1) merged.children = children[0]
    else if (children.length > 1) merged.children = children
    return { type, props: merged }
  },
  useState(initial) {
    const s = slot(typeof initial === 'function' ? initial() : initial)
    return [s.value, (next) => {
      s.value = typeof next === 'function' ? next(s.value) : next
    }]
  },
  useEffect(callback) {
    slot(null)
    effects.push(callback)
  },
  useMemo(factory, deps) {
    const s = slot({ deps: undefined, value: undefined })
    if (s.deps === undefined || deps === undefined || deps.some((d, i) => d !== s.deps[i])) {
      s.value = factory()
      s.deps = deps
    }
    return s.value
  },
  useRef(initial) {
    const s = slot(null)
    if (s.value === null) s.value = { current: initial }
    return s.value
  },
  useCallback(fn) {
    return fn
  },
  useSyncExternalStore(_subscribe, getSnapshot) {
    return getSnapshot()
  },
}
React.default = React

function renderNode(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (Array.isArray(node)) return node.map(renderNode).join('')
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node === 'object' && node.type === React.Fragment) {
    return renderNode(node.props.children)
  }
  if (typeof node === 'object' && typeof node.type === 'function') {
    const previousHooks = hooks
    const previousIndex = hookIndex
    let instance = instances.get(node.type)
    if (instance === undefined) {
      instance = { hooks: [], index: 0 }
      instances.set(node.type, instance)
    }
    hooks = instance.hooks
    hookIndex = 0
    try {
      return renderNode(node.type(node.props))
    } finally {
      hooks = previousHooks
      hookIndex = previousIndex
    }
  }
  if (typeof node === 'object' && typeof node.type === 'string') {
    renderedElements.push(node)
    const className = typeof node.props.className === 'string' ? node.props.className : ''
    const classAttr = className === '' ? '' : ` class="${className}"`
    const rawValue = node.props.value
    const valueAttr = rawValue === undefined || rawValue === null ? '' : ` value="${String(rawValue)}"`
    const placeholder = typeof node.props.placeholder === 'string' ? ` placeholder="${node.props.placeholder}"` : ''
    const href = typeof node.props.href === 'string' ? ` href="${node.props.href}"` : ''
    const src = typeof node.props.src === 'string' ? ` src="${node.props.src}"` : ''
    const controls = node.props.controls ? ' controls' : ''
    let styleAttr = ''
    if (node.props.style !== null && typeof node.props.style === 'object') {
      const kebab = (key) => key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())
      const declarations = Object.entries(node.props.style)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key.startsWith('--') ? key : kebab(key)}:${String(value)}`)
      if (declarations.length > 0) styleAttr = ` style="${declarations.join(';')}"`
    }
    const typeAttr = typeof node.props.type === 'string' ? ` type="${node.props.type}"` : ''
    const download = typeof node.props.download === 'string' ? ` download="${node.props.download}"` : ''
    let dataAttrs = ''
    const role = typeof node.props.role === 'string' ? ` role="${node.props.role}"` : ''
    for (const key of Object.keys(node.props)) {
      if (!key.startsWith('aria-')) continue
      const v = node.props[key]
      if (v === undefined || v === null || v === false) continue
      dataAttrs += ` ${key}="${String(v)}"`
    }
    for (const key of Object.keys(node.props)) {
      if (!key.startsWith('data-')) continue
      const v = node.props[key]
      if (v === undefined || v === null || v === false) continue
      dataAttrs += ` ${key}="${String(v)}"`
    }
    return `<${node.type}${classAttr}${valueAttr}${placeholder}${href}${src}${controls}${download}${typeAttr}${role}${dataAttrs}${styleAttr}>${renderNode(node.props.children)}</${node.type}>`
  }
  return ''
}

/**
 * Render a component tree `passes` times, keeping hook state between passes so
 * mount effects that call setState (dialog prefill, store wiring) are observable.
 */
function render(Component, props, passes = 3) {
  instances = new Map()
  let output = ''
  for (let pass = 0; pass < passes; pass++) {
    renderedElements.length = 0
    hooks = []
    hookIndex = 0
    effects.length = 0
    output = renderNode(React.createElement(Component, props))
    const pending = effects.slice()
    effects.length = 0
    for (const effect of pending) effect()
  }
  return output
}

/* ------------------------------------------------------------------ fake DOM */
const styleElements = []
const fakeDocument = {
  body: { style: {} },
  addEventListener() {},
  removeEventListener() {},
  activeElement: null,
  head: {
    appendChild(el) {
      styleElements.push(el)
    },
  },
  createElement(tag) {
    return {
      tagName: tag,
      dataset: {},
      textContent: '',
      remove() {
        const index = styleElements.indexOf(this)
        if (index >= 0) styleElements.splice(index, 1)
      },
    }
  },
}

/* ------------------------------------------------------------------ data */
const workspaceA = { id: 'ws-a', title: 'DSH-workspace', path: '/Users/me/Agent/DSH-workspace' }
const workspaceB = { id: 'ws-b', title: 'web-app', path: '/Users/me/web-app' }
const baseTask = {
  id: 'task_1',
  workspaceId: 'ws-a',
  title: '实现任务看板插件',
  description: '左侧栏入口 + 三态看板 + 归档',
  status: 'doing',
  startDate: '2026-11-01',
  dueDate: '2026-12-01',
  priority: 'high',
  tags: ['dsh', 'plugin'],
  attachments: [
    { id: 'att_1', name: 'spec.md', size: 2048, type: 'text/markdown' },
    { id: 'att_2', name: 'shot.png', size: 4096, type: 'image/png' },
    { id: 'att_3', name: 'demo.mp4', size: 8192, type: 'video/mp4' },
  ],
  assignee: { kind: 'ai', name: 'AI' },
  sessionId: 'session-abc',
  archived: false,
  archivedAt: null,
  order: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}
const standaloneBoard = {
  id: 'board_unbound',
  title: 'Sprint board',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}
let hostBoards = [standaloneBoard]
let hostWorkspaces = [workspaceA, workspaceB]
const tasks = [
  baseTask,
  Object.assign({}, baseTask, {
    id: 'task_2', title: '写归档弹窗', status: 'done', priority: 'medium',
    startDate: null, dueDate: '2026-10-01', tags: ['ui'], attachments: [],
    assignee: { kind: 'human', name: '小明' }, sessionId: null, order: 0,
  }),
  Object.assign({}, baseTask, {
    id: 'task_3', title: '归档任务', status: 'done', priority: 'urgent',
    startDate: null, dueDate: null, tags: [], attachments: [], assignee: { kind: 'human', name: '' },
    sessionId: null, archived: true, archivedAt: '2026-11-02T08:00:00.000Z', workspaceId: 'ws-b', order: 0,
  }),
  Object.assign({}, baseTask, {
    id: 'task_unbound', title: '看板内任务', status: 'todo', priority: 'medium',
    startDate: null, dueDate: null, tags: [], attachments: [], assignee: { kind: 'ai', name: '' },
    sessionId: null, workspaceId: 'board_unbound', order: 0,
  }),
  Object.assign({}, baseTask, {
    id: 'task_4', title: '待办事项', status: 'todo', priority: 'low',
    startDate: null, dueDate: null, tags: [], attachments: [], assignee: { kind: 'ai', name: 'AI' },
    sessionId: null, order: 0, workspaceId: 'ws-a',
  }),
]

const fetchCalls = []
let hostTasks = tasks.slice()
function taskFrom(id, patch) {
  const existing = hostTasks.find((task) => task.id === id) || Object.assign({}, baseTask, { id })
  return Object.assign({}, existing, patch)
}
async function fakeFetch(url, init) {
  const target = String(url)
  fetchCalls.push(target)
  const path = target.split('?')[0]
  const payload = init && typeof init.body === 'string' ? JSON.parse(init.body) : {}
  let body = { ok: true }
  if (path.endsWith('/api/kanban.board.create')) {
    const board = { id: 'board_new', title: payload.title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    hostBoards = hostBoards.concat([board])
    body = { ok: true, board }
  } else if (path.endsWith('/api/kanban.board.bind')) {
    hostTasks = hostTasks.map((item) => (item.workspaceId === payload.boardId
      ? Object.assign({}, item, { workspaceId: payload.workspaceId })
      : item))
    hostBoards = hostBoards.filter((board) => board.id !== payload.boardId)
    body = { ok: true, boardId: payload.boardId, workspaceId: payload.workspaceId, migrated: 1 }
  } else if (path.endsWith('/api/kanban.state')) {
    body = { ok: true, workspaces: hostWorkspaces, boards: hostBoards, tasks: hostTasks }
  } else if (path.endsWith('/api/kanban.task.create')) {
    const task = taskFrom('task_new', Object.assign({ workspaceId: payload.workspaceId }, payload.input))
    hostTasks = hostTasks.concat([task])
    body = { ok: true, task }
  } else if (path.endsWith('/api/kanban.task.update')) {
    const task = taskFrom(payload.id, payload.patch)
    hostTasks = hostTasks.map((item) => (item.id === task.id ? task : item))
    body = { ok: true, task }
  } else if (path.endsWith('/api/kanban.task.move')) {
    const task = taskFrom(payload.id, { status: payload.status })
    hostTasks = hostTasks.map((item) => (item.id === task.id ? task : item))
    body = { ok: true, tasks: hostTasks }
  } else if (path.endsWith('/api/kanban.task.archive')) {
    const task = taskFrom(payload.id, { archived: true, archivedAt: new Date().toISOString() })
    hostTasks = hostTasks.map((item) => (item.id === task.id ? task : item))
    body = { ok: true, task }
  } else if (path.endsWith('/api/kanban.task.restore')) {
    const task = taskFrom(payload.id, { archived: false, archivedAt: null })
    hostTasks = hostTasks.map((item) => (item.id === task.id ? task : item))
    body = { ok: true, task }
  } else if (path.endsWith('/api/kanban.task.delete')) {
    hostTasks = hostTasks.filter((item) => item.id !== payload.id)
    body = { ok: true }
  } else if (path.endsWith('/api/kanban.task.link')) {
    const task = taskFrom(payload.id, { sessionId: payload.sessionId })
    hostTasks = hostTasks.map((item) => (item.id === task.id ? task : item))
    body = { ok: true, task }
  } else if (path.endsWith('/api/kanban.attachment.upload')) {
    body = { ok: true, attachment: { id: 'att_new', name: payload.name, size: 3, type: payload.type } }
  }
  return {
    ok: true,
    status: 200,
    async json() {
      return body
    },
    async text() {
      return JSON.stringify(body)
    },
    headers: { get: () => 'application/json' },
  }
}

/* ------------------------------------------------------------------ load bundle */
const storage = new Map([['dsh-kanban:detail-width', '380']])
let definition = null
const sandbox = {
  DOMRect: class {
    constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }) }
  },
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  window: {
    innerWidth: 1440,
    innerHeight: 900,
    addEventListener() {},
    removeEventListener() {},
    __ModuleLoader__: {
      load(def) {
        definition = def
      },
    },
  },
  document: fakeDocument,
  fetch: fakeFetch,
  console,
  setTimeout,
  clearTimeout,
  AbortController,
  Intl,
  URL,
  TextEncoder,
}
vm.createContext(sandbox)
const instrumented = readFileSync(bundlePath, 'utf8').replace(
  '\nreturn {\n  inject:',
  '  globalThis.__KANBAN_TEST__ = { TaskEditorDialog, ArchiveDialog, TaskCard, TaskDetailPanel, AttachmentPreviewRail, DateField, PriorityBadge, NewBoardDialog, KbnDataMenu, KbnImportDialog, kbnExportPayload, kbnParseImport, kbnImportTasks, kbnExportFileName, StatusDot, Modal, Button, allDicts: DICT, getStore: () => kanbanStore, loadAccount: () => loadKbnAccount(kanbanStore.ctx), currentDetailWidth: () => kbnDetailWidth, readDetailWidth: () => kbnReadDetailWidth(), storeDetailWidth: (width) => kbnStoreDetailWidth(width), boardsOf: (snapshot) => boardsOf(snapshot), boardOf: (snapshot, id) => boardOf(snapshot, id), ensureBoardWorkspace: (task) => ensureBoardWorkspace(task), createBoard: (title) => kanbanStore.createBoard(title) };\n  return {\n    inject:',
)
check_instrumented: { if (!instrumented.includes('__KANBAN_TEST__')) console.error('smoke: could not instrument bundle') }
vm.runInContext(instrumented, sandbox, { filename: 'lib/client.js' })

if (definition === null) throw new Error('smoke: bundle did not register a ModuleLoader factory')
if (definition.id !== 'dsh-workboard') throw new Error('smoke: bundle id is ' + definition.id)

const nativeUI = {
  IconFlatListOutlineRegular: () => React.createElement('svg'),
  Pill: ({ children }) => React.createElement('span', {}, children),
  Menu: ({ anchor, open, items, getAnchorRect }) => React.createElement(React.Fragment, {}, anchor,
    open && React.createElement('div', { role: 'menu', getAnchorRect }, items.map((item) => item.label || item.text))),
  Button: ({ children, icon, ...props }) => React.createElement('button', props, icon, children),
  Modal: ({ open, title, children, footer }) => open
    ? React.createElement('section', { role: 'dialog' }, title, children, footer) : null,
  SegmentedControl: ({ options, value, onChange }) => options.map((option) => React.createElement('button', {
    'aria-selected': option.value === value, onClick: () => onChange(option.value),
  }, option.label)),
}

const plugin = definition.factory((specifier) => {
  if (specifier === 'react') return React
  if (specifier === '@deepseek-ai/dsh-client-ui-primitives') return nativeUI
  throw new Error('smoke: unexpected require(' + specifier + ')')
})
if (typeof plugin.apply !== 'function') throw new Error('smoke: client half has no apply()')
if (!Array.isArray(plugin.inject)) throw new Error('smoke: client half has no inject array')

/* ------------------------------------------------------------------ fake context */
const registrations = []
const disposers = []
const localeRegistrations = []
let localeListeners = []
let currentLocale = 'zh'

const dictionaries = []
const ctx = {
  effect(callback) {
    const disposer = callback()
    if (typeof disposer === 'function') disposers.push(disposer)
    return () => {}
  },
  locale: {
    register(namespace, dicts) {
      localeRegistrations.push({ namespace, dicts })
      dictionaries.push(dicts)
      return () => {}
    },
    bind(namespace) {
      return (key, params) => {
        const messages = localeRegistrations.find((entry) => entry.namespace === namespace)
        const table = messages ? messages.dicts[currentLocale] || messages.dicts.en : {}
        let text = table[key] !== undefined ? table[key] : key
        if (params && typeof text === 'string') {
          for (const [name, value] of Object.entries(params)) text = text.split('{' + name + '}').join(String(value))
        }
        return text
      }
    },
    getLocale() {
      return { active: currentLocale }
    },
    subscribe(listener) {
      localeListeners.push(listener)
      return () => {
        localeListeners = localeListeners.filter((item) => item !== listener)
      }
    },
  },
  slots: {
    inject(key, callback) {
      const disposer = callback()
      if (typeof disposer === 'function') disposers.push(disposer)
      return () => {}
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  },
  sessions: {
    retain() {
      return {
        ready: Promise.resolve(),
        binding: {
          session: {
            async rename() { return { ok: true } },
            async prompt() { return { ok: true } },
          },
        },
        release() {},
      }
    },
  },
  uiWorkspace: {
    openSession() {},
    async connectWorkspace() { return 'session-new' },
    async archiveSession() {},
    async unarchiveSession() {},
    async pickDirectory() { return '/Users/me/new-project' },
  },
  workspaces: {
    async create() { return { workspaceId: 'ws-new', title: 'new', path: '/Users/me/new-project' } },
    async rename() { return { workspaceId: 'ws-new' } },
  },
  layout: { selectPanel() {} },
  get(name) {
    if (name === 'remote.account') {
      return {
        getProfile: async () => ({
          ok: true,
          value: {
            status: 'ready',
            value: {
              id: 'acct_1234567890abcdef',
              name: 'Kamigs',
              contact: 'user@example.com',
              avatarUrl: 'https://example.com/avatar.png',
            },
          },
        }),
      }
    }
    return undefined
  },
}

plugin.apply(ctx)

/* ------------------------------------------------------------------ assertions */
const failures = []
function check(condition, message) {
  if (!condition) failures.push(message)
}

check(styleElements.length === 1, 'expected exactly one plugin stylesheet, got ' + styleElements.length)
check((styleElements[0]?.textContent || '').length > 4000, 'stylesheet looks empty')
check(styleElements[0]?.dataset?.plugin === 'dsh-workboard', 'stylesheet dataset.plugin marker missing')
check(localeRegistrations.length === 1, 'expected one locale namespace registration')
const dicts = localeRegistrations[0]?.dicts || {}
check(localeRegistrations[0]?.namespace === 'kanban', 'locale namespace should be "kanban"')
const zhKeys = Object.keys(dicts.zh || {})
const enKeys = Object.keys(dicts.en || {})
check(zhKeys.length > 40, 'zh dictionary too small: ' + zhKeys.length)
check(zhKeys.length === enKeys.length, `locale key parity zh=${zhKeys.length} en=${enKeys.length}`)
check(zhKeys.every((key) => enKeys.includes(key)), 'zh/en keys differ: ' + zhKeys.filter((key) => !enKeys.includes(key)).slice(0, 5))

const byId = (id) => registrations.find((entry) => entry.options.id === id)
const byKey = (key) => registrations.find((entry) => entry.options.key === key)
const panelEntry = byId('kanban')
check(panelEntry !== undefined, 'sidebar.panellist entry "kanban" missing')
check(panelEntry?.options.name === 'sidebar.panellist', 'panel entry registered into the wrong slot')
check(panelEntry?.options.order === 20, 'panel entry order should be 20')
check(typeof panelEntry?.options.label === 'function', 'panel entry label must be a thunk')
const mainEntry = byKey('kanban')
check(mainEntry !== undefined, 'main panel entry "kanban" missing')
check(mainEntry?.options.name === 'main', 'main entry registered into the wrong slot')
const linkEntry = byId('kanban-task-link')
check(linkEntry !== undefined, 'session header link entry missing')
check(linkEntry?.options.name === 'conversation.session.header.utilities', 'session link registered into the wrong slot')

// Sidebar glyph.
const glyph = render(panelEntry.component, { size: 20, active: true })
check(glyph.includes('<svg'), 'sidebar glyph did not render an svg')

// Warm the store, then render the board twice (mount + after data arrives).
render(mainEntry.component, {})
await new Promise((resolve) => setTimeout(resolve, 2))
const boardOne = render(mainEntry.component, {})
await new Promise((resolve) => setTimeout(resolve, 2))
const boardTwo = render(mainEntry.component, {})
check(fetchCalls.some((url) => url.includes('/api/kanban.state')), 'board never fetched the state endpoint')
check(boardTwo.includes('实现任务看板插件'), 'board did not render the workspace task card')
check(boardTwo.includes('写归档弹窗'), 'board did not render the Done task card')
check(boardTwo.includes('待办事项'), 'board did not render the To do task card')
check(!boardTwo.includes('data-task-id="task_3"'), 'server-archived task leaked into the live board')
check(boardTwo.includes('kbn-card'), 'card class missing from board markup')
check(boardTwo.includes('kbn-col'), 'column class missing from board markup')
check(boardOne !== null, 'first board render returned nothing')

const addBoardButtons = renderedElements.filter((node) => node.type === 'button'
  && (node.props['aria-label'] === '新建看板' || renderNode(node.props.children).includes('新建看板')))
if (addBoardButtons.length !== 1) throw new Error('the populated board should have just one New board button')
addBoardButtons[0].props.onClick()
const afterAddClick = renderNode(React.createElement(mainEntry.component, {}))
check(afterAddClick.includes('kbn-project-dialog'), 'the header New board button must open the new-board form')

// Session header link renders for a linked session and hides for an unrelated one.
const linked = render(linkEntry.component, { sessionId: 'session-abc' })
check(linked.includes('aria-label="关联任务"') && !linked.includes('实现任务看板插件'), 'task menu should start collapsed')
const trigger = renderedElements.find((node) => node.props['aria-label'] === '关联任务')
let bodyBounds = { top: 80, right: 960, width: 800 }
const conversationBody = { dataset: { conversationSession: 'session-abc' }, getBoundingClientRect: () => bodyBounds }
const conversationRoot = { querySelector: (selector) => selector === '[data-conversation-content]' ? conversationBody : null }
const headerClick = { currentTarget: { closest: (selector) => selector === '[data-phase]' ? conversationRoot : null } }
trigger.props.onClick(headerClick)
const menu = renderNode(React.createElement(linkEntry.component, { sessionId: 'session-abc' }))
check(menu.includes('实现任务看板插件') && menu.includes('进行中') && !menu.includes('写归档弹窗'),
  'expanded menu should show only the linked task and its board status')
const measureAnchor = renderedElements.find((node) => node.props.role === 'menu').props.getAnchorRect
let anchor = measureAnchor()
check(anchor.x + anchor.width === 944 && anchor.y === 88 && anchor.width === 288,
  'the task menu should anchor below the tabs at the right edge of the conversation body')
bodyBounds = { top: 96, right: 400, width: 240 }
anchor = measureAnchor()
check(anchor.x === 176 && anchor.width === 208 && anchor.y === 104,
  'the open menu should follow the resized conversation and fit its width')
trigger.props.onClick(headerClick)
check(!renderNode(React.createElement(linkEntry.component, { sessionId: 'session-abc' })).includes('role="menu"'),
  'second trigger click should collapse the task menu')
const unrelated = render(linkEntry.component, { sessionId: 'session-other' })
check(unrelated === '', 'session header link rendered for an unrelated session')

// Dialogs with the fake store injected through the same module scope.
const editorRegistration = registrations.find((entry) => entry.options.name === 'main')
check(editorRegistration !== undefined, 'main registration missing')

// Exercise the exported bridge helpers directly through the bundle scope is not
// possible; the dialogs are rendered by opening them from the board's own state,
// so verify the registered components at least render while closed.
check(boardTwo.includes('kbn-head'), 'board header missing')
check(boardTwo.includes('kbn-workbench'), 'workbench layout missing')
check(boardTwo.includes('Sprint board'), 'the standalone board is missing from the board switcher')
check(boardTwo.includes('新建看板'), 'the header must offer creating a board')
check(boardTwo.lastIndexOf('新建看板') > boardTwo.indexOf('kbn-data-anchor'), 'the create-board button must be the rightmost header action')
check(boardTwo.includes('kbn-detail'), 'right-hand detail pane missing')
check(boardTwo.includes('data-status="todo"') || boardTwo.includes('data-status=todo'), 'To do column missing')
check(boardTwo.includes('data-status="doing"') || boardTwo.includes('data-status=doing'), 'Doing column missing')
check(boardTwo.includes('data-status="done"') || boardTwo.includes('data-status=done'), 'Done column missing')
check(boardTwo.includes('kbn-card-send'), 'AI card is missing the composer-style send button')
check(boardTwo.includes('kbn-detail-resizer'), 'detail pane resizer missing')
check(boardTwo.includes('role="separator"'), 'resizer must expose the separator role')
check(boardTwo.includes('aria-orientation="vertical"'), 'resizer must be a vertical separator')
check(boardTwo.includes('aria-valuemin="232"'), 'resizer minimum width is wrong')
check(boardTwo.includes('aria-valuemax="560"'), 'resizer maximum width is wrong')
check(boardTwo.includes('<svg'), 'icons did not render')

// Exposed bundle symbols (test-only instrumentation).
const test = sandbox.__KANBAN_TEST__
check(test !== undefined, 'smoke: bundle instrumentation failed')
if (test !== undefined) {
  const store = test.getStore()
  check(store !== null && store !== undefined, 'client store was not created by apply')
  await test.loadAccount()
  const boardList = test.boardsOf(store.getSnapshot())
  check(boardList.some((board) => board.bound === true), 'workspace boards must be listed')
  const unbound = test.boardOf(store.getSnapshot(), 'board_unbound')
  check(unbound !== null && unbound.bound === false, 'standalone boards must be listed as unbound')
  const createdBoard = await test.createBoard('Fresh board')
  check(createdBoard.id === 'board_new', 'createBoard did not resolve the host board')
  check(test.boardsOf(store.getSnapshot()).some((board) => board.title === 'Fresh board'), 'created board is missing from the snapshot')
  const boundTask = { id: 'task_unbound', workspaceId: 'board_unbound' }
  const boundWorkspace = await test.ensureBoardWorkspace(boundTask)
  check(boundWorkspace === 'ws-new', 'the first AI session must bind the board to a workspace')
  check(store.getSnapshot().boards.length === hostBoards.length, 'the bound board must leave the snapshot')
  check(store.getSnapshot().tasks.some((task) => task.id === 'task_unbound' && task.workspaceId === 'ws-new'), 'board tasks must migrate to the workspace')
  check(boardTwo.includes('kbn-data-anchor'), 'the header data menu anchor is missing')
check(boardTwo.includes('aria-haspopup="menu"'), 'the data trigger must advertise its menu')
check(test.currentDetailWidth() === 380, 'a remembered detail width must be restored')
  test.storeDetailWidth(420)
  check(test.readDetailWidth() === 420, 'the detail width must persist to localStorage')
  test.storeDetailWidth(null)
  check(test.readDetailWidth() === null, 'resetting the detail width must clear the stored value')

  const editorCreate = render(test.TaskEditorDialog, {
    open: true, mode: 'create', task: null, workspaceId: 'ws-a', onClose() {}, onSaved() {},
  })
  check(editorCreate.includes('kbn-dialog'), 'task editor dialog did not open')
  check(editorCreate.includes('aria-label="任务内容"'), 'task editor is missing its task content field')

  const editorEdit = render(test.TaskEditorDialog, {
    open: true, mode: 'edit', task: tasks[0], workspaceId: 'ws-a', onClose() {}, onSaved() {},
  })
  check(editorEdit.includes('实现任务看板插件'), 'task editor did not prefill the task title')
  check(editorEdit.includes('dsh'), 'task editor did not show the existing tag')
  check(editorEdit.includes('spec.md'), 'task editor did not show the attachment name')
  check(editorCreate.includes('kbn-account-card'), 'a human assignee must show the account card')
  check(editorCreate.includes('kbn-assignee-block'), 'assignee block wrapper missing')
  check(!editorCreate.includes('>负责人<'), 'the assignee labels must be gone')
  check(editorCreate.indexOf('标签') >= 0 && editorCreate.indexOf('当前账号') > editorCreate.indexOf('标签'),
    'tags must be laid out before the assignee block')
  check(editorCreate.includes('Kamigs'), 'the account card must show the account name')
  check(editorCreate.includes('acct_1…cdef'), 'the account card must show the shortened account id')
  check(editorCreate.includes('https://example.com/avatar.png'), 'the account card must show the avatar')
  check(!editorEdit.includes('kbn-account-card'), 'an AI assignee must not show the account card')
  check(!editorCreate.includes('data-icon="true"'), 'icon-less inputs must not reserve icon padding')
  check(!editorCreate.includes('aria-label="标题"'), 'task editor should only ask for content once')
  check(!editorCreate.includes('kbn-input-wrap" data-icon'), 'icon-less inputs still reserve icon padding')
  check(editorCreate.includes('data-select="true"'), 'selects must keep their own wrap marker')
  check(editorCreate.includes('data-side="right"'), 'select chevron must stay on the right')
  check(editorCreate.includes('class="kbn-date"'), 'custom date fields missing from the editor')
  check(!editorCreate.includes('type="date"'), 'native date inputs must not come back')
  const dateOpen = render(test.DateField, {
    value: '2026-11-03', onChange() {}, initiallyOpen: true,
  })
  check(dateOpen.includes('kbn-date-pop'), 'date picker panel did not open')
  check(dateOpen.includes('position:fixed'), 'the date panel must float instead of pushing the form down')
  check(dateOpen.includes('data-placement="bottom"'), 'the date panel must choose a placement')
  check((dateOpen.match(/data-iso=/g) || []).length === 42, 'date grid must be 6 weeks of 7 days')
  check(dateOpen.includes('data-selected="true"'), 'selected day is not marked')
  check(dateOpen.includes('2026-11-03'), 'selected day is missing from the grid')
  check(dateOpen.includes('kbn-date-week'), 'weekday header missing')
  check(dateOpen.includes('kbn-date-nav'), 'month navigation missing')
  check(dateOpen.includes('kbn-date-link'), 'today/clear actions missing')
  const dateClosed = render(test.DateField, { value: '', onChange() {} })
  check(dateClosed.includes('kbn-date-trigger'), 'date trigger button missing')
  check(!dateClosed.includes('kbn-date-pop'), 'date picker must start closed')
  check(editorCreate.includes('class="kbn-tag-field"'), 'tag entry must use its own inline field style')
  check(editorCreate.includes('class="kbn-textarea"'), 'description textarea missing')

  // Drop a batch past the former ten-file limit, then add one via the picker.
  const upload = store.uploadAttachment
  store.uploadAttachment = async (file) => ({ id: file.name, name: file.name, type: 'text/plain', size: 1 })
  try {
    let saved
    const task = { ...tasks[0], attachments: tasks[0].attachments.slice() }
    const props = { open: true, mode: 'edit', task, workspaceId: task.workspaceId, onSaved: (value) => { saved = value } }
    const rerender = () => {
      renderedElements.length = 0
      return renderNode(React.createElement(test.TaskEditorDialog, props))
    }
    render(test.TaskEditorDialog, props)
    const mask = renderedElements.find((node) => node.props.className === 'kbn-mask')
    const zone = renderedElements.find((node) => Object.hasOwn(node.props, 'data-file-over'))
    zone.props.ref.current = { contains: (target) => target === zone }
    const files = Array.from({ length: 12 }, (_, i) => ({ name: 'drop-' + i + '.txt' }))
    let intercepted = false
    await mask.props.onDrop({
      type: 'drop', target: zone, preventDefault() {}, stopPropagation() { intercepted = true },
      dataTransfer: { types: ['Files'], items: [], files },
    })
    rerender()
    const picker = renderedElements.find((node) => node.props.type === 'file')
    await picker.props.onChange({ currentTarget: { files: [{ name: 'picked.txt' }], value: 'picked.txt' } })
    rerender()
    const save = renderedElements.find((node) => node.type === 'button' && node.props['data-variant'] === 'primary')
    await save.props.onClick()
    const expected = [...task.attachments, ...files, { name: 'picked.txt' }].map((file) => file.name)
    check(intercepted && JSON.stringify(saved.attachments.map((file) => file.name)) === JSON.stringify(expected),
      'a multi-file drop and picker addition must save every attachment in order on the same task')
    const reopened = render(test.TaskEditorDialog, { ...props, task: saved })
    check(expected.every((name) => reopened.includes(name)), 'reopening the editor must show the whole saved batch')
  } finally {
    store.uploadAttachment = upload
  }

  const archive = render(test.ArchiveDialog, { open: true, onClose() {} })
  check(archive.includes('归档任务'), 'archive dialog did not list the archived task')
  check(archive.includes('kbn-archive'), 'archive dialog class missing')

  const detail = render(test.TaskDetailPanel, {
    task: tasks[0], workspace: workspaceA, busy: false,
    onClose() {}, onEdit() {}, onRun() {}, onOpenSession() {}, onArchive() {}, onDelete() {},
  })
  check(detail.includes('kbn-detail'), 'TaskDetailPanel class missing')
  check(detail.includes('实现任务看板插件'), 'detail pane did not show the task title')
  check(detail.includes('shot.png'), 'detail pane did not show the image attachment')
  check(detail.includes('kbn-attach-hero'), 'detail pane is missing the large image preview')
  check((detail.match(/kbn-attach-thumb"/g) || []).length >= 1, 'detail pane is missing image thumbnails')
  check((detail.match(/kbn-attach-thumb-file/g) || []).length === 2, 'non-image attachments need file thumbnails')
  check(detail.includes('/api/kanban.attachment?id=att_2'), 'detail pane image preview URL is wrong')
  check(detail.includes('session-abc'), 'detail pane did not show the linked session')
  check(detail.includes('kbn-card-send') === false, 'detail pane should not render card actions')
  check(detail.includes('kbn-detail-edit'), 'detail pane is missing the corner edit button')
  check(detail.includes('kbn-detail-head-actions'), 'detail header actions group missing')
  check(!detail.includes('>编辑<'), 'detail footer must no longer contain the edit button')
  check(detail.includes('发送到会话'), 'detail footer lost the run action')
  check(detail.indexOf('删除') < detail.indexOf('发送到会话'), 'the primary run action must be the rightmost button')
  const detailHuman = render(test.TaskDetailPanel, {
    task: Object.assign({}, tasks[1], { id: 'task_me', assignee: { kind: 'human', name: '' } }),
    workspace: workspaceA, busy: false,
    onClose() {}, onEdit() {}, onRun() {}, onOpenSession() {}, onArchive() {}, onDelete() {}, onPreview() {},
  })
  check(detailHuman.includes('kbn-account-avatar'), 'the detail pane must show the account avatar for a human assignee')
  check(detailHuman.includes('Kamigs'), 'the detail pane must show the account name')
  const detailBlank = render(test.TaskDetailPanel, {
    task: null, workspace: null, busy: false,
    onClose() {}, onEdit() {}, onRun() {}, onOpenSession() {}, onArchive() {}, onDelete() {},
  })
  check(detailBlank.includes('kbn-detail-blank'), 'detail pane blank state missing')

  const dataMenu = render(test.KbnDataMenu, { open: true, onClose() {}, onExport() {}, onImport() {} })
  check(dataMenu.includes('导出数据'), 'data menu is missing the export item')
  check(dataMenu.includes('导入数据'), 'data menu is missing the import item')
  check(dataMenu.includes('role="menu"'), 'data menu must expose the menu role')
  check(dataMenu.includes('role="menuitem"'), 'data menu items must expose the menuitem role')
  const dataMenuClosed = render(test.KbnDataMenu, { open: false, onClose() {}, onExport() {}, onImport() {} })
  check(dataMenuClosed === '', 'closed data menu must render nothing')

  const boardDialog = render(test.NewBoardDialog, { open: true, onClose() {} })
  check(boardDialog.includes('新建看板'), 'the new-board dialog is missing its title')
  check(boardDialog.includes('看板名称'), 'the new-board dialog is missing the name field')
  check(boardDialog.includes('工作目录会在第一次把 AI 任务发送到会话时再选择'), 'the new-board dialog must explain the deferred directory')

  const importPreview = render(test.KbnImportDialog, {
    state: { fileName: 'board.json', tasks: [{ title: 'A' }, { title: 'B' }], invalid: 1, workspaceTitle: 'Alpha', busy: false, progress: null, error: null },
    onCancel() {}, onConfirm() {},
  })
  check(importPreview.includes('board.json'), 'import dialog must name the picked file')
  check(importPreview.includes('2 个任务可导入'), 'import dialog must count importable tasks')
  check(importPreview.includes('Alpha'), 'import dialog must name the target project')
  const importBusy = render(test.KbnImportDialog, {
    state: { fileName: 'board.json', tasks: [{ title: 'A' }], invalid: 0, workspaceTitle: 'Alpha', busy: true, progress: { done: 1, total: 2 }, error: null },
    onCancel() {}, onConfirm() {},
  })
  check(importBusy.includes('正在导入'), 'import dialog must show progress while importing')

  const exportPayload = test.kbnExportPayload(store.getSnapshot())
  check(exportPayload.format === 'dsh-workboard' && exportPayload.version === 1, 'export document header is wrong')
  check(exportPayload.tasks.length === store.getSnapshot().tasks.length, 'export must contain every task')
  check(exportPayload.tasks.every((task) => !('sessionId' in task)), 'export must not carry session links')
  check(exportPayload.workspaces.length > 0, 'export must list the workspaces')
  check(test.kbnExportFileName().startsWith('dsh-workboard-') && test.kbnExportFileName().endsWith('.json'), 'export file name is wrong')

  const parsed = test.kbnParseImport(JSON.stringify({
    format: 'dsh-kanban', version: 1,
    tasks: [{ title: 'Imported' }, { title: 'ok', status: 'doing', tags: ['a', 'a'] }, { nope: true }],
  }))
  check(parsed.ok === true && parsed.tasks.length === 2 && parsed.invalid === 1, 'import parsing counts are wrong')
  check(parsed.tasks[1].status === 'doing' && parsed.tasks[1].tags.length === 1, 'import normalization is wrong')
  check(test.kbnParseImport('{not json').ok === false, 'broken JSON must fail to parse')
  check(test.kbnParseImport('{"tasks":"x"}').ok === false, 'non-task documents must be rejected')

  const railImage = render(test.AttachmentPreviewRail, {
    preview: { task: tasks[0], attachment: tasks[0].attachments[1] }, onClose() {},
  })
  check(railImage.includes('kbn-preview-rail'), 'image preview rail missing')
  check(railImage.includes('kbn-preview-media'), 'image preview media missing')
  check(railImage.includes('<video') === false, 'image rail rendered a video element')
  const railVideo = render(test.AttachmentPreviewRail, {
    preview: { task: tasks[0], attachment: tasks[0].attachments[2] }, onClose() {},
  })
  check(railVideo.includes('<video'), 'video attachment did not open a video player')
  check(railVideo.includes('controls'), 'video player needs controls')
  const railText = render(test.AttachmentPreviewRail, {
    preview: { task: tasks[0], attachment: tasks[0].attachments[0] }, onClose() {},
  })
  check(railText.includes('kbn-preview-text'), 'text attachment did not render a text preview')
  check(railText.includes('kbn-preview-actions'), 'preview rail is missing its download action')
  const railNone = render(test.AttachmentPreviewRail, { preview: null, onClose() {} })
  check(railNone === '', 'preview rail must render nothing without a target')

  let selectedByKeyboard = 0
  const card = render(test.TaskCard, {
    task: tasks[0], workspace: workspaceA, selected: false, busy: false,
    onSelect() { selectedByKeyboard += 1 }, onEdit() {}, onRun() {}, onOpenSession() {}, onArchive() {}, onDelete() {},
  })
  check(card.includes('实现任务看板插件'), 'TaskCard did not render its title')
  check(card.includes('kbn-card'), 'TaskCard class missing')
  check(card.includes('kbn-chip'), 'TaskCard missing chips')
  check(card.includes('kbn-card-edit'), 'edit button must sit in the card corner')
  check(card.includes('kbn-card-side'), 'corner column (edit above urgency) missing')
  check(card.includes('data-has-send="true"'), 'AI card must pin the send button')
  check(card.includes('kbn-card-send'), 'AI card send button missing')
  const article = renderedElements.find((node) => node.type === 'article')
  const edit = renderedElements.find((node) => node.props.className === 'kbn-card-edit')
  for (const key of ['Enter', ' ']) {
    let prevented = false
    const event = { key, target: edit, currentTarget: article, preventDefault() { prevented = true } }
    article.props.onKeyDown(event)
    check(!prevented && selectedByKeyboard === 0, 'card must leave nested button activation to the browser')
    article.props.onKeyDown({ ...event, target: article })
    check(prevented && selectedByKeyboard === 1, 'a focused card must still select on ' + key)
    selectedByKeyboard = 0
  }
  const humanCard = render(test.TaskCard, {
    task: Object.assign({}, tasks[1], { id: 'task_me', assignee: { kind: 'human', name: '' } }),
    workspace: workspaceA, selected: false, busy: false,
    onEdit() {}, onRun() {}, onOpenSession() {}, onArchive() {}, onDelete() {},
  })
  check(humanCard.includes('kbn-account-avatar'), 'the human card must show the account avatar')
  check(humanCard.includes('https://example.com/avatar.png'), 'the human card avatar URL is wrong')
  check(humanCard.includes('Kamigs'), 'the human card must show the account name')
  const doneCard = render(test.TaskCard, {
    task: tasks[1], workspace: workspaceA, selected: false, busy: false,
    onEdit() {}, onRun() {}, onOpenSession() {}, onArchive() {}, onDelete() {},
  })
  check(!doneCard.includes('kbn-card-send'), 'Done cards must not offer run-in-session')
  check(doneCard.includes('kbn-card-edit'), 'Done cards still need the corner edit button')

  // Data layer: every mutation path updates the snapshot from the host reply.
  const before = store.getSnapshot().tasks.length
  const created = await store.createTask('ws-a', { title: '新任务' })
  check(created && created.id === 'task_new', 'createTask did not resolve the host task')
  check(store.getSnapshot().tasks.length === before + 1, 'createTask did not update the snapshot')
  const updated = await store.updateTask('task_new', { status: 'done', priority: 'urgent' })
  check(updated && updated.status === 'done', 'updateTask did not apply the patch')
  check(store.getSnapshot().tasks.find((task) => task.id === 'task_new')?.priority === 'urgent', 'updateTask snapshot mismatch')
  await store.moveTask('task_new', 'doing')
  check(store.getSnapshot().tasks.find((task) => task.id === 'task_new')?.status === 'doing', 'moveTask did not update status')
  const linkedTask = await store.linkSession('task_new', 'session-xyz')
  check(linkedTask && linkedTask.sessionId === 'session-xyz', 'linkSession did not update the task')
  const archivedTask = await store.archiveTask('task_new')
  check(archivedTask && archivedTask.archived === true, 'archiveTask did not archive')
  const restoredTask = await store.restoreTask('task_new')
  check(restoredTask && restoredTask.archived === false, 'restoreTask did not restore')
  await store.deleteTask('task_new')
  check(store.getSnapshot().tasks.every((task) => task.id !== 'task_new'), 'deleteTask left the task behind')
  check(store.attachmentUrl('att_1').includes('kanban.attachment'), 'attachmentUrl is wrong')
  const importedCount = store.getSnapshot().tasks.length
  const importResult = await test.kbnImportTasks(store, 'ws-a', [{ title: 'Imported task' }])
  check(importResult.created === 1 && importResult.failed === 0, 'import executor did not create the task')
  check(store.getSnapshot().tasks.length === importedCount + 1, 'imported task is missing from the snapshot')
  check(fetchCalls.some((url) => url.includes('/api/kanban.task.create')), 'createTask did not call the host route')

  hostBoards = []
  hostWorkspaces = []
  await store.refresh()
  const orphanBoard = render(mainEntry.component, {})
  check(orphanBoard.includes('还没有看板'), 'tasks left behind by removed workspaces must render the empty board state')
}

/* ------------------------------------------------------------------ report */
if (failures.length > 0) {
  console.error('smoke: FAIL')
  for (const failure of failures) console.error('  - ' + failure)
  process.exit(1)
}
console.log(`smoke: ok (${registrations.length} slot entries, ${zhKeys.length} locale keys, ${fetchCalls.length} fetches)`)
