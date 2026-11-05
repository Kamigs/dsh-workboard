import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { createStore } from '../host/store.js'

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), 'workboard-boards-'))
  const store = createStore({ dataDir: dir })
  try { await run(store, dir) } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
}

test('mixed board order survives restart, adds new boards and rejects missing targets', async () => {
  await fixture(async (store, dir) => {
    const a = await store.createBoard('A')
    const b = await store.createBoard('B')
    const workspaces = ['ws-1', 'ws-2']
    assert.deepEqual(await store.moveBoard(b.id, 'ws-1', workspaces), [b.id, ...workspaces, a.id])
    const c = await store.createBoard('C')
    assert.deepEqual(await store.moveBoard('ws-2', null, workspaces), [b.id, 'ws-1', a.id, c.id, 'ws-2'])
    const saved = await store.getBoardOrder()
    await assert.rejects(store.moveBoard(a.id, 'missing', workspaces), { code: 'kanban/board-not-found' })
    assert.deepEqual(await store.getBoardOrder(), saved)
    const reopened = createStore({ dataDir: dir })
    try { assert.deepEqual(await reopened.getBoardOrder(), saved) } finally { await reopened.close() }
  })
})

test('bind and unbind preserve names, tasks, archive, attachments, history and board position', async () => {
  await fixture(async (store, dir) => {
    const board = await store.createBoard('Sprint')
    const attachment = await store.saveAttachment({ name: 'idea.txt', dataBase64: Buffer.from('keep').toString('base64') })
    const task = await store.create(board.id, { title: 'Keep task', attachments: [attachment], status: 'done' })
    const existing = await store.create('ws-1', { title: 'Existing task' })
    await store.moveBoard(board.id, 'ws-1', ['ws-1', 'ws-2'])
    await store.bindBoard(board.id, 'ws-1')
    assert.deepEqual(await store.getBoardOrder(), ['ws-1', 'ws-2'])
    assert.equal((await store.workspaceBoards([{ id: 'ws-1', title: 'Workspace' }]))[0].boardTitle, 'Sprint')
    await store.link(task.id, 'session-1')
    await store.archive(task.id)
    const before = await store.list()
    const history = await store.homeData()
    const detached = await store.unbindBoard({ id: 'ws-1', title: 'Workspace' })
    assert.equal(detached.board.title, 'Sprint')
    assert.equal(detached.migrated, 2)
    const after = await store.list()
    assert.deepEqual(after.map(({ workspaceId, sessionId, updatedAt, ...rest }) => rest), before.map(({ workspaceId, sessionId, updatedAt, ...rest }) => rest))
    assert.ok(after.every((item) => item.workspaceId === detached.board.id && item.sessionId === null))
    assert.equal(after.find((item) => item.id === task.id).archived, true)
    assert.ok(after.some((item) => item.id === existing.id))
    assert.deepEqual(await store.homeData(), history)
    assert.equal((await store.readAttachment(attachment.id)).bytes.toString(), 'keep')
    assert.deepEqual(await store.getBoardOrder(), [detached.board.id, 'ws-2', 'ws-1'])
    const reopened = createStore({ dataDir: dir })
    try {
      assert.deepEqual(await reopened.listBoards(), [detached.board])
      assert.deepEqual(await reopened.list(), after)
    } finally { await reopened.close() }
  })
})

test('failed ordering and unbinding writes leave all published data unchanged', async () => {
  await fixture(async (store, dir) => {
    const task = await store.create('ws-1', { title: 'Keep linked task', sessionId: 'session-1' })
    const board = await store.createBoard('Other board')
    await store.moveBoard(board.id, 'ws-1', ['ws-1'])
    const order = await store.getBoardOrder()
    const file = store.stateFile
    store.stateFile = dir
    try {
      await assert.rejects(store.unbindBoard({ id: 'ws-1', title: 'Workspace' }))
      await assert.rejects(store.moveBoard('ws-1', board.id, ['ws-1']))
      assert.deepEqual(await store.list(), [task])
      assert.deepEqual(await store.listBoards(), [board])
      assert.deepEqual(await store.getBoardOrder(), order)
    } finally { store.stateFile = file }
  })
})

test('client follows binding identity in one snapshot and retains data after failed moves', async () => {
  const source = await readFile(new URL('../src/client/parts/25-store.js', import.meta.url), 'utf8')
  let fail = false
  let remembered = 'board_1'
  let body = { workspaces: [{ id: 'ws-1', title: 'Workspace' }], boards: [{ id: 'board_1', title: 'Sprint' }], tasks: [{ id: 'task_1', workspaceId: 'board_1' }], boardOrder: ['board_1', 'ws-1'] }
  const ctx = vm.createContext({
    apiGet: async () => body,
    apiPost: async (path) => {
      if (fail) throw Error('write failed')
      if (path.endsWith('.move')) return { boardOrder: ['ws-1', 'board_1'] }
      return body
    },
    kbnLastWorkspaceId: remembered, kbnRememberBoard: (id) => { remembered = id },
    t: (key) => key, setTimeout, clearTimeout,
  })
  vm.runInContext(source, ctx)
  const store = ctx.createKanbanStore({})
  await store.refresh()
  store.openBoard('board_1')
  await store.moveBoard('ws-1', 'board_1')
  assert.equal(ctx.boardsOf(store.getSnapshot())[0].id, 'ws-1')
  body = { ...body, boards: [], tasks: [{ id: 'task_1', workspaceId: 'ws-1' }], boardOrder: ['ws-1'] }
  const snapshots = []
  store.subscribe(() => snapshots.push(store.getSnapshot()))
  await store.bindBoard('board_1', 'ws-1')
  assert.equal(remembered, 'ws-1')
  assert.ok(snapshots.every((s) => s.boardId === 'ws-1' && s.tasks[0].workspaceId === 'ws-1'))
  body = { ...body, board: { id: 'board_2', title: 'Sprint' }, boards: [{ id: 'board_2', title: 'Sprint' }], tasks: [{ id: 'task_1', workspaceId: 'board_2', sessionId: null }] }
  await store.unbindBoard('ws-1')
  assert.equal(store.getSnapshot().boardId, 'board_2')
  const snapshot = store.getSnapshot()
  fail = true
  await assert.rejects(store.moveBoard('board_2', null), /write failed/)
  assert.equal(store.getSnapshot(), snapshot)
  store.dispose()
})
