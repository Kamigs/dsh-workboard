/**
 * Kanban plugin, host half.
 *
 * Opens the durable task store and registers the authenticated `/api/kanban.*`
 * routes on the Connection fetch registry. The browser half ships separately
 * through `exports["./client"]` and the `dsh.client` declaration in
 * `package.json`.
 *
 * No `Config` schema is exported: the plugin reads `config.dataDir`
 * defensively and falls back to `<DSH_HOME>/kanban`.
 *
 * @module dsh-workboard
 */
import os from 'node:os'
import path from 'node:path'
import { createStore } from './host/store.js'
import { registerKanbanRoutes } from './host/routes.js'

/** Stable plugin id, matching `package.json` / the client bundle id. */
export const name = 'dsh-workboard'

/** Services the host half needs: authenticated routes and the workspace list. */
export const inject = ['connection', 'workspaceRegistry']

/**
 * Resolve the data directory from plugin config, defensively.
 * @param {{ dataDir?: unknown } | undefined} config
 * @returns {string} absolute data directory
 */
function resolveDataDir(config) {
  const configured = config?.dataDir
  if (typeof configured === 'string' && configured.trim() !== '') {
    const expanded = configured.trim().replace(/^~(?=$|[\\/])/, os.homedir())
    return path.resolve(expanded)
  }
  const dshHome = process.env.DSH_HOME
  const base = typeof dshHome === 'string' && dshHome.trim() !== ''
    ? dshHome.trim()
    : path.join(os.homedir(), '.dsh')
  return path.join(base, 'kanban')
}

/**
 * Start the host half.
 * @param {object} ctx - host context carrying `connection` and `workspaceRegistry`
 * @param {{ dataDir?: unknown } | undefined} config - plugin config
 * @returns {void}
 */
export function apply(ctx, config) {
  const store = createStore({
    dataDir: resolveDataDir(config),
    // Attachments live in the owning workspace's `.dsh/assets/kanban`; the
    // registry lookup stays lazy so a deleted workspace falls back safely.
    resolveWorkspacePath: (workspaceId) => ctx.workspaceRegistry.get(workspaceId)?.path,
  })
  // Registered first so disposal closes the store after the routes are gone.
  ctx.effect(
    () => () => store.close(),
    'kanban: durable store',
  )
  registerKanbanRoutes(ctx, store)
}
