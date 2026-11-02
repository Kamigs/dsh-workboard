import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/client/parts/60-session-bridge.js', import.meta.url), 'utf8')

function bridgeFixture({ fail, status = 'todo' } = {}) {
  const calls = []
  const toasts = []
  const task = { id: 'task_1', workspaceId: 'ws', title: 'Test', status, sessionId: null }
  const workspace = { id: 'ws', bound: true, title: 'Test', path: '/project' }
  const record = (step) => {
    calls.push(step)
    if (step === fail) throw new Error(step + ' failed')
  }
  const session = {
    async rename() { record('rename') },
    async prompt(parts, mode) {
      assert.equal(mode, 'queue')
      assert.match(parts[0].text, /Test/)
      if (fail === 'prompt') {
        calls.push('prompt')
        return { ok: false, error: { message: 'prompt failed' } }
      }
      record('prompt')
      return { ok: true }
    },
  }
  const store = {
    getSnapshot: () => ({ tasks: [task] }),
    ctx: {
      uiWorkspace: {
        async connectWorkspace() { record('connect'); return 's1' },
        openSession() { record('open') },
      },
      sessions: {
        retain: () => ({ ready: Promise.resolve(), binding: { session }, release: () => record('release') }),
      },
    },
    async linkSession(id, sessionId) { record('link'); task.sessionId = sessionId },
    async moveTask(id, status) { record('move'); task.status = status },
    toast: (message) => toasts.push(message),
  }
  const bridge = vm.createContext({
    kanbanStore: store,
    taskById: (snapshot, id) => snapshot.tasks.find((entry) => entry.id === id) ?? null,
    workspaceOf: () => workspace,
    boardOf: () => workspace,
    messageOf: (error) => error.message,
    t: (key, params) => [key, ...Object.values(params ?? {})].join(' '),
    addDict() {},
    addStyle() {},
  })
  vm.runInContext(source, bridge)
  return { run: () => bridge.runTaskInNewSession(task), task, calls, toasts, store, bridge, record }
}

test('a rejected link stops dispatch before the first prompt', async () => {
  const { run, task, calls } = bridgeFixture({ fail: 'link' })
  await assert.rejects(run(), /bridge.error.link.*link failed/)
  assert.deepEqual(calls, ['connect', 'link'])
  assert.equal(task.status, 'todo')
})

test('a rejected prompt leaves the linked card in To do', async () => {
  const { run, task, calls } = bridgeFixture({ fail: 'prompt' })
  await assert.rejects(run(), /bridge.error.prompt.*prompt failed/)
  assert.deepEqual(calls, ['connect', 'link', 'rename', 'prompt', 'release'])
  assert.equal(task.sessionId, 's1')
  assert.equal(task.status, 'todo')
})

test('a move failure after dispatch reports partial success on the board', async () => {
  const { run, task, calls, toasts } = bridgeFixture({ fail: 'move' })
  assert.equal(await run(), 's1')
  assert.deepEqual(calls, ['connect', 'link', 'rename', 'prompt', 'release', 'move'])
  assert.equal(task.sessionId, 's1')
  assert.equal(task.status, 'todo')
  assert.match(toasts[0], /bridge.error.move.*move failed/)
})

test('successful dispatch advances a To do card and then opens the session', async () => {
  const { run, task, calls } = bridgeFixture()
  assert.equal(await run(), 's1')
  assert.deepEqual(calls, ['connect', 'link', 'rename', 'prompt', 'release', 'move', 'open'])
  assert.equal(task.status, 'doing')
})

function archiveFixture(target, { cardFails, sessionFails, lostReply, readFails, undoFails, initialSessionState = !target } = {}) {
  const { store, bridge, task, calls } = bridgeFixture()
  task.sessionId = 's1'
  task.archived = !target
  let sessionArchived = initialSessionState
  let snapshotStatus = 'ready'
  const changeSession = async (value) => {
    calls.push(value ? 'archiveSession' : 'restoreSession')
    if (value === target && sessionFails) throw new Error('session refused')
    if (value !== target && undoFails) throw new Error('undo refused')
    sessionArchived = value
  }
  store.ctx.workspaces = { list: { getSnapshot: () => ({ archivedSessionIds: sessionArchived ? ['s1'] : [] }) } }
  store.ctx.uiWorkspace.archiveSession = () => changeSession(true)
  store.ctx.uiWorkspace.unarchiveSession = () => changeSession(false)
  store.archiveTask = store.restoreTask = async () => {
    calls.push('card')
    if (cardFails) throw new Error('write failed')
    task.archived = target
    if (lostReply) throw new Error('reply lost')
    return task
  }
  store.refresh = async () => { calls.push('refresh'); snapshotStatus = readFails ? 'error' : 'ready' }
  store.getSnapshot = () => ({ status: snapshotStatus, tasks: [task] })
  return { change: () => bridge.setTaskArchivedWithSession(task, target), task, calls, sessionState: () => sessionArchived }
}

for (const target of [true, false]) {
  const operation = target ? 'archive' : 'restore'
  test(operation + ' leaves the card available for retry if the session refuses', async () => {
    const f = archiveFixture(target, { sessionFails: true })
    await assert.rejects(f.change(), /session refused/)
    assert.equal(f.calls.length, 1)
    assert.equal(f.task.archived, !target)
  })
  test(operation + ' compensates only after confirming a failed card write', async () => {
    const f = archiveFixture(target, { cardFails: true })
    await assert.rejects(f.change(), /write failed/)
    assert.equal(f.sessionState(), !target)
    assert.deepEqual(f.calls, [target ? 'archiveSession' : 'restoreSession', 'card', 'refresh', target ? 'restoreSession' : 'archiveSession'])
  })
  test(operation + ' recognizes a committed card after a lost response', async () => {
    const f = archiveFixture(target, { lostReply: true })
    assert.equal((await f.change()).archived, target)
    assert.equal(f.sessionState(), target)
    assert.equal(f.calls.length, 3)
  })
  test(operation + ' reports an unconfirmed card or a failed rollback', async () => {
    const unreadable = archiveFixture(target, { cardFails: true, readFails: true })
    await assert.rejects(unreadable.change(), /bridge.error.unconfirmed/)
    assert.equal(unreadable.calls.length, 3)
    const failedUndo = archiveFixture(target, { cardFails: true, undoFails: true })
    await assert.rejects(failedUndo.change(), /bridge.error.rollback.*write failed.*undo refused/)
  })
  test(operation + ' preserves an independently changed session on card failure', async () => {
    const f = archiveFixture(target, { cardFails: true, initialSessionState: target })
    await assert.rejects(f.change(), /write failed/)
    assert.equal(f.sessionState(), target)
    assert.equal(f.calls.length, 3)
  })
  test(operation + ' handles linked and unlinked cards', async () => {
    const linked = archiveFixture(target)
    assert.equal((await linked.change()).archived, target)
    assert.equal(linked.sessionState(), target)
    const unlinked = archiveFixture(target)
    unlinked.task.sessionId = null
    assert.equal((await unlinked.change()).archived, target)
    assert.deepEqual(unlinked.calls, ['card'])
  })
}
