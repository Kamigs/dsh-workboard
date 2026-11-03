/**
 * Host-route smoke test: registers the real `/api/kanban.*` handlers through a
 * fake Connection registry, then drives them with real `Request` objects —
 * create, update, move, archive, restore, link, upload, download, delete and
 * the state snapshot, plus error paths. Authentication itself belongs to the
 * Connection service and is not exercised here.
 */
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL('..', import.meta.url))
const { createStore } = await import(pathToFileURL(path.join(root, 'host/store.js')).href)
const { registerKanbanRoutes } = await import(pathToFileURL(path.join(root, 'host/routes.js')).href)

const dataDir = await mkdtemp(path.join(tmpdir(), 'kanban-routes-'))
const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'kanban-workspaces-'))
const alphaPath = path.join(workspaceRoot, 'alpha')
const betaPath = path.join(workspaceRoot, 'beta')
await mkdir(alphaPath, { recursive: true })
await mkdir(betaPath, { recursive: true })
const routes = new Map()
const disposers = []
const ctx = {
  effect(callback) {
    const disposer = callback()
    if (typeof disposer === 'function') disposers.push(disposer)
  },
  connection: {
    fetch: {
      register(route) {
        routes.set(route.path + ' ' + route.methods.join(','), route)
        return () => routes.delete(route.path)
      },
    },
  },
  workspaceRegistry: {
    list: () => [
      { id: 'ws-a', title: 'Alpha', path: alphaPath },
      { id: 'ws-b', title: 'Beta', path: betaPath },
    ],
    get: (id) => (id === 'ws-a'
      ? { id: 'ws-a', title: 'Alpha', path: alphaPath }
      : id === 'ws-b'
        ? { id: 'ws-b', title: 'Beta', path: betaPath }
        : undefined),
  },
}

const store = createStore({
  dataDir,
  resolveWorkspacePath: (id) => (id === 'ws-a' ? alphaPath : id === 'ws-b' ? betaPath : undefined),
})
registerKanbanRoutes(ctx, store)

const failures = []
function check(condition, message) {
  if (!condition) failures.push(message)
}
function routeFor(pathname, method) {
  for (const route of routes.values()) {
    if (route.path === pathname && route.methods.includes(method)) return route
  }
  throw new Error('no route for ' + method + ' ' + pathname)
}
async function call(pathname, method = 'POST', body) {
  const init = { method, headers: {} }
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const response = await routeFor(pathname, method).fetch(new Request('http://127.0.0.1:1234' + pathname, init))
  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: response.status, headers: response.headers, json, text, bytes: response }
}

check(routes.size === 16, 'expected 16 registered routes, got ' + routes.size)

// state
const state0 = await call('/api/kanban.state', 'GET')
check(state0.status === 200, 'state status ' + state0.status)
check(state0.json.ok === true, 'state not ok')
check(state0.json.workspaces.length === 2, 'state workspaces wrong')
check(Array.isArray(state0.json.boards) && state0.json.boards.length === 0, 'state boards wrong')
check(state0.json.workspaces[0].id === 'ws-a' && state0.json.workspaces[0].title === 'Alpha', 'workspace projection wrong')
check(state0.headers.get('cache-control') === 'no-store', 'state must be no-store')

// Global notes and completion history use the authenticated route table.
check(state0.json.notes.length === 0 && state0.json.completions.length === 0, 'empty home data wrong')
const noteResult = await call('/api/kanban.note.create', 'POST', { input: { content: 'A note', color: 'blue' } })
check(noteResult.status === 200 && noteResult.json.note.color === 'blue', 'note create failed')
const noteId = noteResult.json.note.id
const noteEdit = await call('/api/kanban.note.update', 'POST', { id: noteId, input: { content: 'Edited', color: 'mint' } })
check(noteEdit.json.note.content === 'Edited', 'note update failed')
const invalidNote = await call('/api/kanban.note.create', 'POST', { input: { content: '' } })
check(invalidNote.status === 400, 'invalid note must return 400')
await call('/api/kanban.note.delete', 'POST', { id: noteId })
check((await call('/api/kanban.state', 'GET')).json.notes.length === 0, 'note delete failed')

// create
const created = await call('/api/kanban.task.create', 'POST', {
  workspaceId: 'ws-a',
  input: { title: '路由冒烟', priority: 'urgent', tags: ['a', 'b'], dueDate: '2026-12-31' },
})
check(created.status === 200 && created.json.ok === true, 'create failed: ' + created.text)
const task = created.json.task
check(task.id.startsWith('task_'), 'task id shape wrong: ' + task.id)
check(task.status === 'todo' && task.priority === 'urgent', 'create defaults wrong')
check(task.workspaceId === 'ws-a', 'create workspace wrong')

// validation
const bad = await call('/api/kanban.task.create', 'POST', { workspaceId: 'ws-a', input: { title: '' } })
check(bad.status === 400 && bad.json.ok === false, 'empty title must be 400, got ' + bad.status + ' ' + bad.text)
check(typeof bad.json.error === 'string' && !bad.json.error.includes('at '), 'error must be a message, not a stack')
const badJson = await routeFor('/api/kanban.task.create', 'POST').fetch(new Request('http://127.0.0.1:1234/api/kanban.task.create', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope',
}))
check(badJson.status === 400, 'broken JSON must be 400, got ' + badJson.status)

// update
const updated = await call('/api/kanban.task.update', 'POST', { id: task.id, patch: { status: 'doing', description: 'x' } })
check(updated.json.task.status === 'doing', 'update did not apply')
// move
const moved = await call('/api/kanban.task.move', 'POST', { id: task.id, status: 'done' })
check(moved.json.ok === true && moved.json.tasks.some((item) => item.id === task.id && item.status === 'done'), 'move failed')
// archive + restore
const archived = await call('/api/kanban.task.archive', 'POST', { id: task.id })
check(archived.json.task.archived === true, 'archive failed')
const restored = await call('/api/kanban.task.restore', 'POST', { id: task.id })
check(restored.json.task.archived === false, 'restore failed')
// link
const linked = await call('/api/kanban.task.link', 'POST', { id: task.id, sessionId: 'session-1' })
check(linked.json.task.sessionId === 'session-1', 'link failed')
// upload + download
const payload = Buffer.from('hello kanban').toString('base64')
const uploaded = await call('/api/kanban.attachment.upload', 'POST', {
  name: 'note.txt', type: 'text/plain', data: payload, workspaceId: 'ws-a',
})
check(uploaded.json.ok === true && uploaded.json.attachment.name === 'note.txt', 'upload failed: ' + uploaded.text)
const attachmentId = uploaded.json.attachment.id
const download = await routeFor('/api/kanban.attachment', 'GET').fetch(new Request('http://127.0.0.1:1234/api/kanban.attachment?id=' + encodeURIComponent(attachmentId)))
const downloaded = Buffer.from(await download.arrayBuffer()).toString('utf8')
check(download.status === 200 && downloaded === 'hello kanban', 'download wrong: ' + download.status + ' ' + downloaded)
const assetDir = path.join(alphaPath, '.dsh', 'assets', 'kanban')
const assetFiles = await readdir(assetDir).catch(() => [])
check(assetFiles.length === 1 && assetFiles[0].endsWith('-note.txt'), 'attachment was not stored in the workspace .dsh/assets/kanban: ' + assetFiles.join(','))
check((download.headers.get('content-disposition') || '').includes('attachment'), 'download needs content-disposition')
const duplicate = await call('/api/kanban.task.create', 'POST', { workspaceId: 'ws-a', input: { title: '待删除' } })
check(duplicate.status === 200, 'second create failed')
// unknown id paths
for (const [pathname, body] of [
  ['/api/kanban.task.update', { id: 'task_missing', patch: { title: 'x' } }],
  ['/api/kanban.task.archive', { id: 'task_missing' }],
  ['/api/kanban.task.restore', { id: 'task_missing' }],
  ['/api/kanban.task.link', { id: 'task_missing', sessionId: null }],
]) {
  const result = await call(pathname, 'POST', body)
  check(result.status === 404, pathname + ' unknown id must be 404, got ' + result.status)
}
// standalone board: create, add a task, bind it to a workspace
const board = await call('/api/kanban.board.create', 'POST', { title: 'Sprint board' })
check(board.status === 200 && board.json.ok === true && /^board_/.test(board.json.board.id), 'board create failed: ' + board.text)
const boardId = board.json.board.id
const boardTask = await call('/api/kanban.task.create', 'POST', { workspaceId: boardId, input: { title: 'Board task' } })
check(boardTask.status === 200, 'task in standalone board failed: ' + boardTask.text)
const stateWithBoard = await call('/api/kanban.state', 'GET')
check(stateWithBoard.json.boards.length === 1 && stateWithBoard.json.boards[0].title === 'Sprint board', 'standalone board not listed')
for (const id of [boardId, 'ws-a']) {
  const renamed = await call('/api/kanban.board.rename', 'POST', { boardId: id, title: '  Renamed  ' })
  check(renamed.status === 200 && renamed.json.board.title === 'Renamed', 'rename failed for ' + id)
}
const renamedState = (await call('/api/kanban.state', 'GET')).json
check(renamedState.boards[0].id === boardId && renamedState.boards[0].title === 'Renamed', 'standalone rename lost')
const ws = renamedState.workspaces.find((item) => item.id === 'ws-a')
check(ws.boardTitle === 'Renamed' && ws.title === stateWithBoard.json.workspaces.find((item) => item.id === ws.id).title, 'workspace identity changed')
check(JSON.stringify(renamedState.tasks) === JSON.stringify(stateWithBoard.json.tasks), 'rename changed task data')
const reopened = createStore({ dataDir })
check((await reopened.workspaceBoards([{ id: ws.id, title: ws.title }]))[0].boardTitle === 'Renamed', 'alias lost after restart')
await reopened.close()
check((await call('/api/kanban.board.rename', 'POST', { boardId, title: '  ' })).status === 400, 'blank rename accepted')
check((await call('/api/kanban.board.rename', 'POST', { boardId: 'missing', title: 'X' })).status === 404, 'unknown board accepted')
const bound = await call('/api/kanban.board.bind', 'POST', { boardId, workspaceId: 'ws-b' })
check(bound.status === 200 && bound.json.migrated === 1, 'board bind failed: ' + bound.text)
const stateAfterBind = await call('/api/kanban.state', 'GET')
check(stateAfterBind.json.boards.length === 0, 'bound board was not removed')
check(stateAfterBind.json.tasks.some((item) => item.workspaceId === 'ws-b' && item.title === 'Board task'), 'board task was not migrated')
await call('/api/kanban.task.delete', 'POST', { id: boardTask.json.task.id })

// delete
const view = await call('/api/kanban.task.delete', 'POST', { id: duplicate.json.task.id })
check(view.status === 200 && view.json.ok === true, 'delete failed')
const finalState = await call('/api/kanban.state', 'GET')
check(finalState.json.tasks.filter((item) => item.archived === false).length === 1, 'final live task count wrong')

// persisted file is real, atomic and readable
const persisted = JSON.parse(await readFile(path.join(dataDir, 'state.json'), 'utf8'))
check(persisted.version === 1 && persisted.tasks.length === 1, 'state.json not persisted')
check(persisted.tasks[0].tags.length === 2, 'persisted task lost tags')

await store.close()
for (const disposer of disposers) await disposer()
await rm(dataDir, { recursive: true, force: true })
await rm(workspaceRoot, { recursive: true, force: true })

if (failures.length > 0) {
  console.error('host routes smoke: FAIL')
  for (const failure of failures) console.error('  - ' + failure)
  process.exit(1)
}
console.log(`host routes smoke: ok (${routes.size} routes, state.json persisted, error paths checked)`)
