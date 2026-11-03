import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/client/parts/60-session-bridge.js', import.meta.url), 'utf8')

function bridgeFixture({ fail, status = 'todo', linked = false } = {}) {
  const calls = []
  const toasts = []
  const prompts = []
  const task = { id: 'task_1', workspaceId: 'ws', title: 'Test', status, sessionId: linked ? 'linked' : null }
  const workspace = { id: 'ws', bound: true, title: 'Test', path: '/project' }
  const record = (step) => {
    calls.push(step)
    if (step === fail) throw new Error(step + ' failed')
  }
  const session = {
    async rename() { record('rename') },
    async prompt(parts, mode) {
      assert.equal(mode, 'queue')
      assert.match(parts.at(-1).text, /Test/)
      prompts.push(structuredClone(parts))
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
        openSession() { record('open') },
      },
      workspaces: { list: { getSnapshot: () => ({ items: [{ workspaceId: 'ws', sessionIds: ['current', 'linked'] }], archivedSessionIds: [] }) } },
      sessions: {
        list: { getSnapshot: () => ({ byId: {
          current: { retainedBy: { mainView: 1 }, displayTitle: 'My session' },
          linked: { displayTitle: 'Linked session' },
        } }) },
        async create() { record('connect'); return 's1' },
        retain: () => ({ ready: Promise.resolve(), binding: { session }, release: () => record('release') }),
      },
    },
    attachmentUrl: (id) => '/api/kanban.attachment?id=' + id,
    async linkSession(id, sessionId) { record('link'); task.sessionId = sessionId; return task },
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
  vm.runInContext(readFileSync(new URL('../src/client/parts/45-task-editor.js', import.meta.url), 'utf8'), bridge)
  vm.runInContext(source, bridge)
  return { run: (destination = 'new', mode = 'execute') => bridge.dispatchTask(task, destination, mode), task, calls, toasts, prompts, store, bridge, record }
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

test('discussion in the current session preserves its name and leaves the card in To do', async () => {
  const { run, task, calls, bridge } = bridgeFixture()
  assert.equal(await run('current', 'discuss'), 'current')
  assert.deepEqual(calls, ['link', 'prompt', 'release', 'open'])
  assert.equal(task.status, 'todo')
  const brief = bridge.buildTaskBrief(task, null, 'discuss')
  assert.match(brief, /bridge.prompt.discuss/)
  assert.doesNotMatch(brief, /bridge.prompt.request/)
})

test('a destination outside the workspace cannot receive a prompt', async () => {
  const { run, calls } = bridgeFixture()
  await assert.rejects(run('other', 'execute'), /send.unavailable/)
  assert.deepEqual(calls, [])
})

test('all three destinations honor both send modes and keep completion manual', async () => {
  for (const destination of ['new', 'current', 'linked']) {
    for (const mode of ['discuss', 'execute']) {
      for (const status of ['todo', 'doing']) {
        const { run, task, calls, prompts } = bridgeFixture({ status, linked: destination === 'linked' })
        const sessionId = destination === 'new' ? 's1' : destination
        assert.equal(await run(destination, mode), sessionId)
        assert.equal(task.sessionId, sessionId)
        assert.equal(task.status, mode === 'execute' ? 'doing' : status)
        assert.equal(prompts.length, 1)
        assert.match(prompts[0].at(-1).text, new RegExp(mode === 'discuss' ? 'bridge.prompt.discuss' : 'bridge.prompt.request'))
        assert.equal(calls.includes('rename'), destination === 'new')
        assert.equal(calls.includes('connect'), destination === 'new')
        assert.equal(calls.filter((call) => call === 'move').length, mode === 'execute' && status === 'todo' ? 1 : 0)
        assert.equal(calls.at(-1), 'open')
      }
    }
  }
})

test('a mixed attachment batch is sent in one prompt with a receipt scoped to its destination', async () => {
  for (const [destination, mode] of [['new', 'execute'], ['current', 'discuss']]) {
    const { run, task, bridge, store, prompts } = bridgeFixture()
    const sessionId = destination === 'new' ? 's1' : destination
    const png = { id: 'board-image', name: '截图.png', type: 'image/png' }
    const txt = { id: 'board-file', name: '验收.txt', type: 'text/plain' }
    task.attachments = [txt, png]
    bridge.fetch = async (url) => url === store.attachmentUrl(txt.id)
      ? new Response('file bytes')
      : new Response(Buffer.from([0, 255, 1]), { headers: { 'content-type': png.type } })
    bridge.kanbanReadFileBase64 = async (blob) => Buffer.from(await blob.arrayBuffer()).toString('base64')
    store.ctx.fileUpload = { async upload(target, blob, name) {
      assert.equal(target, sessionId)
      assert.equal(name, txt.name)
      assert.equal(await blob.text(), 'file bytes')
      return { ok: true, value: { receiptId: 'session-receipt' } }
    } }
    const brief = bridge.buildTaskBrief(task, { title: 'Test', path: '/project' }, mode)
    await run(destination, mode)
    assert.equal(prompts.length, 1)
    assert.deepEqual(prompts[0], [
      { type: 'file', receiptId: 'session-receipt' },
      { type: 'image', name: png.name, mediaType: png.type, data: 'AP8B' },
      { type: 'text', text: brief },
    ])
  }
})

test('an unreadable attachment or rejected file upload prevents the entire prompt', async () => {
  for (const failure of ['read', 'upload']) {
    const { run, task, bridge, store, prompts, calls } = bridgeFixture()
    task.attachments = [{ id: 'a', name: 'first.txt' }, { id: 'b', name: 'second.txt' }]
    bridge.fetch = async (url) => new Response('bytes', {
      status: failure === 'read' && url === store.attachmentUrl('b') ? 404 : 200,
    })
    store.ctx.fileUpload = { async upload(target, blob, name) {
      return failure === 'upload' && name === 'second.txt'
        ? { ok: false, error: { message: 'stage failed' } }
        : { ok: true, value: { receiptId: 'receipt' } }
    } }
    await assert.rejects(run(), /bridge.error.attachment.*second\.txt/)
    assert.equal(prompts.length, 0)
    assert.equal(task.status, 'todo')
    assert.ok(!calls.includes('move'))
  }
})

test('single-field task content survives reopening and is sent once', () => {
  const { bridge, task } = bridgeFixture()
  for (const text of ['Only a title', 'Heading\nA detailed paragraph.\n\nSecond paragraph.',
    'Heading\n\n    code block', 'Heading\nHeading\nDetails', '长'.repeat(205)]) {
    const fields = bridge.taskContentFields(text)
    assert.ok(fields.title.length <= 200)
    assert.equal(bridge.taskContentText(fields), text)
    assert.equal(bridge.buildTaskBrief({ ...task, ...fields }, null, 'execute').split(text).length, 2)
  }
  assert.equal(bridge.taskContentText({ title: 'Old title', description: 'Old body' }), 'Old title\nOld body')
})
