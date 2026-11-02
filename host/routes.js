/**
 * Authenticated HTTP surface of the Kanban plugin.
 *
 * Every route lives under `/api`, so it is registered on the Connection
 * service's exact-Fetch registry (`ctx.connection.fetch.register`): the carrier
 * authenticates the browser and only the owner principal is admitted. Handlers
 * are thin: validate the JSON envelope, call the store, map coded failures onto
 * an HTTP status. No route reaches the network or another plugin's state.
 *
 * @module dsh-workboard/host/routes
 */
import { isKanbanError, kanbanError } from './store.js'

/** Response headers for every JSON answer. */
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

/**
 * Transport guard for one JSON request body. Attachments travel base64-inlined
 * and have no plugin-level size limit; this bound only protects the process
 * from absurd bodies (the Connection service enforces its own configured
 * `maxRequestBodyBytes` as well).
 */
const MAX_JSON_BYTES = 256 * 1024 * 1024

/**
 * Build one JSON response.
 * @param {unknown} value
 * @param {number} [status]
 * @returns {Response}
 */
function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS })
}

/**
 * Build one documented failure body.
 * @param {string} message
 * @param {number} status
 * @param {string} [code]
 * @returns {Response}
 */
function errorResponse(message, status, code) {
  const body = code === undefined ? { ok: false, error: message } : { ok: false, error: message, code }
  return jsonResponse(body, status)
}

/**
 * Map one thrown value onto the response the client should see.
 * @param {unknown} error
 * @returns {Response}
 */
function failureResponse(error) {
  if (isKanbanError(error)) {
    const code = error.code
    if (code === 'kanban/session-conflict') return errorResponse(error.message, 409, code)
    if (code.endsWith('-not-found')) return errorResponse(error.message, 404, code)
    if (code === 'kanban/body-too-large') {
      return errorResponse(error.message, 413, code)
    }
    if (code.startsWith('kanban/invalid-')) return errorResponse(error.message, 400, code)
    return errorResponse(error.message, 500, code)
  }
  const message = error instanceof Error && error.message !== '' ? error.message : 'Unexpected host failure.'
  return errorResponse(message, 500)
}

/**
 * Read one JSON object body.
 * @param {Request} request
 * @returns {Promise<Record<string, unknown>>}
 */
async function readJsonObject(request) {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
    throw kanbanError('kanban/body-too-large', 'Request body is too large.')
  }
  let body
  try {
    body = await request.json()
  } catch {
    throw kanbanError('kanban/invalid-body', 'Request body must be valid JSON.')
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw kanbanError('kanban/invalid-body', 'Request body must be a JSON object.')
  }
  return body
}

/**
 * Project the workspace registry into the wire shape the board consumes.
 * @param {object} ctx
 * @returns {Array<{ id: string, title: string, path: string }>}
 */
function listWorkspaces(ctx) {
  if (ctx === null || ctx === undefined || ctx.workspaceRegistry === null || ctx.workspaceRegistry === undefined) {
    return []
  }
  const workspaces = ctx.workspaceRegistry.list()
  if (!Array.isArray(workspaces)) return []
  return workspaces.map((workspace) => ({
    id: String(workspace.id),
    title: typeof workspace.title === 'string' ? workspace.title : String(workspace.path ?? ''),
    path: String(workspace.path ?? ''),
  }))
}

/**
 * Escape one filename for a `Content-Disposition` header (ASCII fallback plus
 * RFC 5987 UTF-8 form so non-ASCII names survive).
 * @param {string} name
 * @returns {string}
 */
function contentDisposition(name) {
  const fallback = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\\r\n]/g, '_') || 'attachment'
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

/**
 * Wrap one handler with the shared error mapping and readiness gate.
 * @param {import('./store.js').KanbanStore} store
 * @param {(request: Request) => Promise<Response>} handler
 * @returns {(request: Request) => Promise<Response>}
 */
function guard(store, handler) {
  return async (request) => {
    try {
      await store.ready()
      return await handler(request)
    } catch (error) {
      return failureResponse(error)
    }
  }
}

/**
 * Register every Kanban route on the Connection exact-Fetch registry. Each
 * registration is owned by the caller's fiber and removed on dispose.
 * @param {object} ctx - host context with `connection` and `workspaceRegistry`
 * @param {import('./store.js').KanbanStore} store
 * @returns {void}
 */
export function registerKanbanRoutes(ctx, store) {
  /** @type {Array<{ path: string, methods: string[], handler: (request: Request) => Promise<Response> }>} */
  const routes = [
    {
      path: '/api/kanban.state',
      methods: ['GET'],
      handler: guard(store, async () => jsonResponse({
        ok: true,
        workspaces: listWorkspaces(ctx),
        boards: await store.listBoards(),
        tasks: await store.list(),
      })),
    },
    {
      path: '/api/kanban.board.create',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        const board = await store.createBoard(body.title)
        return jsonResponse({ ok: true, board })
      }),
    },
    {
      path: '/api/kanban.board.bind',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        const result = await store.bindBoard(body.boardId, body.workspaceId)
        return jsonResponse({ ok: true, boardId: result.boardId, workspaceId: result.workspaceId, migrated: result.migrated })
      }),
    },
    {
      path: '/api/kanban.task.create',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        const task = await store.create(body.workspaceId, body.input)
        return jsonResponse({ ok: true, task })
      }),
    },
    {
      path: '/api/kanban.task.update',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        const task = await store.update(body.id, body.patch)
        return jsonResponse({ ok: true, task })
      }),
    },
    {
      path: '/api/kanban.task.move',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        const tasks = await store.move(body.id, body.status, body.beforeId)
        return jsonResponse({ ok: true, tasks })
      }),
    },
    {
      path: '/api/kanban.task.archive',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        const task = await store.archive(body.id)
        return jsonResponse({ ok: true, task })
      }),
    },
    {
      path: '/api/kanban.task.restore',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        const task = await store.restore(body.id)
        return jsonResponse({ ok: true, task })
      }),
    },
    {
      path: '/api/kanban.task.delete',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        await store.remove(body.id)
        return jsonResponse({ ok: true })
      }),
    },
    {
      path: '/api/kanban.task.link',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        const task = await store.link(body.id, body.sessionId, body.expectedSessionId)
        return jsonResponse({ ok: true, task })
      }),
    },
    {
      path: '/api/kanban.attachment.upload',
      methods: ['POST'],
      handler: guard(store, async (request) => {
        const body = await readJsonObject(request)
        // Attachments live in the owning workspace's `.dsh/assets/kanban`
        // directory; an unknown workspace falls back to the plugin data dir.
        const attachment = await store.saveAttachment({
          name: body.name,
          type: body.type,
          dataBase64: body.data,
          workspaceId: typeof body.workspaceId === 'string' ? body.workspaceId : '',
        })
        return jsonResponse({ ok: true, attachment })
      }),
    },
    {
      path: '/api/kanban.attachment',
      methods: ['GET'],
      handler: guard(store, async (request) => {
        const id = new URL(request.url).searchParams.get('id')
        if (id === null || id === '') {
          throw kanbanError('kanban/invalid-attachment-id', 'An attachment id is required.')
        }
        const { bytes, meta } = await store.readAttachment(id)
        return new Response(bytes, {
          status: 200,
          headers: {
            'content-type': meta.type !== '' ? meta.type : 'application/octet-stream',
            'content-disposition': contentDisposition(meta.name),
            'content-length': String(bytes.length),
            'cache-control': 'no-store',
          },
        })
      }),
    },
  ]

  for (const route of routes) {
    ctx.effect(
      () => ctx.connection.fetch.register({
        path: route.path,
        methods: route.methods,
        requestBody: 'buffered',
        fetch: route.handler,
      }),
      `kanban: ${route.path}`,
    )
  }
}
