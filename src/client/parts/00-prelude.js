/**
 * Shared prelude for the Kanban board browser half.
 *
 * Every part below this file runs inside one `factory(require)` scope: no ESM
 * imports, no exports. A part may read anything declared by an earlier part and
 * must not redeclare a name that already exists.
 */
const React = require('react')
const {
  Fragment,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useSyncExternalStore,
} = React
const h = React.createElement

/** The `main` panel key; the same string is the `sidebar.panellist` entry id. */
const PANEL_ID = 'kanban'
/** Client locale namespace owned by this plugin. */
const NS = 'kanban'
/** Package id, used for the style element marker. */
const PLUGIN_ID = 'dsh-workboard'

/** Task lifecycle columns, in board order. */
const STATUSES = ['todo', 'doing', 'done']
/** Urgency levels, ascending. */
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

/** Collected dictionaries, merged from every part through `addDict`. */
const DICT = { en: {}, zh: {} }

/**
 * Contribute one part's copy to the plugin namespace.
 * @param {object} zh - Simplified Chinese entries.
 * @param {object} en - English entries (key-set source of truth).
 */
function addDict(zh, en) {
  Object.assign(DICT.zh, zh)
  Object.assign(DICT.en, en)
}

/** Active translate function, rebound by `apply` once the locale service exists. */
let translate = (key) => key

/**
 * Bind the live translate function.
 * @param {(key: string, params?: object) => string} fn
 */
function setTranslate(fn) {
  translate = fn
}

/**
 * Translate one key of this plugin's namespace.
 * @param {string} key - dictionary key
 * @param {object} [params] - `{name}` placeholders
 * @returns {string}
 */
function t(key, params) {
  return translate(key, params)
}

/** Collect CSS chunks in part order; `installStyles` emits them as one element. */
const STYLE_PARTS = []

/**
 * Append one part's stylesheet.
 * @param {string} css
 */
function addStyle(css) {
  STYLE_PARTS.push(css)
}

/**
 * Create and insert the plugin stylesheet.
 * @returns {HTMLStyleElement} the element the owner removes on dispose.
 */
function installStyles() {
  const el = document.createElement('style')
  el.dataset.plugin = PLUGIN_ID
  el.textContent = STYLE_PARTS.join('\n')
  document.head.appendChild(el)
  return el
}

/**
 * Join truthy class names.
 * @param {...(string | false | null | undefined)} parts
 * @returns {string}
 */
function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * Local unique id for ephemeral UI state (never a durable task id).
 * @param {string} [prefix]
 * @returns {string}
 */
function uid(prefix = 'el') {
  return prefix + '-' + Math.random().toString(36).slice(2, 9)
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** @returns {string} today as a local `YYYY-MM-DD` day. */
function todayISO() {
  const d = new Date()
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

/**
 * Parse a `YYYY-MM-DD` day into local midnight.
 * @param {string} value
 * @returns {Date | null}
 */
function parseDay(value) {
  if (typeof value !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (m === null) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Active locale id, kept current by the plugin entry. */
let localeId = 'en'

/**
 * Track the active locale so date formatting follows the host language.
 * @param {string} id
 */
function setLocaleId(id) {
  localeId = typeof id === 'string' && id !== '' ? id : 'en'
}

/**
 * Format a stored day for display in the current locale.
 * @param {string | null} value
 * @returns {string} formatted day, or an empty string
 */
function formatDay(value) {
  const date = parseDay(value)
  if (date === null) return ''
  try {
    return new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch {
    return value
  }
}

/**
 * Whether a stored day is before today.
 * @param {string | null} value
 * @returns {boolean}
 */
function isPastDay(value) {
  const date = parseDay(value)
  if (date === null) return false
  const today = parseDay(todayISO())
  return date.getTime() < today.getTime()
}

/**
 * Whole days from today to a stored day (negative when past).
 * @param {string | null} value
 * @returns {number | null}
 */
function daysUntil(value) {
  const date = parseDay(value)
  if (date === null) return null
  const today = parseDay(todayISO())
  return Math.round((date.getTime() - today.getTime()) / 86400000)
}

/**
 * Human file size.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exp = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, exp)
  return (exp === 0 ? String(value) : value.toFixed(value >= 10 ? 0 : 1)) + ' ' + units[exp]
}

function messageOf(error) {
  if (error && typeof error.message === 'string' && error.message !== '') return error.message
  return String(error)
}
