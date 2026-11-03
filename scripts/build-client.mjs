/**
 * Build the browser half: concatenate the ordered plugin parts into one
 * `window.__ModuleLoader__.load({ id, factory })` bundle. The Harness client
 * module table provides React and the DSH UI primitives.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PARTS = [
  '00-prelude.js',
  '05-l10n.js',
  '10-style-base.js',
  '12-style-board.js',
  '20-api.js',
  '25-store.js',
  '30-icons.js',
  '35-widgets.js',
  '36-date-field.js',
  '37-account.js',
  '40-card.js',
  '45-task-editor.js',
  '50-archive-modal.js',
  '55-board.js',
  '58-attachment-preview.js',
  '59-data-transfer.js',
  '60-session-bridge.js',
  '65-settings.js',
  '90-entry.js',
]

const chunks = PARTS.map((name) => {
  const file = join(root, 'src/client/parts', name)
  const code = readFileSync(file, 'utf8')
  return `/* ---- ${name} ---- */\n${code}`
})

const bundle = `window.__ModuleLoader__.load({
  id: 'dsh-workboard',
  factory: (require) => {
${chunks.join('\n\n')}
  },
});
`

mkdirSync(join(root, 'lib'), { recursive: true })
writeFileSync(join(root, 'lib/client.js'), bundle)
console.log(`built lib/client.js (${Buffer.byteLength(bundle, 'utf8')} bytes, ${PARTS.length} parts)`)
