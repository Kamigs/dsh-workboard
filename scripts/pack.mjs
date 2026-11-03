/** Build a distributable bundle and test an offline installation of its bytes. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = join(root, 'dist')
const scratch = mkdtempSync(join(tmpdir(), 'workboard-package-'))
const npm = process.env.npm_execpath
assert.ok(npm, 'Run this script with npm run pack')

function run(command, args, cwd = root, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    // Keep the install and npm cache outside the real DSH profile and repo.
    env: { ...process.env, npm_config_cache: join(scratch, 'npm-cache') },
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed`)
  return result.stdout
}

try {
  mkdirSync(output, { recursive: true })
  // `npm run pack` already ran its prepack lifecycle. Avoid running it twice
  // and keep lifecycle output out of the JSON returned by the nested npm pack.
  const [packed] = JSON.parse(run(process.execPath, [
    npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', output,
  ], root, true))
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.equal(packed.name, manifest.name)
  assert.equal(packed.version, manifest.version)
  const files = packed.files.map(({ path }) => path)
  for (const file of files) {
    assert.ok(!/^(src|scripts|test|\.github|node_modules|dist|\.git|\.dsh)\//.test(file), `Development or local data in package: ${file}`)
    assert.ok(!/(^|\/)\.env(?:\.|$)|\.tgz$/.test(file), `Local artifact in package: ${file}`)
  }

  const tarball = join(output, packed.filename)
  const installDir = join(scratch, 'consumer')
  mkdirSync(installDir)
  writeFileSync(join(installDir, 'package.json'), '{"name":"workboard-package-check","private":true}\n')
  run(process.execPath, [
    npm, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', tarball,
  ], installDir)
  const installed = join(installDir, 'node_modules', manifest.name)
  // These scripts live in the checkout but only inspect/execute the installed files.
  for (const script of ['verify.mjs', 'smoke-host-routes.mjs', 'smoke-client.mjs']) {
    run(process.execPath, [join(root, 'scripts', script), installed], installDir)
  }
  // Resolve package exports from a consumer, not via the source directory.
  run(process.execPath, ['--input-type=module', '-e', `
    const plugin = await import('dsh-workboard');
    if (plugin.name !== 'dsh-workboard' || typeof plugin.apply !== 'function') throw new Error('Invalid plugin entry');
    for (const entry of ['dsh-workboard/client', 'dsh-workboard/icon', 'dsh-workboard/locale/en.json', 'dsh-workboard/locale/zh.json', 'dsh-workboard/cordis.patch.yml']) {
      import.meta.resolve(entry);
    }
    console.log('package exports: ok');
  `], installDir)

  const digest = createHash('sha256').update(readFileSync(tarball)).digest('hex')
  writeFileSync(join(dirname(tarball), packed.filename + '.sha256'), `${digest}  ${packed.filename}\n`)
  console.log(`\nVerified package: dist/${packed.filename}`)
  console.log(`${files.length} files, ${packed.size} bytes compressed, ${packed.unpackedSize} bytes unpacked`)
  console.log(`SHA-256: ${digest}`)
  console.log(files.join('\n'))
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
