/**
 * Unit tests for the Kanban host store (`host/store.js`).
 *
 * Each test owns a fresh temporary data directory under `os.tmpdir()`; the
 * directory and any open store are torn down in `finally`.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  MAX_TITLE_LENGTH,
  createStore,
} from '../host/store.js'

/**
 * Run one test body with a fresh store and temporary data directory.
 * @param {(store: import('../host/store.js').KanbanStore, dir: string) => Promise<void>} body
 */
async function withStore(body) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-workboard-store-'))
  const store = createStore({ dataDir: dir })
  try {
    await body(store, dir)
  } finally {
    await store.close()
    await rm(dir, { recursive: true, force: true })
  }
}

/**
 * Assert a promise rejects with one machine code.
 * @param {Promise<unknown>} promise
 * @param {string} code
 */
async function rejectsWithCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code)
    assert.ok(error instanceof Error)
    assert.ok(error.message.length > 0)
    return true
  })
}

test('create applies defaults and the contract task shape', async () => {
  await withStore(async (store) => {
    const task = await store.create('ws-1', { title: '  First task  ' })
    assert.match(task.id, /^task_[a-z0-9]+$/)
    assert.deepEqual(Object.keys(task).sort(), [
      'archived',
      'archivedAt',
      'assignee',
      'attachments',
      'createdAt',
      'description',
      'dueDate',
      'id',
      'order',
      'priority',
      'sessionId',
      'startDate',
      'status',
      'tags',
      'title',
      'updatedAt',
      'workspaceId',
    ])
    assert.equal(task.workspaceId, 'ws-1')
    assert.equal(task.title, 'First task')
    assert.equal(task.description, '')
    assert.equal(task.status, 'todo')
    assert.equal(task.startDate, null)
    assert.equal(task.dueDate, null)
    assert.equal(task.priority, 'medium')
    assert.deepEqual(task.tags, [])
    assert.deepEqual(task.attachments, [])
    assert.deepEqual(task.assignee, { kind: 'ai', name: 'AI' })
    assert.equal(task.sessionId, null)
    assert.equal(task.archived, false)
    assert.equal(task.archivedAt, null)
    assert.equal(task.order, 0)
    assert.equal(new Date(task.createdAt).toISOString(), task.createdAt)
    assert.equal(new Date(task.updatedAt).toISOString(), task.updatedAt)

    const second = await store.create('ws-1', { title: 'Second' })
    assert.equal(second.order, 1)
    assert.notEqual(second.id, task.id)

    const explicit = await store.create('ws-2', {
      title: 'Explicit',
      description: 'details',
      status: 'doing',
      startDate: '2026-01-02',
      dueDate: '2026-01-31',
      priority: 'urgent',
      tags: [' one ', 'one', 'two'],
      assignee: { kind: 'human', name: '  Ada  ' },
    })
    assert.equal(explicit.status, 'doing')
    assert.equal(explicit.order, 0)
    assert.deepEqual(explicit.tags, ['one', 'two'])
    assert.deepEqual(explicit.assignee, { kind: 'human', name: 'Ada' })
    assert.equal(explicit.startDate, '2026-01-02')
    assert.equal(explicit.dueDate, '2026-01-31')
    assert.equal(explicit.priority, 'urgent')
  })
})

test('create rejects invalid fields with machine codes', async () => {
  await withStore(async (store) => {
    await rejectsWithCode(store.create('ws-1', { title: '   ' }), 'kanban/invalid-title')
    await rejectsWithCode(store.create('ws-1', { title: 'x'.repeat(MAX_TITLE_LENGTH + 1) }), 'kanban/invalid-title')
    await rejectsWithCode(store.create('ws-1', { title: 'ok', status: 'later' }), 'kanban/invalid-status')
    await rejectsWithCode(store.create('ws-1', { title: 'ok', priority: 'critical' }), 'kanban/invalid-priority')
    await rejectsWithCode(store.create('ws-1', { title: 'ok', startDate: '2026-02-30' }), 'kanban/invalid-date')
    await rejectsWithCode(store.create('ws-1', { title: 'ok', dueDate: '2026/01/01' }), 'kanban/invalid-date')
    await rejectsWithCode(
      store.create('ws-1', { title: 'ok', tags: Array.from({ length: 13 }, (_, index) => `tag${index}`) }),
      'kanban/invalid-tags',
    )
    await rejectsWithCode(store.create('ws-1', { title: 'ok', tags: ['fine', '   '] }), 'kanban/invalid-tags')
    await rejectsWithCode(store.create('ws-1', { title: 'ok', description: 'x'.repeat(20001) }), 'kanban/invalid-description')
    await rejectsWithCode(store.create('ws-1', { title: 'ok', assignee: { kind: 'robot' } }), 'kanban/invalid-assignee')
    await rejectsWithCode(store.create('ws-1', { title: 'ok', attachments: [{ id: 'a' }] }), 'kanban/invalid-attachments')
    await rejectsWithCode(store.create('', { title: 'ok' }), 'kanban/invalid-workspace')
    await rejectsWithCode(store.create('ws-1', 'not-an-object'), 'kanban/invalid-input')
    assert.deepEqual(await store.list(), [])
  })
})

test('update patches known fields and ignores unknown keys', async () => {
  await withStore(async (store) => {
    const created = await store.create('ws-1', { title: 'Original', tags: ['a'] })
    const updated = await store.update(created.id, {
      title: '  Renamed  ',
      description: 'new body',
      priority: 'high',
      dueDate: '2026-03-04',
      tags: [' b ', 'b', 'c'],
      unknownKey: 'ignored',
      createdAt: '1999-01-01T00:00:00.000Z',
    })
    assert.equal(updated.title, 'Renamed')
    assert.equal(updated.description, 'new body')
    assert.equal(updated.priority, 'high')
    assert.equal(updated.dueDate, '2026-03-04')
    assert.deepEqual(updated.tags, ['b', 'c'])
    assert.equal(updated.createdAt, created.createdAt)
    assert.ok(Date.parse(updated.updatedAt) >= Date.parse(created.updatedAt))

    await rejectsWithCode(store.update(created.id, { title: '' }), 'kanban/invalid-title')
    await rejectsWithCode(store.update('task_missing', { title: 'x' }), 'kanban/task-not-found')
  })
})

test('state persists across store instances', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-workboard-store-'))
  try {
    const first = createStore({ dataDir: dir })
    const alpha = await first.create('ws-1', { title: 'Alpha', status: 'doing' })
    const beta = await first.create('ws-1', { title: 'Beta', tags: ['t'], priority: 'low' })
    await first.close()

    const raw = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'))
    assert.equal(raw.version, 1)
    assert.equal(raw.tasks.length, 2)

    const second = createStore({ dataDir: dir })
    assert.deepEqual(await second.list(), [alpha, beta])
    await second.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('concurrent creates all persist with unique ids', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-workboard-store-'))
  try {
    const store = createStore({ dataDir: dir })
    const created = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.create('ws-1', { title: `Task ${index}` })))
    const ids = new Set(created.map((task) => task.id))
    assert.equal(ids.size, 20)
    assert.equal(created.length, 20)
    const listed = await store.list()
    assert.equal(listed.length, 20)
    assert.deepEqual(new Set(listed.map((task) => task.id)), ids)
    assert.deepEqual(listed.map((task) => task.order), Array.from({ length: 20 }, (_, index) => index))
    await store.close()

    const reopened = createStore({ dataDir: dir })
    const persisted = await reopened.list()
    assert.equal(persisted.length, 20)
    assert.deepEqual(new Set(persisted.map((task) => task.id)), ids)
    await reopened.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('move reorders inside a column and across columns', async () => {
  await withStore(async (store) => {
    const a = await store.create('ws-1', { title: 'A' })
    const b = await store.create('ws-1', { title: 'B' })
    const c = await store.create('ws-1', { title: 'C' })

    const column = (tasks, status) => tasks
      .filter((task) => task.status === status)
      .sort((left, right) => left.order - right.order)
      .map((task) => task.title)

    let tasks = await store.move(c.id, 'todo', a.id)
    assert.deepEqual(column(tasks, 'todo'), ['C', 'A', 'B'])
    assert.deepEqual(column(tasks, 'todo').length, 3)
    assert.deepEqual(tasks.filter((task) => task.status === 'todo').map((task) => task.order).sort(), [0, 1, 2])

    // Unknown anchor appends to the target column.
    tasks = await store.move(b.id, 'todo', 'task_missing')
    assert.deepEqual(column(tasks, 'todo'), ['C', 'A', 'B'])

    // Across columns: A leaves todo for the empty doing column.
    tasks = await store.move(a.id, 'doing')
    assert.deepEqual(column(tasks, 'todo'), ['C', 'B'])
    assert.deepEqual(column(tasks, 'doing'), ['A'])
    assert.deepEqual(tasks.filter((task) => task.status === 'todo').map((task) => task.order).sort(), [0, 1])

    // Across columns before an existing card.
    const d = await store.create('ws-1', { title: 'D', status: 'doing' })
    tasks = await store.move(c.id, 'doing', d.id)
    assert.deepEqual(column(tasks, 'doing'), ['A', 'C', 'D'])
    assert.deepEqual(column(tasks, 'doing').length, 3)

    // update(status) also relocates and re-densifies.
    const updated = await store.update(b.id, { status: 'done' })
    assert.equal(updated.status, 'done')
    assert.equal(updated.order, 0)
    await rejectsWithCode(store.move('task_missing', 'todo'), 'kanban/task-not-found')
    await rejectsWithCode(store.move(a.id, 'later'), 'kanban/invalid-status')
  })
})

test('archive and restore flip flags and timestamps', async () => {
  await withStore(async (store) => {
    const task = await store.create('ws-1', { title: 'Archivable' })
    const archived = await store.archive(task.id)
    assert.equal(archived.archived, true)
    assert.equal(new Date(archived.archivedAt).toISOString(), archived.archivedAt)
    assert.ok(Date.parse(archived.updatedAt) >= Date.parse(task.updatedAt))

    const restored = await store.restore(task.id)
    assert.equal(restored.archived, false)
    assert.equal(restored.archivedAt, null)
    assert.ok(Date.parse(restored.updatedAt) >= Date.parse(archived.updatedAt))

    // Archived tasks stay in `list()` and survive a restart.
    await store.archive(task.id)
    const listed = await store.list()
    assert.equal(listed.length, 1)
    assert.equal(listed[0].archived, true)

    await rejectsWithCode(store.archive('task_missing'), 'kanban/task-not-found')
    await rejectsWithCode(store.restore('task_missing'), 'kanban/task-not-found')
  })
})

test('remove drops the task, its attachments, and compacts the column', async () => {
  await withStore(async (store) => {
    const attachment = await store.saveAttachment({
      name: 'notes.txt',
      type: 'text/plain',
      dataBase64: Buffer.from('hello world').toString('base64'),
    })
    const a = await store.create('ws-1', { title: 'A' })
    const b = await store.create('ws-1', { title: 'B', attachments: [attachment] })
    const c = await store.create('ws-1', { title: 'C' })

    await store.remove(b.id)
    const tasks = await store.list()
    assert.deepEqual(tasks.map((task) => task.title), ['A', 'C'])
    assert.deepEqual(tasks.filter((task) => task.status === 'todo').map((task) => task.order).sort(), [0, 1])
    await rejectsWithCode(store.readAttachment(attachment.id), 'kanban/attachment-not-found')
    await rejectsWithCode(store.remove(b.id), 'kanban/task-not-found')
    assert.notEqual(a.id, c.id)
  })
})

test('tasks share a session within one workspace and keep independent links', async () => {
  await withStore(async (store) => {
    const task = await store.create('ws-1', { title: 'Linked' })
    const linked = await store.link(task.id, 'session-42')
    assert.equal(linked.sessionId, 'session-42')
    const other = await store.create('ws-1', { title: 'Other task' })
    assert.equal((await store.link(other.id, 'session-42')).sessionId, 'session-42')
    const created = await store.create('ws-1', { title: 'From session', sessionId: 'session-42' })
    assert.equal(created.sessionId, 'session-42')
    const outside = await store.create('ws-2', { title: 'Outside workspace' })
    await rejectsWithCode(store.link(outside.id, 'session-42'), 'kanban/session-conflict')
    await rejectsWithCode(store.update(outside.id, { sessionId: 'session-42' }), 'kanban/session-conflict')
    await rejectsWithCode(store.create('ws-2', { title: 'Rejected', sessionId: 'session-42' }), 'kanban/session-conflict')
    await rejectsWithCode(store.link(task.id, 'replacement', null), 'kanban/session-conflict')
    const cleared = await store.link(task.id, null, 'session-42')
    assert.equal(cleared.sessionId, null)
    assert.deepEqual((await store.list()).filter((t) => t.sessionId === 'session-42').map((t) => t.id), [other.id, created.id])
    assert.equal((await store.list()).length, 4)
    await rejectsWithCode(store.link(task.id, 42), 'kanban/invalid-session')
    await rejectsWithCode(store.link('task_missing', null), 'kanban/task-not-found')
  })
})

test('attachments round-trip, stay uncapped, and follow the workspace', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-workboard-store-'))
  const workspace = await mkdtemp(join(tmpdir(), 'dsh-workboard-workspace-'))
  try {
    const store = createStore({
      dataDir: dir,
      resolveWorkspacePath: (workspaceId) => (workspaceId === 'ws-attach' ? workspace : undefined),
    })
    const payload = Buffer.from('attachment payload', 'utf8')
    const meta = await store.saveAttachment({
      name: '../../unsafe?.txt',
      type: 'text/plain',
      dataBase64: payload.toString('base64'),
      workspaceId: 'ws-attach',
    })
    assert.match(meta.id, /^att_[a-z0-9]+$/)
    assert.equal(meta.name, 'unsafe.txt')
    assert.equal(meta.size, payload.length)
    assert.equal(meta.type, 'text/plain')

    const read = await store.readAttachment(meta.id)
    assert.deepEqual(read.bytes, payload)
    assert.deepEqual(read.meta, { name: 'unsafe.txt', type: 'text/plain', size: payload.length })

    // The workspace owns the bytes: `<workspace>/.dsh/assets/kanban/<id>-<name>`.
    const stored = join(workspace, '.dsh', 'assets', 'kanban', meta.id + '-unsafe.txt')
    assert.deepEqual(await readFile(stored), payload)

    await rejectsWithCode(
      store.saveAttachment({ name: 'bad.txt', dataBase64: 'not-base64!!' }),
      'kanban/invalid-attachment-data',
    )
    // No plugin-level size limit: a payload larger than the old 15 MiB cap is fine.
    const large = Buffer.alloc(15 * 1024 * 1024 + 1, 7)
    const largeMeta = await store.saveAttachment({
      name: 'large.bin',
      type: 'application/octet-stream',
      dataBase64: large.toString('base64'),
      workspaceId: 'ws-attach',
    })
    // An unknown workspace keeps the bytes in the plugin data directory.
    const fallbackMeta = await store.saveAttachment({
      name: 'fallback.txt',
      dataBase64: Buffer.from('x').toString('base64'),
      workspaceId: 'ws-missing',
    })
    assert.equal(fallbackMeta.size, 1)
    assert.equal(largeMeta.size, large.length)
    assert.deepEqual((await store.readAttachment(largeMeta.id)).bytes.subarray(0, 3), Buffer.from([7, 7, 7]))
    await store.close()

    // The sidecar index makes the download work before any task references it.
    const reopened = createStore({ dataDir: dir })
    const afterRestart = await reopened.readAttachment(meta.id)
    assert.deepEqual(afterRestart.bytes, payload)
    await reopened.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
    await rm(workspace, { recursive: true, force: true })
  }
})

test('standalone boards can be created and bound to a workspace', async () => {
  await withStore(async (store) => {
    assert.deepEqual(await store.listBoards(), [])
    const board = await store.createBoard('  Sprint 1  ')
    assert.match(board.id, /^board_[a-z0-9]+$/)
    assert.equal(board.title, 'Sprint 1')
    assert.deepEqual(await store.listBoards(), [board])

    const inBoard = await store.create(board.id, { title: 'Board task' })
    const bound = await store.bindBoard(board.id, 'workspace-uuid')
    assert.equal(bound.migrated, 1)
    assert.deepEqual(await store.listBoards(), [])
    const tasks = await store.list()
    assert.equal(tasks[0].workspaceId, 'workspace-uuid')
    assert.equal(tasks[0].id, inBoard.id)

    await rejectsWithCode(store.bindBoard('board_missing', 'workspace-uuid'), 'kanban/board-not-found')
    await rejectsWithCode(store.bindBoard(board.id, 'workspace-uuid'), 'kanban/board-not-found')
    await rejectsWithCode(store.createBoard('   '), 'kanban/invalid-title')
  })
})

test('a corrupt state file is quarantined and the store starts empty', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-workboard-store-'))
  try {
    const store = createStore({ dataDir: dir })
    await store.create('ws-1', { title: 'Will be lost' })
    await store.close()

    await writeFile(join(dir, 'state.json'), '{ this is not json', 'utf8')
    const corrupted = createStore({ dataDir: dir })
    assert.deepEqual(await corrupted.list(), [])
    const backups = (await readdir(dir)).filter((name) => name.startsWith('state.json.corrupt-'))
    assert.equal(backups.length, 1)
    await corrupted.close()

    // A structurally invalid state document is quarantined the same way.
    await writeFile(join(dir, 'state.json'), JSON.stringify({ version: 2, tasks: [] }), 'utf8')
    const invalid = createStore({ dataDir: dir })
    assert.deepEqual(await invalid.list(), [])
    assert.equal((await readdir(dir)).filter((name) => name.startsWith('state.json.corrupt-')).length, 2)
    assert.deepEqual(await invalid.list(), [])
    await invalid.close()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('failed state writes preserve boards, tasks, ordering and attachment bytes', async () => {
  await withStore(async (store, dir) => {
    const board = await store.createBoard('Unbound')
    const file = await store.saveAttachment({ name: 'notes.txt', dataBase64: 'aGVsbG8=' })
    const task = await store.create(board.id, { title: 'Keep', attachments: [file] })
    await store.create(board.id, { title: 'Sibling' })
    const before = await store.list()
    const stateFile = store.stateFile
    store.stateFile = store.attachmentsDir // Publishing over a directory always fails.
    for (const change of [
      () => store.create(board.id, { title: 'Rejected' }),
      () => store.update(task.id, { title: 'Rejected edit', status: 'doing' }),
      () => store.move(task.id, 'done'),
      () => store.link(task.id, 'rejected-session'),
      () => store.archive(task.id),
      () => store.createBoard('Rejected board'),
      () => store.bindBoard(board.id, 'ws-new'),
      () => store.remove(task.id),
    ]) {
      await assert.rejects(change(), { code: 'EISDIR' })
      assert.deepEqual(await store.list(), before)
      assert.deepEqual(await store.listBoards(), [board])
      assert.equal((await store.readAttachment(file.id)).bytes.toString(), 'hello')
    }
    store.stateFile = stateFile
    const valid = await store.create(board.id, { title: 'Accepted' })
    const reopened = createStore({ dataDir: dir })
    try {
      assert.deepEqual(await reopened.list(), [...before, valid])
      assert.deepEqual(await reopened.listBoards(), [board])
      assert.equal((await reopened.readAttachment(file.id)).bytes.toString(), 'hello')
    } finally {
      await reopened.close()
    }
  })
})

test('failed upload index write discards the unpublished file', async () => {
  await withStore(async (store) => {
    await store.ready()
    store.attachmentIndexFile = store.attachmentsDir
    await assert.rejects(store.saveAttachment({ name: 'x.txt', dataBase64: 'eA==' }), { code: 'EISDIR' })
    assert.deepEqual(await readdir(store.attachmentsDir), [])
    await rejectsWithCode(store.readAttachment('att_1'), 'kanban/attachment-not-found')
  })
})
