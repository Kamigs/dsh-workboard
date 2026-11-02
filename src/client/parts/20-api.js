/**
 * Thin JSON transport for the host half.
 *
 * Every request is same-origin with cookies, sends/receives JSON, and rejects
 * with an `Error` whose message is the host's `{ ok: false, error }` text so
 * callers can surface it verbatim. A 20s AbortController guards large uploads.
 */
addDict(
  {
    'api.timeout': '请求超时，请重试',
    'api.httpError': '请求失败（HTTP {status}）',
    'api.badResponse': '服务器返回了无法识别的数据',
    'api.readFailed': '无法读取文件',
    'api.noFile': '没有选择文件',
  },
  {
    'api.timeout': 'The request timed out. Try again.',
    'api.httpError': 'Request failed (HTTP {status})',
    'api.badResponse': 'The server returned an unexpected response.',
    'api.readFailed': 'Could not read the file.',
    'api.noFile': 'No file selected.',
  },
)

/** Hard cap for one request; uploads carry base64 payloads. */
const KANBAN_REQUEST_TIMEOUT_MS = 20000

/**
 * Perform one authenticated JSON request.
 * @param {string} path - `/api/kanban.*` route
 * @param {{ method?: string, body?: string }} [init]
 * @returns {Promise<object | null>} parsed successful body
 */
async function kanbanRequest(path, init) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller === null
    ? null
    : setTimeout(() => {
      controller.abort()
    }, KANBAN_REQUEST_TIMEOUT_MS)
  const options = Object.assign({
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
  }, init || {})
  if (controller !== null) options.signal = controller.signal

  try {
    const response = await fetch(path, options)
    let text = ''
    try {
      text = await response.text()
    } catch (readError) {
      text = ''
    }
    let body = null
    if (text !== '') {
      try {
        body = JSON.parse(text)
      } catch (parseError) {
        body = null
      }
    }
    if (!response.ok || (body !== null && body.ok === false)) {
      const hostMessage = body !== null && typeof body.error === 'string' ? body.error.trim() : ''
      throw new Error(hostMessage !== '' ? hostMessage : t('api.httpError', { status: response.status }))
    }
    return body
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.name === 'AbortError') {
      throw new Error(t('api.timeout'))
    }
    if (error instanceof Error) throw error
    throw new Error(messageOf(error))
  } finally {
    if (timer !== null) clearTimeout(timer)
  }
}

/**
 * GET one JSON endpoint.
 * @param {string} path
 * @returns {Promise<object | null>}
 */
function apiGet(path) {
  return kanbanRequest(path, { method: 'GET' })
}

/**
 * POST one JSON endpoint.
 * @param {string} path
 * @param {object} [body]
 * @returns {Promise<object | null>}
 */
function apiPost(path, body) {
  return kanbanRequest(path, {
    method: 'POST',
    body: JSON.stringify(body === undefined || body === null ? {} : body),
  })
}
