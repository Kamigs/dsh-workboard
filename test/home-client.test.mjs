import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/client/parts/25-store.js', import.meta.url), 'utf8')
const note = { id: 'note-1', content: 'Original idea', color: 'yellow' }

function fixture(apiPost, storage = new Map()) {
  const context = vm.createContext({
    apiGet: async () => ({ notes: [{ ...note }] }), apiPost,
    setTimeout, clearTimeout, kbnRememberBoard() {},
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  })
  vm.runInContext(source, context)
  return context.createKanbanStore({})
}

test('note saves serialize without replacing newer typing and finish after leaving home', async () => {
  const requests = []
  const store = fixture((path, body) => new Promise((resolve) => requests.push({ path, body, resolve })))
  await store.refresh()
  store.editNote(note.id, { content: 'First edit' })
  const first = store.flushNote(note.id)
  await Promise.resolve()
  await Promise.resolve()
  store.editNote(note.id, { content: 'Second edit', color: 'pink' })
  const second = store.flushNote(note.id)
  store.openBoard('board-1')
  assert.equal(requests.length, 1)
  requests[0].resolve({ note: { ...note, ...requests[0].body.input } })
  await first
  assert.equal(store.getSnapshot().noteEdits[note.id].content, 'Second edit')
  await Promise.resolve()
  assert.equal(requests.length, 2)
  requests[1].resolve({ note: { ...note, ...requests[1].body.input } })
  await second
  assert.equal(store.getSnapshot().notes[0].content, 'Second edit')
  assert.equal(store.getSnapshot().notes[0].color, 'pink')
  assert.equal(store.getSnapshot().noteEdits[note.id], undefined)
  assert.equal(store.getSnapshot().boardId, 'board-1')
  store.openHome()
  assert.equal(store.getSnapshot().boardId, null)
  store.dispose()
})

test('failed edits and composer drafts survive reload and retry without losing content', async () => {
  const storage = new Map()
  const store = fixture(async () => { throw Error('disk full') }, storage)
  await store.refresh()
  store.setNoteDraft({ content: 'Unsubmitted thought', color: 'blue' })
  store.editNote(note.id, { content: 'Keep this revision' })
  await assert.rejects(store.flushNote(note.id), /disk full/)
  assert.equal(store.getSnapshot().noteStatus[note.id], 'error')
  store.dispose()
  const reopened = fixture(async (path, { input }) => ({ note: { ...note, ...input } }), storage)
  await reopened.refresh()
  assert.equal(reopened.getSnapshot().noteDraft.content, 'Unsubmitted thought')
  assert.equal(reopened.getSnapshot().noteEdits[note.id].content, 'Keep this revision')
  await reopened.flushNote(note.id)
  assert.equal(reopened.getSnapshot().notes[0].content, 'Keep this revision')
  assert.equal(reopened.getSnapshot().noteStatus[note.id], 'saved')
  reopened.dispose()
})

test('blank edits never overwrite saved notes; a rejected deletion preserves them', async () => {
  let calls = 0
  const store = fixture(async () => { calls++; throw Error('write failed') })
  await store.refresh()
  store.editNote(note.id, { content: '  ' })
  await store.flushNote(note.id)
  assert.equal(calls, 0)
  assert.equal(store.getSnapshot().notes[0].content, note.content)
  assert.equal(store.getSnapshot().noteStatus[note.id], 'empty')
  await assert.rejects(store.deleteNote(note.id), /write failed/)
  assert.equal(store.getSnapshot().notes.length, 1)
  store.dispose()
})
