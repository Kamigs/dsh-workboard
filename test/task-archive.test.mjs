import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../src/client/parts/25-store.js', import.meta.url), 'utf8')

for (const archived of [true, false]) {
  const operation = archived ? 'archive' : 'restore'
  for (const outcome of ['success', 'lost response', 'write failure']) {
    test(operation + ' affects only the requested task after ' + outcome, async () => {
      const task = { id: 'card', sessionId: 'shared', archived: !archived }
      const sibling = { id: 'other', sessionId: 'shared', archived: false }
      const calls = []
      const context = vm.createContext({
        apiGet: async () => ({ tasks: [{ ...task }, { ...sibling }] }),
        async apiPost(path, { id }) {
          calls.push([path, id])
          if (outcome === 'write failure') throw Error(outcome)
          task.archived = archived
          if (outcome === 'lost response') throw Error(outcome)
          return { task: { ...task } }
        },
      })
      vm.runInContext(source, context)
      const store = context.createKanbanStore({})
      await store.refresh()
      const result = archived ? store.archiveTask(task.id) : store.restoreTask(task.id)
      if (outcome === 'write failure') await assert.rejects(result, /write failure/)
      else assert.equal((await result).archived, archived)
      assert.deepEqual(calls, [['/api/kanban.task.' + operation, task.id]])
      assert.deepEqual(store.getSnapshot().tasks, [task, sibling])
    })
  }
}
