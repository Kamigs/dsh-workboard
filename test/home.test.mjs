import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vm from 'node:vm'
import { createStore } from '../host/store.js'

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'workboard-home-'))
  const store = createStore({ dataDir: dir })
  try { await fn(store, dir) } finally { await store.close(); await rm(dir, { recursive: true, force: true }) }
}

test('notes persist independently of boards, validate content and survive concurrent task writes', async () => {
  await fixture(async (store, dir) => {
    const [note] = await Promise.all([
      store.createNote({ content: '灵感\n第二行', color: 'mint' }),
      store.create('ws-1', { title: 'A task' }),
    ])
    assert.equal((await store.homeData()).notes.length, 1)
    const updated = await store.updateNote(note.id, { content: '保留换行\n和颜色', color: 'purple' })
    const reopened = createStore({ dataDir: dir })
    assert.deepEqual((await reopened.homeData()).notes, [updated])
    await reopened.close()
    await assert.rejects(store.createNote({ content: '  ' }), { code: 'kanban/invalid-note' })
    await assert.rejects(store.createNote({ content: 'x'.repeat(4001) }), { code: 'kanban/invalid-note' })
    await assert.rejects(store.updateNote(note.id, { content: 'x', color: 'red' }), { code: 'kanban/invalid-note-color' })
    await assert.rejects(store.updateNote('missing', { content: 'x' }), { code: 'kanban/note-not-found' })
    await store.deleteNote(note.id)
    assert.equal((await store.homeData()).notes.length, 0)
    assert.equal((await store.list()).length, 1)
  })
})

test('completion history records only transitions and survives task archival, deletion and restart', async () => {
  await fixture(async (store, dir) => {
    const task = await store.create('ws-1', { title: 'Complete me' })
    await store.move(task.id, 'done')
    const first = (await store.homeData()).completions
    assert.equal(first.length, 1)
    await store.update(task.id, { title: 'Edited after completion' })
    await store.move(task.id, 'done')
    assert.deepEqual((await store.homeData()).completions, first)
    await store.move(task.id, 'doing')
    await store.update(task.id, { status: 'done' })
    assert.equal((await store.homeData()).completions.length, 2)
    await store.archive(task.id)
    await store.remove(task.id)
    const reopened = createStore({ dataDir: dir })
    assert.equal((await reopened.homeData()).completions.length, 2)
    const next = await reopened.create('ws-1', { title: 'New task', status: 'done' })
    assert.notEqual(next.id, task.id)
    assert.equal((await reopened.homeData()).completions.length, 3)
    await reopened.close()
  })
})

test('legacy completed tasks are preserved without invented completion dates', async () => {
  await fixture(async (store, dir) => {
    const task = await store.create('ws-1', { title: 'Legacy', status: 'done' })
    await store.close()
    await writeFile(join(dir, 'state.json'), JSON.stringify({ version: 1, tasks: [task] }))
    const reopened = createStore({ dataDir: dir })
    assert.deepEqual(await reopened.homeData(), { notes: [], completions: [] })
    assert.equal((await reopened.list())[0].status, 'done')
    await reopened.close()
  })
})

test('a failed disk write publishes neither an edited note nor a completion', async () => {
  await fixture(async (store, dir) => {
    const note = await store.createNote({ content: 'Keep this' })
    const task = await store.create('ws-1', { title: 'Keep todo' })
    const original = store.stateFile
    store.stateFile = dir // Atomic rename to a directory fails.
    await assert.rejects(store.updateNote(note.id, { content: 'Not saved' }))
    await assert.rejects(store.move(task.id, 'done'))
    assert.deepEqual((await store.homeData()).notes, [note])
    assert.deepEqual((await store.homeData()).completions, [])
    assert.equal((await store.list())[0].status, 'todo')
    store.stateFile = original
  })
})

test('heatmap groups by local calendar date and counts each task once per day', async () => {
  const source = await readFile(new URL('../src/client/parts/56-home.js', import.meta.url), 'utf8')
  const ctx = vm.createContext({ addDict() {}, addStyle() {}, pad2: (n) => String(n).padStart(2, '0'), parseDay: (s) => new Date(s + 'T00:00:00') })
  vm.runInContext(source, ctx)
  const data = [
    { taskId: 'a', at: '2026-11-03T10:00:00' },
    { taskId: 'a', at: '2026-11-03T15:00:00' },
    { taskId: 'b', at: '2026-11-03T12:00:00' },
    { taskId: 'a', at: '2026-11-02T12:00:00' },
  ]
  const days = ctx.kbnHeatmap(data, '2026-11-03')
  assert.equal(days.length, 364)
  assert.equal(days[0].date.getDay(), 1)
  assert.equal(days.find((day) => day.day === '2026-11-03').count, 2)
  assert.equal(days.find((day) => day.day === '2026-11-02').count, 1)
  assert.ok(days.filter((day) => day.day > '2026-11-03').every((day) => day.future))
})

test('heatmap always contains 52 local calendar weeks and excludes older history', async () => {
  const source = await readFile(new URL('../src/client/parts/56-home.js', import.meta.url), 'utf8')
  const ctx = vm.createContext({ addDict() {}, addStyle() {}, pad2: (n) => String(n).padStart(2, '0'), parseDay: (s) => new Date(s + 'T00:00:00') })
  vm.runInContext(source, ctx)
  for (const today of ['2026-11-03', '2026-01-01', '2024-02-29']) {
    const end = new Date(today + 'T00:00:00')
    const start = new Date(end)
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 51 * 7)
    const beforeStart = new Date(start)
    beforeStart.setDate(beforeStart.getDate() - 1)
    const history = [
      { taskId: 'excluded', at: beforeStart.toISOString() },
      { taskId: 'first-day', at: start.toISOString() },
      { taskId: 'today', at: end.toISOString() },
    ]
    const days = ctx.kbnHeatmap(history, today)
    assert.equal(days.length, 52 * 7)
    assert.equal(days[0].date.getDay(), 1)
    assert.equal(days[0].date.getTime(), start.getTime())
    assert.equal(days.at(-1).date.getDay(), 0)
    assert.ok(days.slice(-7).some((day) => day.day === today))
    assert.equal(days.reduce((sum, day) => sum + day.count, 0), 2)
    for (let index = 1; index < days.length; index++) {
      const previous = new Date(days[index - 1].date)
      previous.setDate(previous.getDate() + 1)
      assert.equal(days[index].date.getTime(), previous.getTime())
    }
  }
})
