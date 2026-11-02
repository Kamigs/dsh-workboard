/**
 * Current DeepSeek account identity.
 *
 * A human assignee means "the signed-in Harness user", so the board reads the
 * profile through the generated `remote.account` face (id, display name,
 * avatar) and renders it as a small identity card instead of a free-text name.
 * The lookup is optional: without the remote or without a signed-in account the
 * UI falls back to the generic "人工" chip.
 */
addDict(
  {
    'account.current': '当前账号',
    'account.id': 'ID {id}',
    'account.unknown': '当前账号',
    'account.signedOut': '未登录 DeepSeek 账号',
  },
  {
    'account.current': 'Current account',
    'account.id': 'ID {id}',
    'account.unknown': 'Current account',
    'account.signedOut': 'No DeepSeek account signed in',
  },
)

/** Last read account state: `{ status, profile }`. */
let kbnAccountState = { status: 'idle', profile: null }
const kbnAccountListeners = new Set()
let kbnAccountPending = null

/** @returns {{ status: string, profile: object | null }} */
function kbnAccountSnapshot() {
  return kbnAccountState
}

/**
 * Subscribe to account reads.
 * @param {() => void} listener
 * @returns {() => void} unsubscribe
 */
function kbnAccountSubscribe(listener) {
  kbnAccountListeners.add(listener)
  return () => {
    kbnAccountListeners.delete(listener)
  }
}

/** Replace the account state and notify subscribers. */
function kbnSetAccountState(next) {
  kbnAccountState = next
  kbnAccountListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // One broken subscriber must not stop the others.
    }
  })
}

/** Subscribe a component to the account read. */
function useKbnAccount() {
  return useSyncExternalStore(kbnAccountSubscribe, kbnAccountSnapshot, kbnAccountSnapshot)
}

/** Metadata the account remote requires from a browser client. */
function kbnAccountMetadata() {
  return {
    version: 'dsh-workboard/0.1.0',
    locale: localeId === 'zh' ? 'zh-CN' : 'en-US',
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
}

/**
 * Read the signed-in account profile once (shared in-flight read).
 * @param {object} ctx - client context; `remote.account` is read optionally.
 * @returns {Promise<object | null>} the normalized profile, or null
 */
function loadKbnAccount(ctx) {
  if (kbnAccountPending !== null) return kbnAccountPending
  const remote = ctx !== null && ctx !== undefined && typeof ctx.get === 'function'
    ? ctx.get('remote.account')
    : undefined
  if (remote === undefined || remote === null || typeof remote.getProfile !== 'function') {
    kbnSetAccountState({ status: 'unavailable', profile: null })
    return Promise.resolve(null)
  }
  kbnSetAccountState({ status: 'loading', profile: kbnAccountState.profile })
  kbnAccountPending = Promise.resolve().then(() => remote.getProfile(kbnAccountMetadata())).then((result) => {
    if (result !== null && result !== undefined && result.ok === true
      && result.value !== null && result.value !== undefined && result.value.status === 'ready') {
      const raw = result.value.value !== null && result.value.value !== undefined ? result.value.value : {}
      const profile = {
        id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : null,
        name: typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name.trim() : null,
        contact: typeof raw.contact === 'string' && raw.contact !== '' ? raw.contact : null,
        avatarUrl: typeof raw.avatarUrl === 'string' && raw.avatarUrl !== '' ? raw.avatarUrl : null,
      }
      kbnSetAccountState({ status: 'ready', profile })
      return profile
    }
    kbnSetAccountState({ status: 'signed-out', profile: null })
    return null
  }, () => {
    kbnSetAccountState({ status: 'error', profile: null })
    return null
  }).finally(() => {
    kbnAccountPending = null
  })
  return kbnAccountPending
}

/**
 * Shorten an account id for compact display while keeping it recognizable.
 * @param {string | null} id
 * @returns {string}
 */
function kbnAccountShortId(id) {
  if (typeof id !== 'string' || id === '') return ''
  if (id.length <= 16) return id
  return id.slice(0, 6) + '…' + id.slice(-4)
}

/**
 * Whether a task's human assignee is the signed-in account.
 * @param {object} task
 * @param {object | null} profile
 * @returns {boolean}
 */
function kbnAccountMatchesTask(task, profile) {
  if (profile === null || profile === undefined || task === null || task === undefined) return false
  const assignee = task.assignee
  if (assignee === null || assignee === undefined || assignee.kind !== 'human') return false
  const name = typeof assignee.name === 'string' ? assignee.name.trim() : ''
  return name === '' || (profile.name !== null && name === profile.name)
}

/**
 * Avatar image with a user-glyph fallback for a missing or unloadable picture.
 * @param {{ profile: object | null, size?: number, className?: string }} props
 * @returns {object} React element
 */
function KbnAccountAvatar({ profile, size = 32, className }) {
  const [failed, setFailed] = useState(false)
  const px = Number(size) > 0 ? Number(size) : 32
  const box = { width: px + 'px', height: px + 'px' }
  if (profile === null || profile === undefined || profile.avatarUrl === null || failed) {
    return h('span', {
      className: cx('kbn-account-avatar', 'kbn-account-avatar-fallback', className),
      style: box,
      'aria-hidden': 'true',
    }, h(Icon, { name: 'user', size: Math.max(12, Math.round(px * 0.58)) }))
  }
  return h('img', {
    className: cx('kbn-account-avatar', className),
    src: profile.avatarUrl,
    alt: '',
    width: px,
    height: px,
    style: box,
    referrerPolicy: 'no-referrer',
    onError: () => setFailed(true),
  })
}

/**
 * Identity card shown for a human assignee: avatar, display name and account id.
 * @param {{ profile: object | null, status: string, compact?: boolean }} props
 * @returns {object} React element
 */
function AccountAssigneeCard({ profile, status, compact = false }) {
  const name = profile !== null && profile.name !== null
    ? profile.name
    : (status === 'signed-out' ? t('account.signedOut') : t('account.unknown'))
  return h('div', {
    className: cx('kbn-account-card', compact ? 'kbn-account-card-compact' : null),
    role: 'group',
    'aria-label': t('account.current'),
  },
    h(KbnAccountAvatar, { profile, size: compact ? 20 : 32 }),
    h('div', { className: 'kbn-account-identity' },
      h('span', { className: 'kbn-account-name', title: name }, name),
      profile !== null && profile.id !== null
        ? h('span', { className: 'kbn-account-uid', title: profile.id }, t('account.id', { id: kbnAccountShortId(profile.id) }))
        : null),
    compact ? null : h('span', { className: 'kbn-account-badge' }, t('account.current')))
}

addStyle(`
.kbn-account-card {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
}
.kbn-account-avatar {
  flex: none;
  border-radius: 999px;
  object-fit: cover;
  background: var(--dsw-alias-bg-module-platform);
}
.kbn-account-avatar-fallback {
  display: inline-grid;
  place-items: center;
  color: var(--dsw-alias-label-secondary);
}
.kbn-account-identity {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.kbn-account-name {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 19px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kbn-account-uid {
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kbn-account-badge {
  flex: none;
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}
.kbn-account-card-compact {
  padding: 0;
  border: 0;
  background: transparent;
  gap: 6px;
  width: auto;
}
.kbn-account-card-compact .kbn-account-name { font-size: 12px; line-height: 18px; font-weight: 400; color: var(--dsw-alias-label-secondary); }
.kbn-account-card-compact .kbn-account-uid { font-size: 10px; line-height: 14px; }
`)
