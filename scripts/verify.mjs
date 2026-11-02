/** Static checks that need no running Harness: bundle wrapper, exports, syntax. */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fail = (message) => { console.error('FAIL ' + message); process.exitCode = 1 }

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
for (const [key, target] of Object.entries(manifest.exports)) {
  if (key === './package.json') continue
  if (typeof target !== 'string') continue
  // Subpath patterns (e.g. "./locale/*.json") are not literal files; check their directory.
  if (target.includes('*')) {
    const dir = join(root, target.slice(0, target.lastIndexOf('/')))
    if (!existsSync(dir)) fail(`exports ${key} -> missing directory ${dir}`)
    continue
  }
  if (!existsSync(join(root, target))) fail(`exports ${key} -> missing ${target}`)
}
if (manifest.dsh?.client?.platform !== 'web') fail('dsh.client.platform must be web')
if (!manifest.dsh?.bundle?.patch) fail('dsh.bundle.patch missing')

const clientPath = join(root, manifest.exports['./client'])
if (existsSync(clientPath)) {
  const source = readFileSync(clientPath, 'utf8')
  if (!source.startsWith('window.__ModuleLoader__.load(')) fail('client bundle has no ModuleLoader wrapper')
  if (!source.includes("id: 'dsh-workboard'")) fail('client bundle id mismatch')
  if (source.includes('.kbn-input-wrap .kbn-input')) {
    fail('blanket icon padding rule for .kbn-input is back (icon-less inputs get 34px blank space)')
  }
  if (!source.includes('.kbn-input-wrap[data-icon=true] .kbn-input')) {
    fail('input icon padding rule is missing')
  }
  if (source.includes('color-mix(in srgb, var(--kbn-col-tone, var(--dsw-alias-bg-layer-1))')) {
    fail('status-tinted card surfaces are back: status must only be a left accent')
  }
  if (source.includes("type: 'date'")) {
    fail('native date input is back: the unthemeable browser calendar must not be used')
  }
  if (!source.includes('.kbn-date-pop')) {
    fail('custom date picker styles are missing')
  }
  if (!source.includes('.kbn-attach-hero') || !source.includes('.kbn-preview-rail')) {
    fail('attachment preview surfaces (image hero + right rail) are missing')
  }
  try {
    new vm.Script(source)
  } catch (error) {
    fail('client bundle is not parseable: ' + error.message)
  }
}

// Host half must be importable and expose the function-plugin shape.
const host = await import(join(root, manifest.main))
if (typeof host.apply !== 'function') fail('host half has no apply()')
if (!Array.isArray(host.inject)) fail('host half has no inject array')
if (host.Config !== undefined && typeof host.Config !== 'function' && typeof host.Config !== 'object') {
  fail('host half Config export is neither a schema nor an object')
}
if (typeof host.name !== 'string' || host.name === '') fail('host half has no name export')

for (const locale of ['en', 'zh']) {
  const dict = JSON.parse(readFileSync(join(root, 'locale', locale + '.json'), 'utf8'))
  if (!dict?.meta?.title || !dict?.meta?.description) fail(`locale/${locale}.json lacks meta.title/description`)
}
if (!existsSync(join(root, 'icon.svg'))) fail('icon.svg missing')
for (const required of ['index.js', 'host/store.js', 'host/routes.js', 'lib/client.js', 'cordis.patch.yml', 'LICENSE', 'README.md']) {
  if (!existsSync(join(root, required))) fail(`missing distribution file ${required}`)
}
if (manifest.license !== 'MIT') fail('package.json license must be MIT')
if (typeof manifest.repository?.url !== 'string' || !manifest.repository.url.includes('github')) {
  fail('package.json repository.url must point at the GitHub repo')
}
for (const included of ['lib/client.js', 'host', 'locale/*.json', 'icon.svg', 'cordis.patch.yml']) {
  if (!Array.isArray(manifest.files) || !manifest.files.includes(included)) {
    fail(`package.json files is missing ${included}`)
  }
}
if (!process.exitCode) console.log('verify: ok')
