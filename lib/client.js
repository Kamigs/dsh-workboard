window.__ModuleLoader__.load({
  id: 'dsh-workboard',
  factory: (require) => {
/* ---- 00-prelude.js ---- */
/**
 * Shared prelude for the Kanban board browser half.
 *
 * Every part below this file runs inside one `factory(require)` scope: no ESM
 * imports, no exports. A part may read anything declared by an earlier part and
 * must not redeclare a name that already exists.
 */
const React = require('react')
const { createPortal } = require('react-dom')
const DshUI = require('@deepseek-ai/dsh-client-ui-primitives')
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


/* ---- 05-l10n.js ---- */
/**
 * Copy that more than one part needs: panel identity, status/priority labels,
 * shared widgets. Part-owned strings live beside their components.
 */
addDict(
  {
    'panel.title': '工作看板',
    'status.todo': '待办',
    'status.doing': '进行中',
    'status.done': '已完成',
    'priority.low': '低',
    'priority.medium': '中',
    'priority.high': '高',
    'priority.urgent': '紧急',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'common.close': '关闭',
    'common.loading': '加载中…',
    'common.retry': '重试',
    'common.none': '无',
    'action.openSession': '打开会话',
    'toast.failed': '操作失败：{message}',
  },
  {
    'panel.title': 'Workboard',
    'status.todo': 'To do',
    'status.doing': 'Doing',
    'status.done': 'Done',
    'priority.low': 'Low',
    'priority.medium': 'Medium',
    'priority.high': 'High',
    'priority.urgent': 'Urgent',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.loading': 'Loading…',
    'common.retry': 'Retry',
    'common.none': 'None',
    'action.openSession': 'Open session',
    'toast.failed': 'Action failed: {message}',
  },
)


/* ---- 10-style-base.js ---- */
/**
 * Base stylesheet: page shell, header, buttons, form controls, chips, dialog,
 * empty state, spinner, toast and layout utilities.
 *
 * Geometry, colors and states are copied from the running Harness
 * (`dsh-client-ui-primitives` CSS and the official panel styles) and are
 * expressed only through `--dsw-*` tokens so light/dark both work.
 * Board-owned selectors (docs/ARCHITECTURE.md §10 "Board part") are intentionally absent.
 */
addStyle(`
/* ---------------------------------------------------------------- page shell */

.kbn-root{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:14px;line-height:22px}

.kbn-root{position:relative;isolation:isolate;overflow:hidden;box-sizing:border-box;-webkit-font-smoothing:antialiased}

.kbn-root *,.kbn-root *::before,.kbn-root *::after{box-sizing:border-box}

.kbn-page{--kbn-page-gutter:clamp(12px,2%,24px);display:flex;flex-direction:column;flex:1;min-height:0;width:100%;max-width:none}

.kbn-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:0 24px 24px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent}

.kbn-scroll::-webkit-scrollbar{width:10px;height:10px}

.kbn-scroll::-webkit-scrollbar-track{background:transparent}

.kbn-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border:2px solid transparent;border-radius:999px;background-clip:content-box}

.kbn-scroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2);background-clip:content-box}

/* ------------------------------------------------------------------ header */

.kbn-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:12px 16px;flex:none;padding:18px var(--kbn-page-gutter) 10px}

.kbn-head-back{grid-column:1 / -1;justify-self:start}

.kbn-head-main{display:flex;flex-direction:column;gap:2px;flex:1 1 140px;min-width:0}

.kbn-subtitle{margin:0;font-size:13px;line-height:20px;font-weight:400;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}

.kbn-head-actions{display:flex;align-items:flex-end;justify-content:flex-end;flex-wrap:wrap;gap:8px;max-width:100%;margin-inline-start:auto}

.kbn-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;flex:none;padding:0 24px 12px}

/* ----------------------------------------------------------------- buttons */

.kbn-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;white-space:nowrap;user-select:none;cursor:pointer;flex:none;transition:background-color .12s var(--ds-ease-in-out),color .12s var(--ds-ease-in-out),border-color .12s var(--ds-ease-in-out),opacity .12s var(--ds-ease-in-out)}

.kbn-btn:disabled{cursor:not-allowed;opacity:.4}

.kbn-btn[data-size=sm]{height:28px;padding:0 10px;border-radius:var(--dsw-radius-sm);font-size:12px;line-height:18px}

.kbn-btn[data-variant=primary]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}

.kbn-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}

.kbn-btn[data-variant=outline]{border:.5px solid var(--dsw-alias-border-l3);background:transparent}

.kbn-btn[data-variant=outline]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}

.kbn-btn[data-variant=ghost]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}

.kbn-btn[data-variant=ghost]:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}

.kbn-btn[data-variant=danger]{color:var(--dsw-alias-state-error-primary)}

.kbn-btn[data-variant=danger]:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}

.kbn-btn>svg{flex:none}

.kbn-btn:focus-visible,.kbn-icon-btn:focus-visible,.kbn-dialog-close:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));outline-offset:2px}

/* ------------------------------------------------------------- icon buttons */

.kbn-icon-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;transition:background-color .12s var(--ds-ease-in-out),color .12s var(--ds-ease-in-out)}

.kbn-icon-btn[data-size="24"]{width:24px;height:24px}

.kbn-icon-btn[data-size="16"]{width:16px;height:16px;border-radius:var(--dsw-radius-xs)}

.kbn-icon-btn[data-variant=outline]{border:.5px solid var(--dsw-alias-border-l3)}

.kbn-icon-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}

.kbn-icon-btn:disabled{cursor:not-allowed;opacity:.4}

.kbn-icon-btn>svg{flex:none}

/* ------------------------------------------------------------- form fields */

.kbn-field{display:flex;flex-direction:column;gap:6px;min-width:0}

.kbn-label-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0}

.kbn-label{font-size:12px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-secondary);min-width:0;overflow-wrap:anywhere}

.kbn-label[data-required=true]::after{content:" *";color:var(--dsw-alias-state-error-primary)}

.kbn-hint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);text-align:right;overflow-wrap:anywhere}

.kbn-error-text{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}

/* ------------------------------------------------- inputs / textarea / select */

.kbn-input-wrap{position:relative;display:flex;align-items:center;min-width:0;width:100%}

.kbn-input-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);pointer-events:none;z-index:1}

.kbn-input-icon[data-side=right]{left:auto;right:10px}

.kbn-input,.kbn-textarea,.kbn-select{box-sizing:border-box;width:100%;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;outline:none}

.kbn-input,.kbn-select{height:36px;padding:0 12px}

.kbn-input-wrap[data-icon=true] .kbn-input{padding-left:34px}

.kbn-input-wrap[data-select=true] .kbn-select{padding-left:12px;padding-right:32px}

.kbn-input::placeholder,.kbn-textarea::placeholder{color:var(--dsw-alias-label-tertiary);opacity:1}

.kbn-textarea{min-height:64px;max-height:220px;padding:8px 12px;line-height:20px;resize:none;overflow-y:auto}

.kbn-select{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:32px}

.kbn-select:disabled,.kbn-input:disabled,.kbn-textarea:disabled{cursor:not-allowed;opacity:.4;color:var(--dsw-alias-label-secondary)}

.kbn-input:focus-visible,.kbn-textarea:focus-visible,.kbn-select:focus-visible{border-color:var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)) 18%, transparent)}.kbn-input[type=date]{padding-right:10px}
.kbn-input[type=date][data-empty=true]{color:var(--dsw-alias-label-tertiary)}
.kbn-input[type=date]::-webkit-calendar-picker-indicator{opacity:.65;cursor:pointer}
.kbn-input[type=date]::-webkit-calendar-picker-indicator:hover{opacity:1}
body[data-ds-dark-theme] .kbn-root{color-scheme:dark}

/* -------------------------------------------------------------------- chips */

.kbn-chip{display:inline-flex;align-items:center;gap:4px;height:26px;max-width:100%;padding:0 12px;border-radius:10px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap;vertical-align:middle}

.kbn-chip>svg{flex:none;opacity:.8}

.kbn-chip[data-tone=brand]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);color:var(--dsw-alias-state-business-primary)}

.kbn-chip[data-tone=success]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-state-success-primary)}

.kbn-chip[data-tone=warn]{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);color:var(--dsw-alias-state-warn-primary)}

.kbn-chip[data-tone=danger]{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);color:var(--dsw-alias-state-error-primary)}

.kbn-chip .kbn-icon-btn{width:16px;height:16px;margin-right:-6px;color:inherit;opacity:.7}

.kbn-chip .kbn-icon-btn:hover:not(:disabled){background:color-mix(in srgb, currentColor 14%, transparent);color:inherit;opacity:1}

/* -------------------------------------------------------------------- dialog */

.kbn-mask{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);-webkit-backdrop-filter:var(--dsw-mask-blur);animation:kbn-mask-in .16s var(--ds-ease-in-out)}

.kbn-dialog{box-sizing:border-box;position:relative;z-index:1;display:flex;flex-direction:column;width:min(520px, 100%);max-width:calc(100vw - 48px);max-height:calc(100dvh - 108px);border-radius:24px;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);overflow:hidden;outline:none;animation:kbn-dialog-in .16s var(--ds-ease-in-out)}

.kbn-dialog-head{display:flex;align-items:center;gap:12px;flex:none;padding:20px 18px 12px 24px}

.kbn-dialog-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-secondary)}

.kbn-dialog-title{margin:0;flex:1;min-width:0;font-size:16px;line-height:24px;font-weight:500;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.kbn-dialog-close{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}

.kbn-dialog-close:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}

.kbn-dialog-close:disabled{cursor:not-allowed;opacity:.4}

.kbn-dialog-body{display:flex;flex-direction:column;gap:16px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 24px 8px;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent}

.kbn-dialog-body::-webkit-scrollbar{width:10px}

.kbn-dialog-body::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);border:2px solid transparent;border-radius:999px;background-clip:content-box}

.kbn-dialog-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none;padding:12px 24px 20px;border-top:.5px solid var(--dsw-alias-border-l1)}

@keyframes kbn-mask-in{from{opacity:0}to{opacity:1}}

@keyframes kbn-dialog-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}

/* --------------------------------------------------------------- empty state */

.kbn-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;flex:1;min-height:180px;padding:40px 24px;text-align:center;color:var(--dsw-alias-label-secondary)}

.kbn-empty-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;margin-bottom:2px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-tertiary)}

.kbn-empty-title{margin:0;font-size:14px;line-height:22px;font-weight:500;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}

.kbn-empty-desc{max-width:360px;margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}

.kbn-empty-action{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px}

/* ------------------------------------------------------------------- spinner */

.kbn-spinner{display:inline-block;flex:none;width:16px;height:16px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-label-secondary);border-radius:50%;animation:kbn-spin .7s linear infinite;box-sizing:border-box}

@keyframes kbn-spin{to{transform:rotate(360deg)}}

/* --------------------------------------------------------------------- toast */

.kbn-toast{position:absolute;right:20px;bottom:20px;z-index:1100;display:flex;align-items:center;gap:8px;max-width:min(420px, calc(100vw - 40px));padding:10px 14px;border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-toast-bg);color:var(--dsw-alias-toast-label);font-size:13px;line-height:20px;box-shadow:var(--dsw-elevation-soft);pointer-events:none;overflow-wrap:anywhere;animation:kbn-toast-in .16s var(--ds-ease-in-out)}

/* Keep board feedback clear of the task-detail footer; settings retain their placement. */
.kbn-root>.kbn-toast{top:16px;right:16px;bottom:auto;left:16px;width:max-content;max-width:min(420px, calc(100% - 32px));margin-inline:auto}

.kbn-toast>svg{flex:none;opacity:.9}

.kbn-toast[data-kind=error]>svg{color:var(--dsw-alias-state-error-primary)}

@keyframes kbn-toast-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ---------------------------------------------------------------- utilities */

.kbn-divider{height:.5px;margin:8px 0;border:0;background:var(--dsw-alias-border-l2);flex:none}

.kbn-row{display:flex;align-items:center;gap:8px;min-width:0}

.kbn-stack{display:flex;flex-direction:column;gap:8px;min-width:0}

.kbn-visually-hidden{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}

/* ------------------------------------------------------- reduced motion */

@media (prefers-reduced-motion: reduce){
.kbn-btn,.kbn-icon-btn,.kbn-dialog-close{transition:none}
.kbn-mask,.kbn-dialog,.kbn-toast{animation:none}
.kbn-spinner{animation:none}
}
`);


/* ---- 12-style-board.js ---- */
/**
 * Board stylesheet: workspace bar, columns, cards, drop indicators, editor
 * form bits, archive rows and the project-creation dialog. Owns every
 * `kbn-` selector that `10-style-base.js` does not (docs/ARCHITECTURE.md §10).
 *
 * Values follow the running Harness scale (docs/ARCHITECTURE.md §7): radius-lg cards on
 * a module-platform column, 8px status dots, 36px controls, token colors only.
 */
addStyle(`
/* ---------------------------------------------------------------- board region */

.kbn-board-region {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  container: kbn-lanes / inline-size;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
}

.kbn-board-region::-webkit-scrollbar { width: 10px; height: 10px; }
.kbn-board-region::-webkit-scrollbar-track { background: transparent; }
.kbn-board-region::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
}
.kbn-board-region::-webkit-scrollbar-thumb:hover {
  background: var(--dsw-alias-scrollbar-hover-l2);
  background-clip: content-box;
}

.kbn-board {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

/* Loading / error / empty states fill the region and stay centered. */
.kbn-board-placeholder {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kbn-error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  margin: 0 0 12px;
  padding: 8px 12px;
  border-radius: var(--dsw-radius-md);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.kbn-error-bar > svg { flex: none; }
.kbn-error-bar > span { flex: 1; min-width: 0; }

/* -------------------------------------------------------- header board switcher */

.kbn-board-heading {
  align-self: flex-start;
  max-width: min(calc(100% + 8px), 32rem);
  min-width: 0;
  margin: 0;
  margin-inline-start: -8px;
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
}

.kbn-board-switcher { display: flex; min-width: 0; max-width: 100%; }
.kbn-board-switcher .kbn-board-switcher-button {
  width: 100%;
  min-width: 0;
  justify-content: flex-start;
  gap: 6px;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--dsw-alias-label-primary);
}
.kbn-board-heading .kbn-board-switcher-button { height: 32px; padding: 0 8px; font: inherit; }
.kbn-board-switcher .kbn-board-switcher-button[aria-expanded=true] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-state-business-primary); }
@media (hover: hover) {
  .kbn-board-switcher .kbn-board-switcher-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-state-business-primary); }
}
.kbn-board-switcher-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kbn-board-switcher-arrow { flex: none; color: var(--dsw-alias-label-secondary); }
.kbn-board-switcher-button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.kbn-board-options[role=menu] {
  background: var(--dsw-alias-bg-layer-1);
  width: 260px;
  max-width: calc(100vw - 24px);
  max-height: min(360px, calc(100vh - 24px));
}
.kbn-board-option-name { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ----------------------------------------------------------------- columns */

.kbn-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-module-platform);
  padding: 8px 8px 6px;
  transition: background-color .12s var(--ds-ease-in-out), box-shadow .12s var(--ds-ease-in-out);
}

:is(.kbn-col, .kbn-card)[data-status=todo]  { --kbn-col-tone: var(--dsw-alias-state-idle-primary); }
:is(.kbn-col, .kbn-card)[data-status=doing] { --kbn-col-tone: var(--dsw-alias-state-business-primary); }
:is(.kbn-col, .kbn-card)[data-status=done]  { --kbn-col-tone: var(--dsw-alias-state-success-primary); }

.kbn-col[data-drop=true] {
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, transparent);
}

.kbn-col-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 5px 6px;
  margin-bottom: 8px;
  border-radius: var(--dsw-radius-sm);
  background: color-mix(in srgb, var(--kbn-col-tone, var(--dsw-alias-state-idle-primary)) 10%, transparent);
}

.kbn-col-dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--kbn-tone, var(--dsw-alias-state-idle-primary));
}
.kbn-col-dot[data-status=todo]  { --kbn-tone: var(--dsw-alias-state-idle-primary); }
.kbn-col-dot[data-status=doing] { --kbn-tone: var(--dsw-alias-state-business-primary); }
.kbn-col-dot[data-status=done]  { --kbn-tone: var(--dsw-alias-state-success-primary); }

.kbn-col-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 22px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-col-count {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  flex: none;
}

.kbn-col-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-col-add:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.kbn-col-add:disabled { opacity: .4; cursor: not-allowed; }

.kbn-col-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 2px 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
}
.kbn-col-body::-webkit-scrollbar { width: 8px; }
.kbn-col-body::-webkit-scrollbar-track { background: transparent; }
.kbn-col-body::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
}
.kbn-col-body::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-scrollbar-hover-l2); background-clip: content-box; }

.kbn-col-body.kbn-drop-target {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, transparent);
  border-radius: var(--dsw-radius-md);
}

/* Drop zone outline while a card hovers this column. */
.kbn-col-drop {
  outline: 1.5px dashed color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent);
  outline-offset: -3px;
  border-radius: var(--dsw-radius-md);
}

.kbn-col-empty {
  margin: 2px 2px 4px;
  padding: 14px 8px;
  border: .5px dashed var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

/* -------------------------------------------------------------------- cards */

.kbn-card-slot { display: block; min-width: 0; }

.kbn-board > .kbn-card-flight {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  pointer-events: none;
  box-sizing: border-box;
  offset-anchor: 0 0;
  offset-rotate: 0deg;
}

.kbn-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  cursor: grab;
  transition: background-color .15s var(--ds-ease-in-out), border-color .15s var(--ds-ease-in-out), box-shadow .15s var(--ds-ease-in-out), opacity .12s var(--ds-ease-in-out);
}
.kbn-card:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l3);
}
.kbn-card[data-dragging=true] { opacity: .55; cursor: grabbing; }

.kbn-card-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

/* Urgency chip: text always written, tone from the status scale (docs/ARCHITECTURE.md §7). */
.kbn-priority {
  flex: none;
  height: 22px;
  padding: 0 8px;
  gap: 3px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 17px;
}
.kbn-priority[data-tone=neutral] {
  background: color-mix(in srgb, var(--dsw-alias-state-idle-primary) 12%, transparent);
  color: var(--dsw-alias-state-idle-primary);
}
.kbn-priority[data-tone=brand] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);
  color: var(--dsw-alias-state-business-primary);
}
.kbn-priority[data-tone=warn] {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
  color: var(--dsw-alias-state-warn-primary);
}
.kbn-priority[data-tone=danger] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-state-error-primary);
}

.kbn-card-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 22px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kbn-card-desc {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kbn-card-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  min-width: 0;
}

.kbn-card-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.kbn-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  max-width: 100%;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 17px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kbn-tag-more { color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }

.kbn-dates {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}

.kbn-card-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.kbn-card-date > svg { flex: none; }
.kbn-card-date[data-overdue=true] { color: var(--dsw-alias-state-error-primary); }
.kbn-card-date[data-soon=true] { color: var(--dsw-alias-state-warn-primary); }

.kbn-card-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-top: 2px;
}

.kbn-assignee {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 55%;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-assignee > svg { flex: none; }
.kbn-assignee[data-kind=ai] > svg { color: var(--dsw-alias-brand-primary); }
.kbn-assignee[data-kind=human] > svg { color: var(--dsw-alias-label-tertiary); }
.kbn-assignee-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-attach-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
}
.kbn-attach-count > svg { flex: none; }

.kbn-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-status-text { white-space: nowrap; }

.kbn-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex: none;
  opacity: 0;
  transition: opacity .12s var(--ds-ease-in-out);
}
.kbn-card:hover .kbn-card-actions,
.kbn-card:focus-within .kbn-card-actions { opacity: 1; }

.kbn-card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-card-action:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.kbn-card-action:disabled { opacity: .4; cursor: not-allowed; }

/* ----------------------------------------------------------- drop indicator */

.kbn-drop-line {
  height: 2px;
  margin: 2px 0;
  border-radius: 2px;
  background: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);
  pointer-events: none;
}

/* ------------------------------------------------------------ task editor */

.kbn-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.kbn-editor-error {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--dsw-radius-sm);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.kbn-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.kbn-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.kbn-form-row[data-span=full] { grid-column: 1 / -1; }

.kbn-tag-input {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 36px;
  padding: 5px 8px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  cursor: text;
  transition: border-color .12s var(--ds-ease-in-out), box-shadow .12s var(--ds-ease-in-out);
}
.kbn-tag-input:focus-within {
  border-color: var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)) 18%, transparent);
}

.kbn-tag-field {
  flex: 1;
  min-width: 90px;
  height: 24px;
  padding: 2px 4px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
}
.kbn-tag-field::placeholder { color: var(--dsw-alias-label-tertiary); opacity: 1; }

.kbn-tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 22px;
  max-width: 100%;
  padding: 0 2px 0 8px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-tag-pill > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-tag-x,
.kbn-attach-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  flex: none;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-tag-x:hover,
.kbn-attach-x:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-state-error-primary);
}
.kbn-attach-x { width: 20px; height: 20px; }

.kbn-attach-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.kbn-attach-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 4px 8px;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.kbn-attach-item > svg { flex: none; color: var(--dsw-alias-label-tertiary); }

.kbn-attach-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-attach-size {
  flex: none;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.kbn-attach-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: .5px dashed var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), border-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-attach-add:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}
.kbn-form-row[data-file-over=true] .kbn-attach-add {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-state-business-primary);
  color: var(--dsw-alias-state-business-primary);
}
.kbn-attach-add:disabled { opacity: .4; cursor: not-allowed; }
.kbn-attach-add > svg { flex: none; }

.kbn-seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-module-platform);
  align-self: flex-start;
}

.kbn-seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-seg-btn > svg { flex: none; }
.kbn-seg-btn:hover { color: var(--dsw-alias-label-primary); }
.kbn-seg-btn[aria-pressed=true] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 0 0 .5px var(--dsw-alias-border-l3);
}

/* --------------------------------------------------------------- archive */

.kbn-archive {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.kbn-archive-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.kbn-archive-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 4px 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
}
.kbn-archive-count { flex: none; color: var(--dsw-alias-label-secondary); font-weight: 400; }
.kbn-archive-more { align-self: flex-start; }
.kbn-archive-rows { display: grid; gap: 6px; min-width: 0; }
.kbn-archive-group-title > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-archive-ws {
  margin-left: 4px;
  color: var(--dsw-alias-label-caption);
  font-size: 12px;
  line-height: 18px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbn-archive-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 10px;
  border: .5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  transition: background-color .12s var(--ds-ease-in-out), border-color .12s var(--ds-ease-in-out);
}
.kbn-archive-row:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
}

.kbn-archive-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.kbn-archive-title {
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
}

.kbn-archive-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.kbn-archive-meta > span { display: inline-flex; align-items: center; gap: 3px; }
.kbn-archive-meta > span > svg { flex: none; }

.kbn-archive-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

/* ------------------------------------------------------- project creation */

.kbn-new-board-dialog { width: min(440px, calc(100vw - 32px)); }
.kbn-project-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.kbn-dir-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}

.kbn-dir-value {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  transition: border-color .12s var(--ds-ease-in-out);
}
.kbn-dir-value:hover { border-color: var(--dsw-alias-border-l2); }
.kbn-dir-value[data-empty=true] { color: var(--dsw-alias-label-tertiary); }
.kbn-dir-value > svg { flex: none; color: var(--dsw-alias-label-tertiary); }
.kbn-dir-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -------------------------------------------------- focus + reduced motion */

.kbn-root .kbn-col-add:focus-visible,
.kbn-root .kbn-card-action:focus-visible,
.kbn-root .kbn-tag-x:focus-visible,
.kbn-root .kbn-attach-x:focus-visible,
.kbn-root .kbn-attach-add:focus-visible,
.kbn-root .kbn-seg-btn:focus-visible,
.kbn-root .kbn-dir-value:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

@container kbn-lanes (max-width: 625px) {
  .kbn-board {
    flex: none;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }
  .kbn-col { max-height: none; }
  .kbn-col-body { overflow: visible; }
}

@media (hover: none) {
  .kbn-card-actions { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .kbn-col,
  .kbn-card,
  .kbn-card-actions,
  .kbn-card-action,
  .kbn-col-add,
  .kbn-tag-input,
  .kbn-tag-x,
  .kbn-attach-x,
  .kbn-attach-add,
  .kbn-seg-btn,
  .kbn-dir-value,
  .kbn-archive-row {
    transition: none;
  }
}
`);


// Workbench: the three status columns stay put on the left, one task-detail
// sheet sits at the far right in a deliberately different form (single neutral
// surface with divided sections instead of coloured columns and cards).
addStyle(`
.kbn-workbench {
  display: flex;
  gap: 14px;
  flex: 1;
  min-height: 0;
  margin-inline: var(--kbn-page-gutter);
  padding-bottom: 18px;
  box-sizing: border-box;
}

.kbn-detail {
  width: var(--kbn-detail-width);
  flex: none;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-xl);
  background: var(--dsw-alias-bg-layer-2);
  overflow: hidden;
}
.kbn-detail-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 10px 14px;
  border-bottom: .5px solid var(--dsw-alias-border-l2);
}
.kbn-detail-eyebrow {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  letter-spacing: .04em;
}
.kbn-detail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
}
.kbn-detail-body::-webkit-scrollbar { width: 8px; }
.kbn-detail-body::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.kbn-detail-content { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.kbn-detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.kbn-detail-title {
  margin: 0;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  overflow-wrap: anywhere;
}
.kbn-detail-workspace {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -6px 0 0;
  min-width: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-detail-workspace span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kbn-detail-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.kbn-detail-status-picker { display: inline-flex; }
.kbn-detail-status-picker .kbn-detail-status-trigger {
  height: 24px;
  padding: 0 9px;
  gap: 5px;
  border-radius: 999px;
  font-size: 12px;
}
.kbn-detail-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}
.kbn-detail-status[data-tone=brand] { color: var(--dsw-alias-state-business-primary); }
.kbn-detail-fields {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 7px 12px;
  margin: 0;
  font-size: 12px;
  line-height: 18px;
}
.kbn-detail-fields dt { color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.kbn-detail-fields dd {
  margin: 0;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.kbn-detail-overdue { color: var(--dsw-alias-state-error-primary); }
.kbn-detail-section {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 12px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.kbn-detail-section-title {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
}
.kbn-detail-desc {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 20px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.kbn-detail-note {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.kbn-detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.kbn-detail-attach { display: flex; flex-direction: column; gap: 6px; }
.kbn-detail-attach-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 18px;
  text-decoration: none;
  transition: background-color .15s var(--ds-ease-in-out);
}
.kbn-detail-attach-link:hover { background: var(--dsw-alias-interactive-bg-hover); }
.kbn-detail-attach-link:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.kbn-detail-attach-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kbn-detail-attach-size { flex: none; color: var(--dsw-alias-label-tertiary); }
.kbn-detail-session {
  display: block;
  padding: 6px 8px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-markdown-code-block, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  line-height: 17px;
  overflow-wrap: anywhere;
}
.kbn-detail-actions {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.kbn-detail-blank {
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 28px 24px;
  text-align: center;
  border-style: dashed;
  background: var(--dsw-alias-bg-layer-1);
}
.kbn-detail-blank-icon { color: var(--dsw-alias-label-caption); display: inline-flex; }
.kbn-detail-blank-title {
  margin: 4px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
}

.kbn-card { cursor: pointer; }
.kbn-card:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.kbn-card-send {
  width: 26px;
  height: 26px;
  flex: none;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
  cursor: pointer;
  transition: filter .15s var(--ds-ease-in-out), opacity .15s var(--ds-ease-in-out);
}
.kbn-card-send:hover:not(:disabled) { filter: brightness(1.07); }
.kbn-card-send:disabled { opacity: .45; cursor: not-allowed; }
.kbn-card-send:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}

.kbn-workbench[data-layout=stacked] { flex-direction: column; gap: 10px; }
.kbn-workbench[data-layout=stacked] .kbn-detail { width: 100%; flex: 0 0 min(42%, 340px); }
.kbn-workbench[data-layout=stacked] .kbn-detail-blank,
.kbn-workbench[data-layout=stacked] .kbn-detail-resizer { display: none; }

@media (prefers-reduced-motion: reduce) {
  .kbn-card-send,
  .kbn-detail-attach-link { transition: none; }
}
`);

// Card chrome: edit sits in the top-right corner above the urgency badge, the
// run-in-session circle is pinned to the bottom-right corner (composer-style
// blue send button), and the footer keeps a clear lane for it.
addStyle(`
.kbn-card-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.kbn-card-edit {
  width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  margin: -2px -2px 0 0;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out);
}
.kbn-card-edit:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.kbn-card-edit:disabled { opacity: .4; cursor: not-allowed; }
.kbn-card-edit:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.kbn-card[data-has-send=true] .kbn-card-foot { padding-right: 40px; }
.kbn-card-send {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 1;
  width: 30px;
  height: 30px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 18%);
  background: var(--dsw-alias-state-business-primary);
  color: var(--dsw-static-neutral-bluish-00, #fff);
}
.kbn-card-send:hover:not(:disabled) { filter: brightness(1.06); }
`);

// Card head: the corner column (edit above urgency) is absolutely placed so it
// does not stretch the title row — otherwise the description is pushed down by
// the badge height and the card shows a dead gap under the title.
addStyle(`
.kbn-card-head {
  position: relative;
  padding-right: 68px;
}
.kbn-card-side {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.kbn-card-desc {
  padding-right: 68px;
  font-size: 12px;
  line-height: 18px;
}
.kbn-card-tags { padding-right: 0; }
`);

// Breathing room in the card's right-hand lane: the edit glyph, the urgency
// badge and the bottom-right send button are three separate anchors, so a short
// card needs a minimum height and wider inner padding or they crowd each other.
addStyle(`
.kbn-card {
  padding: 14px;
  gap: 9px;
}
.kbn-card-head { padding-right: 70px; }
.kbn-card-side { gap: 8px; }
.kbn-card-desc { padding-right: 70px; }
.kbn-card-send {
  right: 12px;
  bottom: 12px;
}
.kbn-card[data-has-send=true] { min-height: 122px; }
.kbn-card[data-has-send=true] .kbn-card-foot { padding-right: 42px; }
`);

// Leave vertical clearance below the priority badge for footer actions.
// Only a separate send button needs horizontal space at the end of the footer.
addStyle(`
.kbn-card { min-height: 96px; }
.kbn-card:has(.kbn-card-action) { min-height: 112px; }
.kbn-card[data-has-send=true] { min-height: 128px; }
.kbn-card-foot:has(.kbn-card-action) { flex-wrap: wrap; }
.kbn-card[data-has-send=true] .kbn-card-foot { padding-right: 46px; }
`);

// In a narrow card the edit button shares the title row. Put urgency on the
// next line so neither the title nor the description reserves a 70px gutter.
addStyle(`
.kbn-card { container: kbn-card / inline-size; }
@container kbn-card (max-width: 224px) {
  .kbn-card-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 5px 6px;
    padding-right: 0;
  }
  .kbn-card-side { display: contents; }
  .kbn-card-side .kbn-priority { grid-column: 1 / -1; justify-self: start; }
  .kbn-card-desc { padding-right: 0; }
  .kbn-card-foot { flex-wrap: wrap; gap: 4px 6px; }
}
`);

// Detail header: the edit affordance reuses the card's corner glyph so the two
// surfaces share one style, and sits before the close button at the top-right.
addStyle(`
.kbn-detail-head-actions {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.kbn-detail-edit {
  margin: 0;
  width: 24px;
  height: 24px;
}
`);

// Assignee block: the two labels were removed, so the segmented control and the
// account identity card carry the section on their own with one clear gap.
addStyle(`
.kbn-assignee-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kbn-assignee-block .kbn-seg { align-self: flex-start; }
.kbn-assignee-block .kbn-account-card { max-width: 100%; }
`);

// Pin the meta row (assignee / attachments / status) to the card's bottom-left
// so it sits on the same baseline as the bottom-right send circle instead of
// floating in the middle of a card whose min-height reserves the send lane.
addStyle(`
.kbn-card-foot {
  margin-top: auto;
  align-items: center;
  min-height: 24px;
}
`);

// Keep the card surface neutral. The left accent and selection ring share the
// status tone, including on the detached card used for cross-column motion.
addStyle(`
.kbn-card {
  background: var(--dsw-alias-bg-layer-1);
  border: .5px solid var(--dsw-alias-border-l2);
  border-left: 3px solid var(--kbn-col-tone, var(--dsw-alias-border-l2));
}
.kbn-card:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l3);
  border-left-color: var(--kbn-col-tone, var(--dsw-alias-border-l3));
}
.kbn-card[data-ai=true] {
  border-color: var(--dsw-alias-border-l2);
  border-left-color: var(--kbn-col-tone, var(--dsw-alias-border-l2));
}
.kbn-card[data-ai=true]:hover {
  border-color: var(--dsw-alias-border-l3);
  border-left-color: var(--kbn-col-tone, var(--dsw-alias-border-l3));
}
.kbn-card[data-selected=true],
.kbn-card[data-selected=true]:hover,
.kbn-card[data-ai=true][data-selected=true],
.kbn-card[data-ai=true][data-selected=true]:hover {
  border-color: var(--kbn-col-tone);
  box-shadow: 0 0 0 1px var(--kbn-col-tone);
}
.kbn-card[data-selected=true]:focus-visible {
  outline-color: var(--kbn-col-tone);
}
`);

// Resizable detail pane.
//
// A 6px grab strip adjusts the preferred width within the live board budget.
addStyle(`
.kbn-workbench { align-items: stretch; }
.kbn-workbench[data-resizing=true] { user-select: none; }
.kbn-detail-resizer {
  flex: none;
  width: 6px;
  align-self: stretch;
  position: relative;
  cursor: col-resize;
  border-radius: 999px;
  background: transparent;
  touch-action: none;
  outline: none;
}
.kbn-detail-resizer-grip {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 44px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  opacity: .45;
  transition: opacity .12s var(--ds-ease-in-out), background-color .12s var(--ds-ease-in-out);
}
.kbn-detail-resizer:hover .kbn-detail-resizer-grip,
.kbn-detail-resizer:focus-visible .kbn-detail-resizer-grip,
.kbn-detail-resizer[data-resizing=true] .kbn-detail-resizer-grip {
  opacity: 1;
  background: var(--dsw-alias-state-business-primary);
}
.kbn-detail-resizer[data-resizing=true] .kbn-detail-resizer-grip { height: 100%; }
.kbn-detail-resizer:focus-visible {
  box-shadow: inset 0 0 0 1px var(--dsw-alias-state-business-primary);
  border-radius: var(--dsw-radius-sm);
}

@media (prefers-reduced-motion: reduce) {
  .kbn-detail-resizer-grip { transition: none; }
}
`);

// Detail footer: secondary actions, the destructive action and the primary run
// action share one right-aligned row; the primary sits last (rightmost) and the
// destructive button is separated from it by a small gap.
addStyle(`
.kbn-detail-actions {
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}
.kbn-detail-actions .kbn-btn { flex: none; }
.kbn-detail-actions .kbn-btn[data-variant=primary] {
  min-width: 104px;
  justify-content: center;
}
.kbn-detail-actions .kbn-btn[data-variant=danger] { margin-right: 4px; }
.kbn-detail-actions .kbn-btn[data-variant=danger]:focus-visible,
.kbn-detail-actions .kbn-btn[data-variant=ghost]:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
`);


/* ---- 20-api.js ---- */
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
      throw Object.assign(new Error(hostMessage !== '' ? hostMessage : t('api.httpError', { status: response.status })), {
        status: response.status,
        code: typeof body?.code === 'string' ? body.code : undefined,
      })
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


/* ---- 25-store.js ---- */
/**
 * Client state store for the task board.
 *
 * One module-level singleton (`kanbanStore`) is created by `90-entry.js` and read
 * by every board component. Snapshots are immutable; components subscribe with
 * `use(selector, isEqual?)`, which wraps `useSyncExternalStore` and keeps the
 * selector result referentially stable between unrelated renders.
 *
 * Mutations update the local snapshot from the host response (optimistic where
 * that is safe — update/archive/restore/delete — and authoritative for `move`,
 * whose response carries the whole reordered task list). Failures reject with an
 * `Error` carrying the host message and roll the optimistic change back.
 */

/** @type {ReturnType<typeof createKanbanStore> | null} */
let kanbanStore = null

/** Host route table (docs/ARCHITECTURE.md §3). */
const KANBAN_API_PATHS = {
  state: '/api/kanban.state',
  boardCreate: '/api/kanban.board.create',
  boardRename: '/api/kanban.board.rename',
  boardBind: '/api/kanban.board.bind',
  create: '/api/kanban.task.create',
  update: '/api/kanban.task.update',
  move: '/api/kanban.task.move',
  archive: '/api/kanban.task.archive',
  restore: '/api/kanban.task.restore',
  delete: '/api/kanban.task.delete',
  link: '/api/kanban.task.link',
  upload: '/api/kanban.attachment.upload',
  attachment: '/api/kanban.attachment',
  noteCreate: '/api/kanban.note.create',
  noteUpdate: '/api/kanban.note.update',
  noteDelete: '/api/kanban.note.delete',
}

/** Toast auto-dismiss delay (docs/ARCHITECTURE.md §5). */
const KANBAN_TOAST_MS = 4000

/** Empty snapshot used before the first load. */
function kanbanEmptySnapshot() {
  return {
    status: 'idle',
    workspaces: [],
    boards: [],
    tasks: [],
    notes: [],
    completions: [],
    boardId: null,
    noteDraft: { content: '', color: 'yellow' },
    noteEdits: {},
    noteStatus: {},
    error: null,
    toast: null,
    revision: 0,
    busy: false,
  }
}

/**
 * Read one file as bare base64 (no `data:` prefix) for the upload route.
 * @param {File} file
 * @returns {Promise<string>}
 */
function kanbanReadFileBase64(file) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader !== 'function') {
      reject(new Error(t('api.readFailed')))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error(t('api.readFailed')))
    reader.readAsDataURL(file)
  })
}

/**
 * Create the board store bound to the plugin's client context.
 * @param {object} ctx - Harness client context (`layout`, `uiWorkspace`, `workspaces`, …)
 * @returns {object} the store
 */
function createKanbanStore(ctx) {
  let snapshot = kanbanEmptySnapshot()
  const draftKey = 'dsh-workboard:note-drafts'
  try {
    const cached = JSON.parse(localStorage.getItem(draftKey) || 'null')
    const valid = (draft) => draft && typeof draft.content === 'string' && draft.content.length <= 4000
      && ['yellow', 'pink', 'blue', 'mint', 'purple', 'neutral'].includes(draft.color)
    if (valid(cached?.noteDraft)) snapshot.noteDraft = cached.noteDraft
    for (const [id, draft] of Object.entries(cached?.noteEdits || {})) {
      if (!valid(draft)) continue
      snapshot.noteEdits[id] = draft
      snapshot.noteStatus[id] = 'error'
    }
  } catch { /* Storage may be unavailable; in-memory drafts still work. */ }
  let listeners = new Set()
  let disposed = false
  let toastTimer = null
  let toastSeq = 0
  let refreshToken = 0
  let focusTaskId = null
  const noteTimers = new Map()
  const noteWrites = new Map()

  function getSnapshot() {
    return snapshot
  }

  function emit() {
    if (disposed) return
    listeners.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        // A broken subscriber must not stop the others from updating.
        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          console.error('[kanban] subscriber failed', error)
        }
      }
    })
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  /** Replace the snapshot with the previous object plus `patch`, then notify. */
  function setSnapshot(patch) {
    snapshot = Object.assign({}, snapshot, patch)
    if ('noteDraft' in patch || 'noteEdits' in patch) {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ noteDraft: snapshot.noteDraft, noteEdits: snapshot.noteEdits }))
      } catch { /* Keep the current draft even when storage is full. */ }
    }
    emit()
  }

  /** Replace the snapshot as a new object, bumping `revision` for data changes. */
  function commit(patch) {
    setSnapshot(Object.assign({}, patch, { revision: snapshot.revision + 1 }))
  }

  /**
   * Subscribe one component to a slice of the snapshot.
   * @param {(state: object) => any} [selector]
   * @param {(left: any, right: any) => boolean} [isEqual]
   * @returns {any}
   */
  function use(selector, isEqual) {
    const select = typeof selector === 'function' ? selector : null
    const equal = typeof isEqual === 'function' ? isEqual : Object.is
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    const cache = useRef(null)
    const next = select === null ? state : select(state)
    if (cache.current === null || !equal(cache.current.value, next)) {
      cache.current = { value: next }
    }
    return cache.current.value
  }

  /** Put one host task into the snapshot (replacing an existing entry). */
  function replaceTask(task) {
    if (task === null || task === undefined || typeof task.id !== 'string') return
    const tasks = snapshot.tasks.slice()
    const index = tasks.findIndex((item) => item !== null && item.id === task.id)
    if (index >= 0) tasks[index] = task
    else tasks.push(task)
    commit({ tasks })
  }

  /**
   * Fetch the whole board state. Keeps the last good data when the request fails.
   * @returns {Promise<void>}
   */
  async function refresh() {
    const token = ++refreshToken
    setSnapshot({ status: 'loading' })
    try {
      const body = await apiGet(KANBAN_API_PATHS.state)
      if (token !== refreshToken) return
      setSnapshot({
        status: 'ready',
        workspaces: body !== null && Array.isArray(body.workspaces) ? body.workspaces : [],
        boards: body !== null && Array.isArray(body.boards) ? body.boards : [],
        tasks: body !== null && Array.isArray(body.tasks) ? body.tasks : [],
        notes: Array.isArray(body?.notes) ? body.notes : [],
        completions: Array.isArray(body?.completions) ? body.completions : [],
        error: null,
        revision: snapshot.revision + 1,
      })
      if (focusTaskId) {
        const task = taskById(snapshot, focusTaskId)
        if (task && !task.archived) setSnapshot({ boardId: task.workspaceId })
      }
    } catch (error) {
      if (token !== refreshToken) return
      setSnapshot({ status: 'error', error: messageOf(error) })
    }
  }

  /**
   * Create a task in one workspace.
   * @param {string} workspaceId
   * @param {object} input
   * @returns {Promise<object>} the created task
   */
  async function createTask(workspaceId, input) {
    const body = await apiPost(KANBAN_API_PATHS.create, { workspaceId, input: input || {} })
    const task = body !== null ? body.task : null
    if (task === null || task === undefined || typeof task.id !== 'string') {
      throw new Error(t('api.badResponse'))
    }
    replaceTask(task)
    if (Array.isArray(body.completions)) commit({ completions: body.completions })
    return task
  }

  /**
   * Patch one task (optimistic, then the host's authoritative task).
   * @param {string} id
   * @param {object} patch
   * @returns {Promise<object>} the updated task
   */
  async function updateTask(id, patch) {
    const previous = taskById(snapshot, id)
    if (previous !== null) replaceTask(Object.assign({}, previous, patch))
    try {
      const body = await apiPost(KANBAN_API_PATHS.update, { id, patch })
      const task = body !== null ? body.task : null
      if (task === null || task === undefined) throw new Error(t('api.badResponse'))
      replaceTask(task)
      if (Array.isArray(body.completions)) commit({ completions: body.completions })
      return task
    } catch (error) {
      if (previous !== null) replaceTask(previous)
      throw error
    }
  }

  /**
   * Move a task into a column, optionally before another task. Authoritative:
   * the host returns the whole reordered task list.
   * @param {string} id
   * @param {'todo' | 'doing' | 'done'} status
   * @param {string} [beforeId]
   * @returns {Promise<void>}
   */
  async function moveTask(id, status, beforeId) {
    const payload = { id, status }
    if (typeof beforeId === 'string' && beforeId !== '') payload.beforeId = beforeId
    const body = await apiPost(KANBAN_API_PATHS.move, payload)
    const tasks = body !== null && Array.isArray(body.tasks) ? body.tasks : null
    if (tasks === null) throw new Error(t('api.badResponse'))
    commit({ tasks, completions: body.completions || snapshot.completions })
  }

  /** Archive or restore only the specified board task, preserving its session link. */
  async function setTaskArchived(id, archived) {
    const previous = taskById(snapshot, id)
    if (previous !== null) {
      replaceTask({ ...previous, archived, archivedAt: archived ? new Date().toISOString() : null })
    }
    try {
      const path = archived ? KANBAN_API_PATHS.archive : KANBAN_API_PATHS.restore
      const body = await apiPost(path, { id })
      if (body?.task?.id !== id || body.task.archived !== archived) throw new Error(t('api.badResponse'))
      replaceTask(body.task)
      return body.task
    } catch (error) {
      if (previous !== null) replaceTask(previous)
      // A lost response can follow a successful write. Reconcile only with the board.
      await refresh()
      const saved = taskById(snapshot, id)
      if (snapshot.status === 'ready' && saved?.archived === archived) return saved
      throw error
    }
  }

  /**
   * Keep the task and its editor mounted until the host confirms deletion.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async function deleteTask(id) {
    await apiPost(KANBAN_API_PATHS.delete, { id })
    commit({ tasks: snapshot.tasks.filter((task) => task.id !== id) })
  }

  /**
   * Link (or unlink, with `null`) a harness session to a task.
   * @param {string} id
   * @param {string | null} sessionId
   * @returns {Promise<object>} the updated task
   */
  async function linkSession(id, sessionId, expectedSessionId) {
    const body = await apiPost(KANBAN_API_PATHS.link, {
      id, expectedSessionId,
      sessionId: typeof sessionId === 'string' && sessionId !== '' ? sessionId : null,
    })
    const task = body !== null ? body.task : null
    if (task === null || task === undefined) throw new Error(t('api.badResponse'))
    replaceTask(task)
    return task
  }

  /**
   * Upload one attachment; returns the host attachment record.
   * @param {File} file
   * @returns {Promise<{ id: string, name: string, size: number, type: string }>}
   */
  /**
   * Create one standalone board (no workspace directory yet).
   * @param {string} title
   * @returns {Promise<object>} the created board
   */
  async function createBoard(title) {
    const body = await apiPost(KANBAN_API_PATHS.boardCreate, { title })
    const board = body !== null && body !== undefined ? body.board : null
    if (board === null || board === undefined || typeof board.id !== 'string') {
      throw new Error(t('api.badResponse'))
    }
    commit({ boards: (snapshot.boards || []).concat([board]) })
    return board
  }

  async function renameBoard(boardId, title) {
    const { board } = await apiPost(KANBAN_API_PATHS.boardRename, { boardId, title })
    if (board?.id !== boardId || typeof board.title !== 'string') throw new Error(t('api.badResponse'))
    if (workspaceOf(snapshot, boardId)) {
      commit({ workspaces: snapshot.workspaces.map((ws) => ws.id === boardId ? { ...ws, boardTitle: board.title } : ws) })
    } else {
      commit({ boards: snapshot.boards.map((entry) => entry.id === boardId ? { ...entry, title: board.title } : entry) })
    }
    return board
  }

  /**
   * Bind one standalone board to a workspace directory; the host moves its tasks
   * to the workspace board and the snapshot is reloaded.
   * @param {string} boardId
   * @param {string} workspaceId
   * @returns {Promise<void>}
   */
  async function bindBoard(boardId, workspaceId) {
    await apiPost(KANBAN_API_PATHS.boardBind, { boardId, workspaceId })
    // Migrate the selected identity before refreshing away the standalone board.
    if (kbnLastWorkspaceId === boardId) kbnRememberBoard(workspaceId)
    if (snapshot.boardId === boardId) setSnapshot({ boardId: workspaceId })
    await refresh()
  }

  async function uploadAttachment(file, workspaceId) {
    if (file === null || file === undefined) throw new Error(t('api.noFile'))
    const data = await kanbanReadFileBase64(file)
    const body = await apiPost(KANBAN_API_PATHS.upload, {
      name: typeof file.name === 'string' ? file.name : 'attachment',
      type: typeof file.type === 'string' ? file.type : '',
      workspaceId: typeof workspaceId === 'string' ? workspaceId : '',
      data,
    })
    const attachment = body !== null ? body.attachment : null
    if (attachment === null || attachment === undefined) throw new Error(t('api.badResponse'))
    return attachment
  }

  /**
   * Same-origin download URL for one stored attachment.
   * @param {string} id
   * @returns {string}
   */
  function attachmentUrl(id) {
    return KANBAN_API_PATHS.attachment + '?id=' + encodeURIComponent(String(id))
  }

  /** Request that the board reveal/select one task on its next revision change. */
  function setFocusTask(taskId) {
    if (typeof taskId !== 'string' || taskId === '') return
    focusTaskId = taskId
    const task = taskById(snapshot, taskId)
    commit({ boardId: task?.workspaceId || null })
    if (!task) refresh()
  }

  function openBoard(boardId) {
    focusTaskId = null
    kbnRememberBoard(boardId)
    setSnapshot({ boardId })
  }

  function openHome() {
    focusTaskId = null
    setSnapshot({ boardId: null })
  }

  function setNoteDraft(patch) {
    setSnapshot({ noteDraft: { ...snapshot.noteDraft, ...patch } })
  }

  async function createNote(input) {
    const { note } = await apiPost(KANBAN_API_PATHS.noteCreate, { input })
    if (!note?.id) throw new Error(t('api.badResponse'))
    commit({ notes: [...snapshot.notes, note] })
    return note
  }

  function setNoteStatus(id, status) {
    setSnapshot({ noteStatus: { ...snapshot.noteStatus, [id]: status } })
  }

  // Drafts and writes outlive the home component, so navigation cannot discard
  // a pending edit. Each note's requests are serialized; older responses never
  // replace newer typing. An error retains the draft for explicit retry.
  function editNote(id, patch) {
    const current = snapshot.noteEdits[id] || snapshot.notes.find((note) => note.id === id)
    if (!current) return
    setSnapshot({ noteEdits: { ...snapshot.noteEdits, [id]: { content: current.content, color: current.color, ...patch } } })
    setNoteStatus(id, 'pending')
    clearTimeout(noteTimers.get(id))
    noteTimers.set(id, setTimeout(() => flushNote(id).catch(() => undefined), 600))
  }

  function flushNote(id) {
    clearTimeout(noteTimers.get(id))
    noteTimers.delete(id)
    const pending = noteWrites.get(id) || Promise.resolve()
    const write = pending.catch(() => undefined).then(async () => {
      const input = snapshot.noteEdits[id]
      if (!input) return
      if (!input.content.trim()) {
        setNoteStatus(id, 'empty')
        return
      }
      setNoteStatus(id, 'saving')
      try {
        const { note } = await apiPost(KANBAN_API_PATHS.noteUpdate, { id, input })
        if (note?.id !== id) throw new Error(t('api.badResponse'))
        const edits = { ...snapshot.noteEdits }
        const current = edits[id]
        const unchanged = current?.content === input.content && current?.color === input.color
        if (unchanged) delete edits[id]
        commit({ notes: snapshot.notes.map((entry) => entry.id === id ? note : entry), noteEdits: edits })
        setNoteStatus(id, unchanged ? 'saved' : 'pending')
      } catch (error) {
        setNoteStatus(id, 'error')
        throw error
      }
    })
    noteWrites.set(id, write)
    write.finally(() => { if (noteWrites.get(id) === write) noteWrites.delete(id) }).catch(() => undefined)
    return write
  }

  async function deleteNote(id) {
    clearTimeout(noteTimers.get(id))
    noteTimers.delete(id)
    await (noteWrites.get(id) || Promise.resolve()).catch(() => undefined)
    await apiPost(KANBAN_API_PATHS.noteDelete, { id })
    const edits = { ...snapshot.noteEdits }
    const statuses = { ...snapshot.noteStatus }
    delete edits[id]
    delete statuses[id]
    commit({ notes: snapshot.notes.filter((note) => note.id !== id), noteEdits: edits, noteStatus: statuses })
  }

  /** Consume a pending reveal request. @returns {string | null} */
  function takeFocusTask() {
    const id = focusTaskId
    focusTaskId = null
    return id
  }

  /** Toggle the lightweight global busy flag. */
  function setBusy(flag) {
    setSnapshot({ busy: Boolean(flag) })
  }

  /** Show one toast for 4s; a newer toast replaces the current one. */
  function toast(message, kind) {
    const id = ++toastSeq
    if (toastTimer !== null) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
    setSnapshot({
      toast: {
        id,
        message: typeof message === 'string' ? message : String(message),
        kind: kind === 'error' ? 'error' : 'info',
      },
    })
    toastTimer = setTimeout(() => {
      toastTimer = null
      if (snapshot.toast !== null && snapshot.toast.id === id) setSnapshot({ toast: null })
    }, KANBAN_TOAST_MS)
  }

  /** Re-render every subscriber after a locale change (copy is read at render). */
  function notifyLocale() {
    commit({})
  }

  /** Release subscriptions and timers; called by the plugin entry on dispose. */
  function dispose() {
    noteTimers.forEach(clearTimeout)
    noteTimers.clear()
    Object.keys(snapshot.noteEdits).forEach((id) => flushNote(id).catch(() => undefined))
    disposed = true
    if (toastTimer !== null) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
    listeners.clear()
    listeners = new Set()
    focusTaskId = null
  }

  return {
    use,
    getSnapshot,
    subscribe,
    refresh,
    openHome,
    openBoard,
    setNoteDraft,
    createNote,
    editNote,
    flushNote,
    deleteNote,
    createTask,
    updateTask,
    moveTask,
    archiveTask: (id) => setTaskArchived(id, true),
    restoreTask: (id) => setTaskArchived(id, false),
    deleteTask,
    linkSession,
    createBoard,
    bindBoard,
    renameBoard,
    uploadAttachment,
    attachmentUrl,
    setFocusTask,
    takeFocusTask,
    setBusy,
    toast,
    notifyLocale,
    dispose,
    ctx,
  }
}

/* ------------------------------------------------------------------ derived */

/**
 * Active (non-archived) tasks of one workspace, in board order.
 * @param {object} snapshot
 * @param {string} workspaceId
 * @returns {object[]}
 */
function tasksOf(snapshot, workspaceId) {
  if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.tasks)) return []
  return snapshot.tasks
    .filter((task) => task !== null && task !== undefined
      && task.workspaceId === workspaceId
      && task.archived !== true)
    .slice()
    .sort((left, right) => {
      const leftOrder = typeof left.order === 'number' ? left.order : 0
      const rightOrder = typeof right.order === 'number' ? right.order : 0
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return String(left.createdAt || '').localeCompare(String(right.createdAt || ''))
    })
}

/**
 * Archived tasks, most recently archived first.
 * @param {object} snapshot
 * @returns {object[]}
 */
function archivedTasks(snapshot) {
  if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.tasks)) return []
  return snapshot.tasks
    .filter((task) => task !== null && task !== undefined && task.archived === true)
    .slice()
    .sort((left, right) => {
      const leftAt = String(left.archivedAt || left.updatedAt || '')
      const rightAt = String(right.archivedAt || right.updatedAt || '')
      return rightAt.localeCompare(leftAt)
    })
}

/**
 * One task by id, archived or not.
 * @param {object} snapshot
 * @param {string} id
 * @returns {object | null}
 */
function taskById(snapshot, id) {
  if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.tasks)) return null
  if (typeof id !== 'string' || id === '') return null
  const found = snapshot.tasks.find((task) => task !== null && task !== undefined && task.id === id)
  return found === undefined ? null : found
}

function tasksForSession(snapshot, sessionId) {
  if (!sessionId) return []
  return snapshot.tasks.filter((task) => !task.archived && task.sessionId === sessionId)
}

/**
 * One workspace by id.
 * @param {object} snapshot
 * @param {string} workspaceId
 * @returns {object | null}
 */
function workspaceOf(snapshot, workspaceId) {
  if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.workspaces)) return null
  if (typeof workspaceId !== 'string' || workspaceId === '') return null
  const found = snapshot.workspaces.find((workspace) => workspace !== null
    && workspace !== undefined
    && workspace.id === workspaceId)
  return found === undefined ? null : found
}

/**
 * Every board the selector offers: each harness workspace is a board bound to
 * its directory, followed by standalone boards that are not bound yet.
 * @param {object} snapshot
 * @returns {Array<{ id: string, title: string, path: string, bound: boolean }>}
 */
function boardsOf(snapshot) {
  const boards = []
  if (snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.workspaces)) {
    for (const workspace of snapshot.workspaces) {
      if (workspace === null || workspace === undefined) continue
      boards.push({
        id: workspace.id,
        title: workspace.boardTitle || workspace.title || String(workspace.path || ''),
        path: typeof workspace.path === 'string' ? workspace.path : '',
        bound: true,
      })
    }
  }
  if (snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.boards)) {
    for (const board of snapshot.boards) {
      if (board === null || board === undefined || typeof board.id !== 'string') continue
      boards.push({
        id: board.id,
        title: typeof board.title === 'string' && board.title !== '' ? board.title : t('board.untitled'),
        path: '',
        bound: false,
      })
    }
  }
  return boards
}

/**
 * One board by id (bound workspace board or standalone board).
 * @param {object} snapshot
 * @param {string} boardId
 * @returns {{ id: string, title: string, path: string, bound: boolean } | null}
 */
function boardOf(snapshot, boardId) {
  if (typeof boardId !== 'string' || boardId === '') return null
  const found = boardsOf(snapshot).find((board) => board.id === boardId)
  return found === undefined ? null : found
}


/* ---- 30-icons.js ---- */
/** Direct aliases to the host's icon exports; no copied SVG paths. */
const KBN_ICONS = {
  board: 'IconFlatListOutlineRegular', plus: 'IconPlusOutlineRegular',
  archive: 'IconArchiveOutlineRegular', unarchive: 'IconUnarchiveOutlineRegular',
  trash: 'IconTrashOutlineRegular', close: 'IconCloseOutlineRegular',
  chevronDown: 'IconChevronDownOutlineRegular', chevronLeft: 'IconChevronLeftOutlineRegular',
  chevronRight: 'IconChevronRightOutlineRegular', check: 'IconCheckOutlineRegular',
  play: 'IconPlayOutlineRegular', sparkle: 'IconEnhanceOutlineRegular',
  user: 'IconUserOutlineRegular', paperclip: 'IconPaperclipOutlineRegular',
  warning: 'IconWarningTriangleOutlineRegular', clock: 'IconClockOutlineRegular',
  search: 'IconSearchOutlineRegular', refresh: 'IconRefreshOutlineRegular',
  projectAdd: 'IconProjectAddOutlineRegular', workspace: 'IconFolderOpenOutlineRegular',
  send: 'IconSendOutlineRegular', link: 'IconLinkOutlineRegular',
  folderOpen: 'IconFolderOpenOutlineRegular', checkCircle: 'IconCheckCircleOutlineRegular',
  stop: 'IconStopFillRegular', edit: 'IconEditOutlineRegular',
  download: 'IconDownloadOutlineRegular', data: 'IconDataOutlineRegular',
}

function Icon({ name, size = 16, className, style }) {
  return h(DshUI[KBN_ICONS[name] || KBN_ICONS.board], { size, className, style, 'aria-hidden': true })
}


/* ---- 35-widgets.js ---- */
/**
 * Generic widgets shared by the board, editor and archive parts.
 *
 * Props are exactly those documented in docs/ARCHITECTURE.md §5; every class is
 * `kbn-` prefixed and styled by `10-style-base.js`. All visible copy goes
 * through `t()` and the widget keys below are namespaced so they cannot
 * collide with `05-l10n.js`.
 */
addDict(
  {
    'widget.required': '必填',
    'widget.closeDialog': '关闭对话框',
    'widget.dialog': '对话框',
    'widget.removeTag': '移除',
  },
  {
    'widget.required': 'Required',
    'widget.closeDialog': 'Close dialog',
    'widget.dialog': 'Dialog',
    'widget.removeTag': 'Remove',
  },
)

/**
 * Inline loading indicator.
 * @param {{ size?: number, label?: string }} props
 * @returns {object} React element
 */
function Spinner({ size = 16, label }) {
  const px = Number(size) > 0 ? Number(size) : 16
  return h('span', {
    className: 'kbn-spinner',
    role: label ? 'status' : undefined,
    'aria-label': label || undefined,
    'aria-hidden': label ? undefined : 'true',
    style: { width: px + 'px', height: px + 'px' },
  })
}

/**
 * Standard button. `busy` keeps the button disabled and swaps the leading
 * icon for a small spinner, while exposing `aria-busy`.
 * @param {object} props
 * @returns {object} React element
 */
function Button({
  variant = 'ghost',
  size = 'md',
  icon,
  iconRight = false,
  disabled = false,
  busy = false,
  onClick,
  type = 'button',
  title,
  className,
  children,
}) {
  const inactive = disabled || busy
  const content = []
  if (busy) {
    content.push(h(Spinner, { key: 'busy', size: 14 }))
  } else if (icon && !iconRight) {
    content.push(h(Fragment, { key: 'icon' }, icon))
  }
  if (children !== undefined && children !== null && children !== '') {
    content.push(h(Fragment, { key: 'label' }, children))
  }
  if (icon && iconRight && !busy) {
    content.push(h(Fragment, { key: 'iconRight' }, icon))
  }
  return h('button', {
    type: type === 'submit' ? 'submit' : 'button',
    className: cx('kbn-btn', className),
    'data-variant': variant,
    'data-size': size,
    title,
    disabled: inactive,
    'aria-busy': busy ? 'true' : undefined,
    onClick: inactive ? undefined : onClick,
  }, content)
}

/**
 * Square icon-only button; `label` is the accessible name and the tooltip.
 * @param {{ icon?: object, label: string, size?: 28 | 24, disabled?: boolean, onClick?: Function, variant?: 'ghost' | 'outline' }} props
 * @returns {object} React element
 */
function IconButton({
  icon,
  label,
  size = 28,
  disabled = false,
  onClick,
  variant = 'ghost',
  className,
  ariaExpanded,
  ariaHasPopup,
}) {
  return h('button', {
    type: 'button',
    className: cx('kbn-icon-btn', className),
    'data-size': size,
    'data-variant': variant,
    'aria-label': label,
    'aria-expanded': ariaExpanded === undefined ? undefined : (ariaExpanded ? 'true' : 'false'),
    'aria-haspopup': ariaHasPopup || undefined,
    title: label,
    disabled: disabled || undefined,
    onClick: disabled ? undefined : onClick,
  }, icon)
}

/**
 * Labelled form row: label + optional hint, the control, then an error line.
 * @param {{ label?: string, hint?: string, error?: string, required?: boolean, htmlFor?: string, children?: object }} props
 * @returns {object} React element
 */
function Field({ label, hint, error, required = false, htmlFor, children }) {
  const hasHead = Boolean(label) || Boolean(hint)
  return h('div', { className: 'kbn-field' },
    hasHead
      ? h('div', { className: 'kbn-label-row' },
        label
          ? h('label', {
            className: 'kbn-label',
            htmlFor,
            'data-required': required ? 'true' : undefined,
          },
          label,
          required ? h('span', { className: 'kbn-visually-hidden' }, ' ' + t('widget.required')) : null)
          : null,
        hint ? h('span', { className: 'kbn-hint' }, hint) : null)
      : null,
    children,
    error ? h('span', { className: 'kbn-error-text', role: 'alert' }, error) : null,
  )
}

/**
 * Single-line text input. `onChange` receives the new value (value-first).
 * @param {object} props
 * @returns {object} React element
 */
function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  disabled = false,
  autoFocus = false,
  maxLength,
  onKeyDown,
  ariaLabel,
}) {
  return h('div', { className: 'kbn-input-wrap', 'data-icon': icon ? 'true' : undefined },
    icon ? h('span', { className: 'kbn-input-icon', 'aria-hidden': 'true' }, icon) : null,
    h('input', {
      className: 'kbn-input',
      type,
      'data-empty': (value === undefined || value === null || value === '') ? 'true' : undefined,
      value: value === undefined || value === null ? '' : value,
      placeholder,
      disabled: disabled || undefined,
      autoFocus: autoFocus || undefined,
      maxLength,
      'aria-label': ariaLabel || undefined,
      onChange: (event) => {
        if (typeof onChange === 'function') onChange(event.target.value)
      },
      onKeyDown,
    }),
  )
}

/**
 * Multi-line text input. `onChange` receives the new value.
 * @param {object} props
 * @returns {object} React element
 */
function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  maxLength,
  ariaLabel,
  disabled = false,
  autoFocus = false,
  onKeyDown,
}) {
  const ref = useRef(null)
  // Grow with the content so an empty field never reserves blank lines; the
  // stylesheet keeps a compact minimum and a scrollable maximum.
  const resize = () => {
    const element = ref.current
    if (element === null || element === undefined) return
    element.style.height = 'auto'
    element.style.height = Math.min(220, Math.max(64, element.scrollHeight)) + 'px'
  }
  useEffect(resize, [value])
  return h('textarea', {
    ref,
    className: 'kbn-textarea',
    rows,
    value: value === undefined || value === null ? '' : value,
    placeholder,
    maxLength,
    disabled: disabled || undefined,
    autoFocus: autoFocus || undefined,
    'aria-label': ariaLabel || undefined,
    onChange: (event) => {
      if (typeof onChange === 'function') onChange(event.target.value)
    },
    onKeyDown,
  })
}

/**
 * Native `<select>` with a host-matched chevron. `onChange` receives the
 * selected value string.
 * @param {{ value?: string, onChange?: Function, options?: Array<{ value: string, label: string }>, placeholder?: string, disabled?: boolean, ariaLabel?: string, autoFocus?: boolean, onKeyDown?: Function }} props
 * @returns {object} React element
 */
function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  ariaLabel,
  autoFocus = false,
  onKeyDown,
}) {
  const current = value === undefined || value === null ? '' : String(value)
  const opts = Array.isArray(options) ? options : []
  return h('div', { className: 'kbn-input-wrap', 'data-select': 'true' },
    h('select', {
      className: 'kbn-select',
      value: current,
      disabled: disabled || undefined,
      autoFocus: autoFocus || undefined,
      'aria-label': ariaLabel || undefined,
      onChange: (event) => {
        if (typeof onChange === 'function') onChange(event.target.value)
      },
      onKeyDown,
    },
      placeholder ? h('option', { value: '', disabled: true }, placeholder) : null,
      opts.map((option) => h('option', {
        key: String(option.value),
        value: String(option.value),
      }, option.label))),
    h('span', {
      className: 'kbn-input-icon',
      'data-side': 'right',
      'aria-hidden': 'true',
    }, h(Icon, { name: 'chevronDown', size: 16 })),
  )
}

/**
 * Pill-shaped label. `onRemove` adds an accessible remove button.
 * @param {{ tone?: 'neutral' | 'brand' | 'success' | 'warn' | 'danger', icon?: object, onRemove?: Function, children?: object }} props
 * @returns {object} React element
 */
function Chip({ tone = 'neutral', icon, onRemove, children }) {
  return h('span', { className: 'kbn-chip', 'data-tone': tone },
    icon || null,
    children,
    onRemove
      ? h('button', {
        type: 'button',
        className: 'kbn-icon-btn',
        'data-size': '16',
        'data-variant': 'ghost',
        'aria-label': t('widget.removeTag'),
        title: t('widget.removeTag'),
        onClick: (event) => {
          event.stopPropagation()
          onRemove(event)
        },
      }, h(Icon, { name: 'close', size: 12 }))
      : null,
  )
}

function widgetTabStops(root) {
  if (!root) return []
  const selector = 'button,input,select,textarea,a[href],audio[controls],video[controls],[tabindex]'
  return Array.from(root.querySelectorAll(selector)).filter((element) =>
    !element.matches(':disabled, [type="hidden"]') && element.tabIndex >= 0 &&
    !element.closest('[inert]') && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility === 'visible')
}

/** Let the browser tab between controls; wrap only at the dialog edges. */
function containDialogTab(event, dialog) {
  if (event.key !== 'Tab' || event.defaultPrevented || !dialog) return
  const stops = widgetTabStops(dialog)
  const active = document.activeElement
  const boundary = event.shiftKey ? stops[0] : stops[stops.length - 1]
  if (active !== boundary && active !== dialog && dialog.contains(active) && stops.length > 0) return
  event.preventDefault()
  const next = (event.shiftKey ? stops[stops.length - 1] : stops[0]) || dialog
  next.focus()
}

/**
 * Modal dialog: fixed masked overlay, internal scrolling body, footer slot.
 * Closed renders nothing. While open it locks body scroll, focuses the first
 * field (else the dialog), closes on Escape / mask click unless busy, and
 * restores the previously focused element.
 * @param {object} props
 * @returns {object | null} React element
 */
function Modal({
  open,
  onClose,
  title,
  icon,
  width = 520,
  busy = false,
  footer,
  labelledBy,
  onFileDrag,
  children,
}) {
  const dialogRef = useRef(null)
  const restoreRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const body = document.body
    const previousOverflow = body.style.overflow
    const previouslyFocused = document.activeElement
    restoreRef.current = previouslyFocused && typeof previouslyFocused.focus === 'function'
      ? previouslyFocused
      : null
    body.style.overflow = 'hidden'

    let frame = 0
    const focusDialog = () => {
      const dialog = dialogRef.current
      if (!dialog) return
      // A native autoFocus inside the body already won; don't steal it.
      if (dialog.contains(document.activeElement) && document.activeElement !== dialog) return
      const first = widgetTabStops(dialog.querySelector('.kbn-dialog-body'))[0] || widgetTabStops(dialog)[0]
      if (first) first.focus()
      else dialog.focus()
    }
    if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(focusDialog)
    else focusDialog()

    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
      body.style.overflow = previousOverflow
      const previous = restoreRef.current
      restoreRef.current = null
      if (previous && typeof previous.focus === 'function' && previous.isConnected !== false) previous.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      containDialogTab(event, dialogRef.current)
      if (event.key !== 'Escape' || busy) return
      event.stopPropagation()
      if (typeof onClose === 'function') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onClose])

  if (!open) return null

  const handleMaskClick = (event) => {
    if (busy) return
    if (event.target !== event.currentTarget) return
    if (typeof onClose === 'function') onClose()
  }

  const aria = labelledBy
    ? { 'aria-labelledby': labelledBy }
    : { 'aria-label': title || t('widget.dialog') }

  return h('div', {
    className: 'kbn-mask', onClick: handleMaskClick,
    onDragEnter: onFileDrag, onDragOver: onFileDrag, onDragLeave: onFileDrag, onDrop: onFileDrag,
  },
    h('div', {
      className: 'kbn-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      ...aria,
      ref: dialogRef,
      tabIndex: -1,
      style: { width: typeof width === 'number' ? width + 'px' : width },
    },
      h('div', { className: 'kbn-dialog-head' },
        icon ? h('span', { className: 'kbn-dialog-icon', 'aria-hidden': 'true' }, icon) : null,
        title ? h('h2', { className: 'kbn-dialog-title' }, title) : null,
        h('button', {
          type: 'button',
          className: 'kbn-dialog-close',
          'aria-label': t('widget.closeDialog'),
          title: t('common.close'),
          disabled: busy || undefined,
          onClick: busy ? undefined : onClose,
        }, h(Icon, { name: 'close', size: 16 })),
      ),
      h('div', { className: 'kbn-dialog-body' }, children),
      footer ? h('div', { className: 'kbn-dialog-foot' }, footer) : null,
    ),
  )
}

/**
 * Placeholder for an empty collection.
 * @param {{ icon?: object, title?: string, description?: string, action?: object }} props
 * @returns {object} React element
 */
function EmptyState({ icon, title, description, action }) {
  return h('div', { className: 'kbn-empty' },
    icon ? h('span', { className: 'kbn-empty-icon', 'aria-hidden': 'true' }, icon) : null,
    title ? h('div', { className: 'kbn-empty-title' }, title) : null,
    description ? h('p', { className: 'kbn-empty-desc' }, description) : null,
    action ? h('div', { className: 'kbn-empty-action' }, action) : null,
  )
}

/**
 * Renders the store's transient toast (auto-dismissal lives in the store).
 * @returns {object | null} React element
 */
function ToastHost() {
  const toast = kanbanStore.use((state) => state.toast)
  if (!toast) return null
  const kind = toast.kind === 'error' ? 'error' : 'info'
  return h('div', {
    key: toast.id,
    className: 'kbn-toast',
    'data-kind': kind,
    role: 'status',
    'aria-live': 'polite',
  },
    h(Icon, { name: kind === 'error' ? 'warning' : 'checkCircle', size: 16 }),
    h('span', null, toast.message))
}


/* ---- 36-date-field.js ---- */
/**
 * DSH-styled date field.
 *
 * The browser's native `<input type="date">` popup cannot be themed, so the
 * board ships its own: a text field plus a floating calendar surface built from
 * the same theme tokens and control geometry as the rest of the panel. Typing
 * `YYYY-MM-DD` (or `YYYY/MM/DD`) still works; the panel is viewport-fixed and
 * positioned from the field's rect, so the dialog's scroll container never clips
 * it and it flips above the field when there is more room above.
 */
addDict(
  {
    'date.placeholder': '选择日期',
    'date.open': '打开日期选择',
    'date.today': '今天',
    'date.clear': '清除',
    'date.prevMonth': '上个月',
    'date.nextMonth': '下个月',
    'date.calendar': '日期选择',
  },
  {
    'date.placeholder': 'Select date',
    'date.open': 'Open date picker',
    'date.today': 'Today',
    'date.clear': 'Clear',
    'date.prevMonth': 'Previous month',
    'date.nextMonth': 'Next month',
    'date.calendar': 'Date picker',
  },
)

/** Short weekday names, Sunday first, in the active locale. */
function kbnWeekdayLabels() {
  const labels = []
  const base = new Date(2023, 0, 1) // a Sunday
  for (let index = 0; index < 7; index += 1) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + index)
    try {
      labels.push(new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'narrow' }).format(day))
    } catch {
      labels.push(['S', 'M', 'T', 'W', 'T', 'F', 'S'][index])
    }
  }
  return labels
}

/**
 * Localized month + year title.
 * @param {number} year
 * @param {number} month - zero based
 * @returns {string}
 */
function kbnMonthTitle(year, month) {
  try {
    return new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
    }).format(new Date(year, month, 1))
  } catch {
    return year + '-' + pad2(month + 1)
  }
}

/**
 * Parse a typed date. Accepts `YYYY-MM-DD`, `YYYY/MM/DD` and `YYYY.MM.DD`.
 * @param {string} text
 * @returns {{ year: number, month: number, day: number } | null}
 */
function kbnParseTypedDay(text) {
  const match = /^\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s*$/.exec(text)
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const probe = new Date(year, month, day)
  if (probe.getFullYear() !== year || probe.getMonth() !== month || probe.getDate() !== day) return null
  return { year, month, day }
}

/**
 * Six-week day matrix for one month, including the leading/trailing days that
 * complete the first and last week so the grid never reflows.
 * @param {number} year
 * @param {number} month - zero based
 * @returns {Array<{ iso: string, day: number, inMonth: boolean }>}
 */
function kbnMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const offset = first.getDay()
  const cells = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(year, month, 1 - offset + index)
    cells.push({
      iso: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
    })
  }
  return cells
}

/**
 * Month state for a stored day, falling back to today.
 * @param {string} value
 * @returns {{ year: number, month: number }}
 */
function kbnDayMonthOf(value) {
  const parsed = kbnParseTypedDay(value)
  if (parsed !== null) return { year: parsed.year, month: parsed.month }
  const today = new Date()
  return { year: today.getFullYear(), month: today.getMonth() }
}

/**
 * Floating-panel geometry for one anchor: viewport-fixed, flipped upwards when
 * the dialog has more room above than below, and clamped inside the viewport.
 * @param {Element | null} anchor
 * @returns {{ top?: number, bottom?: number, left: number, width: number, maxHeight: number, placement: 'bottom' | 'top' }}
 */
function kbnDateGeometry(anchor) {
  const viewportWidth = typeof window !== 'undefined' && Number.isFinite(window.innerWidth) ? window.innerWidth : 1200
  const viewportHeight = typeof window !== 'undefined' && Number.isFinite(window.innerHeight) ? window.innerHeight : 800
  const margin = 12
  const gap = 6
  let rect = null
  if (anchor !== null && anchor !== undefined && typeof anchor.getBoundingClientRect === 'function') {
    rect = anchor.getBoundingClientRect()
  }
  const anchorWidth = rect !== null && rect.width > 0 ? rect.width : 248
  const anchorTop = rect !== null ? rect.top : 60
  const anchorBottom = rect !== null ? rect.bottom : 96
  const width = Math.min(Math.max(anchorWidth, 232), viewportWidth - margin * 2)
  const left = Math.min(Math.max(margin, rect !== null ? rect.left : margin), viewportWidth - margin - width)
  const spaceBelow = viewportHeight - anchorBottom - gap - margin
  const spaceAbove = anchorTop - gap - margin
  const placement = spaceBelow >= 300 || spaceBelow >= spaceAbove ? 'bottom' : 'top'
  const maxHeight = Math.max(180, Math.floor(placement === 'bottom' ? spaceBelow : spaceAbove))
  if (placement === 'bottom') return { placement, left, width, maxHeight, top: anchorBottom + gap }
  return { placement, left, width, maxHeight, bottom: viewportHeight - anchorTop + gap }
}

/**
 * Date field with a host-styled floating calendar.
 * @param {{ value?: string, onChange?: (value: string) => void, placeholder?: string,
 *   disabled?: boolean, autoFocus?: boolean, ariaLabel?: string, initiallyOpen?: boolean }} props
 * @returns {object} React element
 */
function DateField({
  value,
  onChange,
  placeholder,
  disabled = false,
  autoFocus = false,
  ariaLabel,
  initiallyOpen = false,
}) {
  const current = typeof value === 'string' ? value : ''
  const [open, setOpen] = useState(initiallyOpen === true)
  const [draft, setDraft] = useState(current)
  const initialMonth = kbnDayMonthOf(current)
  const [view, setView] = useState(initialMonth)
  const [geometry, setGeometry] = useState(null)
  const rootRef = useRef(null)
  const popRef = useRef(null)
  const today = todayISO()

  useEffect(() => {
    setDraft(current)
  }, [current])

  // Close on an outside pointer press; the dialog's own Escape handling must
  // not fire while the calendar is open, so Escape is handled here too.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      const root = rootRef.current
      if (root === null || root === undefined) return
      const target = event.target
      if (target !== null && root.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  // The panel is viewport-fixed so the dialog's scroll container never clips it;
  // recompute its anchor whenever the page, dialog or window moves.
  useEffect(() => {
    if (!open) return undefined
    const same = (left, right) => left !== null && right !== null
      && left.top === right.top && left.bottom === right.bottom
      && left.left === right.left && left.width === right.width && left.maxHeight === right.maxHeight
    const update = () => {
      const next = kbnDateGeometry(rootRef.current)
      setGeometry((previous) => (same(previous, next) ? previous : next))
    }
    update()
    const onResize = () => update()
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', onResize)
    }
    document.addEventListener('scroll', update, true)
    const settle = setTimeout(update, 220)
    return () => {
      clearTimeout(settle)
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('resize', onResize)
      }
      document.removeEventListener('scroll', update, true)
    }
  }, [open])

  const commit = (next) => {
    if (typeof onChange === 'function') onChange(next)
    setDraft(next)
  }

  const openPicker = () => {
    if (disabled) return
    setView(kbnDayMonthOf(current))
    setGeometry(kbnDateGeometry(rootRef.current))
    setOpen(true)
  }

  const commitTyped = () => {
    const text = draft.trim()
    if (text === '') {
      if (current !== '') commit('')
      return
    }
    if (text === current) return
    const parsed = kbnParseTypedDay(text)
    if (parsed === null) {
      setDraft(current)
      return
    }
    commit(parsed.year + '-' + pad2(parsed.month + 1) + '-' + pad2(parsed.day))
  }

  const chooseDay = (iso) => {
    commit(iso)
    setOpen(false)
  }

  const moveFocus = (event, iso) => {
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const delta = deltas[event.key]
    if (delta === undefined) return
    event.preventDefault()
    const pop = popRef.current
    if (pop === null || pop === undefined) return
    const buttons = Array.prototype.slice.call(pop.querySelectorAll('[data-iso]'))
    const index = buttons.findIndex((button) => button.getAttribute('data-iso') === iso)
    if (index < 0) return
    const next = buttons[index + delta]
    if (next !== undefined && typeof next.focus === 'function') next.focus()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  const cells = kbnMonthGrid(view.year, view.month)
  const selectedIso = kbnParseTypedDay(current) !== null
    ? current
    : null
  const focusIso = selectedIso !== null && cells.some((cell) => cell.iso === selectedIso)
    ? selectedIso
    : (cells.some((cell) => cell.iso === today) ? today : cells[0].iso)

  return h('div', { className: 'kbn-date', ref: rootRef, onKeyDown: handleKeyDown },
    h('div', { className: 'kbn-date-input', 'data-disabled': disabled ? 'true' : 'false' },
      h('input', {
        className: 'kbn-date-text',
        type: 'text',
        value: draft,
        placeholder: placeholder === undefined ? t('date.placeholder') : placeholder,
        disabled: disabled || undefined,
        autoFocus: autoFocus || undefined,
        'aria-label': ariaLabel || t('date.placeholder'),
        'aria-expanded': open ? 'true' : 'false',
        onChange: (event) => setDraft(event.target.value),
        onBlur: commitTyped,
        onKeyDown: (event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitTyped()
          }
        },
      }),
      h('button', {
        type: 'button',
        className: 'kbn-date-trigger',
        'aria-label': t('date.open'),
        'aria-expanded': open ? 'true' : 'false',
        disabled: disabled || undefined,
        onClick: () => (open ? setOpen(false) : openPicker()),
      }, h(Icon, { name: 'clock', size: 14 }))),
    open
      ? h('div', {
        className: 'kbn-date-pop',
        ref: popRef,
        role: 'group',
        'aria-label': t('date.calendar'),
        'data-placement': (geometry === null ? kbnDateGeometry(null).placement : geometry.placement),
        style: (() => {
          const box = geometry === null ? kbnDateGeometry(null) : geometry
          const style = {
            position: 'fixed',
            left: box.left + 'px',
            width: box.width + 'px',
            maxHeight: box.maxHeight + 'px',
            zIndex: 60,
          }
          if (box.top !== undefined) style.top = box.top + 'px'
          else style.bottom = box.bottom + 'px'
          return style
        })(),
      },
        h('div', { className: 'kbn-date-head' },
          h('button', {
            type: 'button',
            className: 'kbn-date-nav',
            'aria-label': t('date.prevMonth'),
            onClick: () => setView({ year: view.month === 0 ? view.year - 1 : view.year, month: view.month === 0 ? 11 : view.month - 1 }),
          }, h(Icon, { name: 'chevronLeft', size: 14 })),
          h('span', { className: 'kbn-date-month', 'aria-live': 'polite' }, kbnMonthTitle(view.year, view.month)),
          h('button', {
            type: 'button',
            className: 'kbn-date-nav',
            'aria-label': t('date.nextMonth'),
            onClick: () => setView({ year: view.month === 11 ? view.year + 1 : view.year, month: view.month === 11 ? 0 : view.month + 1 }),
          }, h(Icon, { name: 'chevronRight', size: 14 }))),
        h('div', { className: 'kbn-date-week', 'aria-hidden': 'true' },
          kbnWeekdayLabels().map((label, index) => h('span', { key: index }, label))),
        h('div', { className: 'kbn-date-grid' },
          cells.map((cell) => h('button', {
            key: cell.iso,
            type: 'button',
            className: 'kbn-date-day',
            'data-iso': cell.iso,
            'data-outside': cell.inMonth ? undefined : 'true',
            'data-today': cell.iso === today ? 'true' : undefined,
            'data-selected': cell.iso === selectedIso ? 'true' : undefined,
            tabIndex: cell.iso === focusIso ? 0 : -1,
            'aria-label': cell.iso,
            'aria-pressed': cell.iso === selectedIso ? 'true' : undefined,
            onClick: () => chooseDay(cell.iso),
            onKeyDown: (event) => moveFocus(event, cell.iso),
          }, String(cell.day)))),
        h('div', { className: 'kbn-date-foot' },
          h('button', {
            type: 'button',
            className: 'kbn-date-link',
            onClick: () => chooseDay(today),
          }, t('date.today')),
          h('button', {
            type: 'button',
            className: 'kbn-date-link',
            disabled: current === '' || undefined,
            onClick: () => {
              commit('')
              setOpen(false)
            },
          }, t('date.clear'))))
      : null)
}

addStyle(`
.kbn-date {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.kbn-date-input {
  display: flex;
  align-items: center;
  height: 36px;
  box-sizing: border-box;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  transition: border-color .12s var(--ds-ease-in-out), box-shadow .12s var(--ds-ease-in-out);
}
.kbn-date-input:focus-within {
  border-color: var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)) 18%, transparent);
}
.kbn-date-input[data-disabled=true] { opacity: .4; }
.kbn-date-text {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 4px 0 12px;
  border: 0;
  border-radius: var(--dsw-radius-md);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  outline: none;
}
.kbn-date-text::placeholder { color: var(--dsw-alias-label-tertiary); opacity: 1; }
.kbn-date-trigger {
  flex: none;
  width: 30px;
  height: 30px;
  margin-right: 3px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.kbn-date-trigger:hover { background: var(--dsw-alias-interactive-bg-hover); }
.kbn-date-trigger:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.kbn-date-pop {
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-specific-menu);
  backdrop-filter: var(--dsw-menu-backdrop-filter);
  box-shadow: var(--dsw-elevation-prominent);
}
.kbn-date-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.kbn-date-month {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}
.kbn-date-nav {
  flex: none;
  width: 26px;
  height: 26px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.kbn-date-nav:hover { background: var(--dsw-alias-interactive-bg-hover); }
.kbn-date-nav:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.kbn-date-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.kbn-date-week span {
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
}
.kbn-date-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.kbn-date-day {
  height: 30px;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.kbn-date-day:hover { background: var(--dsw-alias-interactive-bg-hover); }
.kbn-date-day[data-outside=true] { color: var(--dsw-alias-label-caption); }
.kbn-date-day[data-today=true] { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-business-primary); }
.kbn-date-day[data-selected=true] {
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
  box-shadow: none;
}
.kbn-date-day:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.kbn-date-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 2px;
}
.kbn-date-link {
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-link);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}
.kbn-date-link:hover:not(:disabled) { text-decoration: underline; }
.kbn-date-link:disabled { color: var(--dsw-alias-label-caption); cursor: default; }
.kbn-date-link:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .kbn-date-input { transition: none; }
}
`)


/* ---- 37-account.js ---- */
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


/* ---- 40-card.js ---- */
/**
 * Board card pieces: the colored status dot, the priority chip and the task
 * card itself (draggable, with hover-revealed actions).
 */
addDict(
  {
    'card.untitled': '未命名任务',
    'card.start': '开始 {date}',
    'card.due': '截止 {date}',
    'card.overdue': '已逾期',
    'card.attachments': '{count} 个附件',
    'card.linked': '已关联会话',
    'card.edit': '编辑任务',
    'card.run': '发送到会话',
    'card.openSession': '打开关联会话',
    'card.archive': '归档任务',
    'card.tagsMore': '还有 {count} 个标签',
    'assignee.ai': 'AI',
    'assignee.human': '人工',
  },
  {
    'card.untitled': 'Untitled task',
    'card.start': 'Start {date}',
    'card.due': 'Due {date}',
    'card.overdue': 'Overdue',
    'card.attachments': '{count} attachments',
    'card.linked': 'Linked session',
    'card.edit': 'Edit task',
    'card.run': 'Send to session',
    'card.openSession': 'Open linked session',
    'card.archive': 'Archive task',
    'card.tagsMore': '{count} more tags',
    'assignee.ai': 'AI',
    'assignee.human': 'Human',
  },
)

/** Priority → chip tone (docs/ARCHITECTURE.md §7: low idle, medium business, high warn, urgent error). */
const KBN_PRIORITY_TONES = {
  low: 'neutral',
  medium: 'brand',
  high: 'warn',
  urgent: 'danger',
}

/**
 * Read a widget's `onChange` payload defensively: the foundation widgets pass
 * the value, but a raw event is tolerated so board parts never crash on either.
 * @param {any} input
 * @returns {any}
 */
function kbnFieldValue(input) {
  if (input !== null && typeof input === 'object' && input.target !== undefined
    && input.target !== null && typeof input.target.value === 'string') {
    return input.target.value
  }
  return input
}

/**
 * 8px colored status dot plus its text label, so status is never color-only.
 * @param {{ status?: 'todo' | 'doing' | 'done', label?: string }} props
 * @returns {object} React element
 */
function StatusDot({ status, label }) {
  const value = STATUSES.indexOf(status) >= 0 ? status : 'todo'
  const text = typeof label === 'string' && label !== '' ? label : t('status.' + value)
  return h('span', { className: 'kbn-status', 'data-status': value, title: text },
    h('span', { className: 'kbn-col-dot', 'data-status': value, 'aria-hidden': 'true' }),
    h('span', { className: 'kbn-status-text' }, text))
}

/**
 * Priority chip: colored tone plus the written level.
 * @param {{ priority?: 'low' | 'medium' | 'high' | 'urgent' }} props
 * @returns {object} React element
 */
function PriorityBadge({ priority }) {
  const value = PRIORITIES.indexOf(priority) >= 0 ? priority : 'low'
  const tone = KBN_PRIORITY_TONES[value] || 'neutral'
  const icon = value === 'urgent' || value === 'high'
    ? h(Icon, { name: 'warning', size: 12 })
    : null
  return h('span', {
    className: 'kbn-chip kbn-priority',
    'data-tone': tone,
    'data-priority': value,
    title: t('priority.' + value),
  }, icon, t('priority.' + value))
}

/**
 * One icon-only card action.
 * @param {{ name: string, label: string, disabled?: boolean, onClick?: Function }} props
 * @returns {object} React element
 */
function CardAction({ name, label, disabled, onClick }) {
  return h('button', {
    type: 'button',
    className: 'kbn-card-action',
    'aria-label': label,
    title: label,
    disabled: disabled || undefined,
    onClick: disabled
      ? undefined
      : (event) => {
        event.stopPropagation()
        if (typeof onClick === 'function') onClick(event)
      },
  }, h(Icon, { name, size: 14 }))
}

/**
 * Run-in-session control for AI tasks, styled like the Harness composer's
 * send button: a filled blue circle carrying the host's send glyph.
 * @param {{ label: string, disabled?: boolean, onClick?: Function }} props
 * @returns {object} React element
 */
function CardSendButton({ label, disabled, onClick }) {
  return h('button', {
    type: 'button',
    className: 'kbn-card-send',
    'aria-label': label,
    title: label,
    disabled: disabled || undefined,
    onClick: disabled
      ? undefined
      : (event) => {
        event.stopPropagation()
        if (typeof onClick === 'function') onClick(event)
      },
  }, h(Icon, { name: 'send', size: 14 }))
}

/**
 * One task card.
 * @param {object} props
 * @returns {object} React element
 */
function TaskCard({
  task,
  workspace,
  selected,
  busy,
  onEdit,
  onRun,
  onOpenSession,
  onArchive,
  onDelete,
  onDragStart,
  onDragEnd,
  onSelect,
}) {
  const [dragging, setDragging] = useState(false)
  const account = useKbnAccount()
  if (task === null || task === undefined) return null

  const tags = Array.isArray(task.tags) ? task.tags.filter((tag) => typeof tag === 'string' && tag !== '') : []
  const shownTags = tags.slice(0, 3)
  const hiddenTags = tags.length - shownTags.length
  const attachments = Array.isArray(task.attachments) ? task.attachments : []
  const assignee = task.assignee !== null && typeof task.assignee === 'object'
    ? task.assignee
    : { kind: 'human', name: '' }
  const isAI = assignee.kind === 'ai'
  const accountProfile = account !== null && account !== undefined ? account.profile : null
  const showAccountAvatar = !isAI && kbnAccountMatchesTask(task, accountProfile)
  const assigneeLabel = typeof assignee.name === 'string' && assignee.name.trim() !== ''
    ? assignee.name
    : (isAI ? t('assignee.ai') : (showAccountAvatar && accountProfile.name !== null ? accountProfile.name : t('assignee.human')))
  const title = typeof task.title === 'string' && task.title.trim() !== '' ? task.title : t('card.untitled')
  const dueIn = typeof task.dueDate === 'string' && task.dueDate !== '' ? daysUntil(task.dueDate) : null
  const overdue = dueIn !== null && dueIn < 0
  const soon = dueIn !== null && dueIn >= 0 && dueIn <= 2

  const actions = []
  if (typeof task.sessionId === 'string' && task.sessionId !== '') {
    actions.push(h(CardAction, {
      key: 'session',
      name: 'link',
      label: t('card.openSession'),
      disabled: busy,
      onClick: () => {
        if (typeof onOpenSession === 'function') onOpenSession(task)
      },
    }))
  }
  if (task.status === 'done') {
    actions.push(h(CardAction, {
      key: 'archive',
      name: 'archive',
      label: t('card.archive'),
      disabled: busy,
      onClick: () => {
        if (typeof onArchive === 'function') onArchive(task)
      },
    }))
  }
  const showSend = isAI && task.status !== 'done'

  const dates = []
  if (typeof task.startDate === 'string' && task.startDate !== '') {
    dates.push(h('span', { className: 'kbn-card-date', key: 'start' },
      h(Icon, { name: 'clock', size: 12 }),
      t('card.start', { date: formatDay(task.startDate) })))
  }
  if (typeof task.dueDate === 'string' && task.dueDate !== '') {
    const dueLabel = t('card.due', { date: formatDay(task.dueDate) })
    const fullLabel = overdue ? dueLabel + ' · ' + t('card.overdue') : dueLabel
    dates.push(h('span', {
      className: 'kbn-card-date',
      key: 'due',
      'data-overdue': overdue ? 'true' : undefined,
      'data-soon': !overdue && soon ? 'true' : undefined,
      'aria-label': fullLabel,
      title: fullLabel,
    },
      h(Icon, { name: 'clock', size: 12 }),
      dueLabel,
      overdue ? h(Icon, { name: 'warning', size: 12 }) : null))
  }

  function beginDrag(event) {
    setDragging(true)
    if (event !== null && event !== undefined && event.dataTransfer !== null && event.dataTransfer !== undefined) {
      try {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', task.id)
      } catch (error) {
        // Some embedded browsers expose a read-only DataTransfer; dragging still works.
      }
    }
    if (typeof onDragStart === 'function') onDragStart(event)
  }

  function endDrag() {
    setDragging(false)
    if (typeof onDragEnd === 'function') onDragEnd()
  }

  const select = () => {
    if (typeof onSelect === 'function') onSelect(task)
  }

  return h('article', {
    className: 'kbn-card',
    role: 'button',
    tabIndex: 0,
    draggable: busy ? false : true,
    'aria-label': title,
    'data-task-id': task.id,
    'data-status': task.status,
    'data-selected': selected ? 'true' : undefined,
    'data-dragging': dragging ? 'true' : undefined,
    'data-ai': isAI ? 'true' : undefined,
    'data-has-send': showSend ? 'true' : undefined,
    onClick: select,
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
      event.preventDefault()
      select()
    },
    onDragStart: beginDrag,
    onDragEnd: endDrag,
  },
    h('div', { className: 'kbn-card-head' },
      h('h3', { className: 'kbn-card-title', title }, title),
      h('div', { className: 'kbn-card-side' },
        h('button', {
          type: 'button',
          className: 'kbn-card-edit',
          'aria-label': t('card.edit'),
          title: t('card.edit'),
          disabled: busy || undefined,
          onClick: (event) => {
            event.stopPropagation()
            if (typeof onEdit === 'function') onEdit(task)
          },
        }, h(Icon, { name: 'edit', size: 13 })),
        h(PriorityBadge, { priority: task.priority }))),

    typeof task.description === 'string' && task.description.trim() !== ''
      ? h('p', { className: 'kbn-card-desc' }, task.description.trim())
      : null,

    shownTags.length > 0
      ? h('div', { className: 'kbn-card-tags' },
        shownTags.map((tag, index) => h('span', { className: 'kbn-tag', key: index, title: tag }, tag)),
        hiddenTags > 0
          ? h('span', {
            className: 'kbn-tag kbn-tag-more',
            title: tags.slice(3).join(', '),
            'aria-label': t('card.tagsMore', { count: hiddenTags }),
          }, '+' + hiddenTags)
          : null)
      : null,

    dates.length > 0 ? h('div', { className: 'kbn-card-row' }, h('div', { className: 'kbn-dates' }, dates)) : null,

    h('div', { className: 'kbn-card-foot' },
      h('span', {
        className: 'kbn-assignee',
        'data-kind': isAI ? 'ai' : 'human',
        title: assigneeLabel,
      },
        showAccountAvatar
          ? h(KbnAccountAvatar, { profile: accountProfile, size: 16 })
          : h(Icon, { name: isAI ? 'sparkle' : 'user', size: 12 }),
        h('span', { className: 'kbn-assignee-name' }, assigneeLabel)),
      attachments.length > 0
        ? h('span', {
          className: 'kbn-attach-count',
          title: t('card.attachments', { count: attachments.length }),
          'aria-label': t('card.attachments', { count: attachments.length }),
        },
          h(Icon, { name: 'paperclip', size: 12 }),
          String(attachments.length))
        : null,
      typeof task.sessionId === 'string' && task.sessionId !== ''
        ? h('span', {
          className: 'kbn-attach-count',
          title: t('card.linked'),
          'aria-label': t('card.linked'),
        }, h(Icon, { name: 'link', size: 12 }))
        : null,
      h(StatusDot, { status: task.status }),
      h('div', { className: 'kbn-card-actions' }, actions)),
    showSend
      ? h(CardSendButton, {
        label: t('card.run'),
        disabled: busy,
        onClick: () => {
          if (typeof onRun === 'function') onRun(task)
        },
      })
      : null,
  )
}


/* ---- 45-task-editor.js ---- */
/**
 * Task editor dialog: create and edit task details, upload attachments,
 * manage tags, pick the assignee kind, validate inline and surface host errors.
 */
addDict(
  {
    'editor.newTitle': '新建任务',
    'editor.editTitle': '编辑任务',
    'editor.content': '任务内容',
    'editor.contentPlaceholder': '第一行概括任务，后面可补充背景和验收标准。',
    'editor.startDate': '开始日期',
    'editor.dueDate': '截止日期',
    'editor.priority': '紧急程度',
    'editor.tags': '标签',
    'editor.tagPlaceholder': '输入标签后按回车',
    'editor.tagRemove': '移除标签 {tag}',
    'editor.tagLimit': '最多添加 12 个标签',
    'editor.attachments': '附件',
    'editor.addAttachment': '点击或拖入文件添加附件',
    'editor.dropFolders': '文件夹无法直接添加，请拖入其中的文件',
    'editor.removeAttachment': '移除附件 {name}',
    'editor.assignee': '负责人',
    'editor.assigneeAi': 'AI',
    'editor.assigneeHuman': '人工',
    'editor.contentRequired': '请输入任务内容',
    'editor.contentLimit': '任务正文最多支持 20000 个字符。',
    'editor.dateOrder': '截止日期不能早于开始日期',
    'editor.noWorkspace': '请先选择项目',
    'editor.deleteConfirm': '再次点击删除',
    'editor.saved': '任务已保存',
    'editor.deleted': '任务已删除',
  },
  {
    'editor.newTitle': 'New task',
    'editor.editTitle': 'Edit task',
    'editor.content': 'Task content',
    'editor.contentPlaceholder': 'Summarize the task on the first line. Add details below.',
    'editor.startDate': 'Start date',
    'editor.dueDate': 'Due date',
    'editor.priority': 'Priority',
    'editor.tags': 'Tags',
    'editor.tagPlaceholder': 'Type a tag and press Enter',
    'editor.tagRemove': 'Remove tag {tag}',
    'editor.tagLimit': 'Up to 12 tags',
    'editor.attachments': 'Attachments',
    'editor.addAttachment': 'Click or drop files to attach',
    'editor.dropFolders': 'To attach a folder’s contents, drop the files inside it.',
    'editor.removeAttachment': 'Remove attachment {name}',
    'editor.assignee': 'Assignee',
    'editor.assigneeAi': 'AI',
    'editor.assigneeHuman': 'Human',
    'editor.contentRequired': 'Enter the task content',
    'editor.contentLimit': 'The task body supports up to 20,000 characters.',
    'editor.dateOrder': "Due date can't be before the start date",
    'editor.noWorkspace': 'Choose a project first',
    'editor.deleteConfirm': 'Click again to delete',
    'editor.saved': 'Task saved',
    'editor.deleted': 'Task deleted',
  },
)

const KBN_MAX_TAGS = 12
const KBN_MAX_TAG_LENGTH = 32

/**
 * Normalize a tag list to what the host accepts: strings only, trimmed,
 * non-empty, deduplicated and capped at 12 items.
 * @param {any} input
 * @returns {string[]}
 */
function kbnCleanTags(input) {
  const result = []
  if (!Array.isArray(input)) return result
  for (const value of input) {
    if (typeof value !== 'string') continue
    const tag = value.trim().slice(0, KBN_MAX_TAG_LENGTH)
    if (tag === '' || result.indexOf(tag) >= 0) continue
    result.push(tag)
    if (result.length >= KBN_MAX_TAGS) break
  }
  return result
}

function taskContentTitle(text) {
  const newline = text.indexOf('\n')
  const first = (newline < 0 ? text : text.slice(0, newline)).trim()
  // Avoid cutting a surrogate pair at the host's 200-character title limit.
  if (first.length <= 200) return first
  return first.slice(0, 199).replace(/[\uD800-\uDBFF]$/, '') + '…'
}

// Store the body separately when it round-trips through the legacy fields.
// Otherwise keep the full input, including paragraph breaks and code indentation.
function taskContentFields(value) {
  const text = value.trim()
  const title = taskContentTitle(text)
  if (text === title) return { title, description: '' }
  const body = text.slice(text.indexOf('\n') + 1).trim()
  const fields = { title, description: body }
  if (taskContentText(fields) === text) return fields
  return { title, description: text }
}

function taskContentText({ title, description }) {
  if (!description) return title
  if (taskContentTitle(description) === title) return description
  return title + '\n' + description
}

/**
 * Create/edit task dialog.
 * @param {{ open: boolean, mode: 'create' | 'edit', task?: object | null, workspaceId?: string | null, columnStatus?: string, onClose: Function, onSaved?: Function }} props
 * @returns {object} React element
 */
function TaskEditorDialog({ open, mode, task, workspaceId, columnStatus, sessionId, onClose, onSaved }) {
  const isEdit = mode === 'edit' && task !== null && task !== undefined
  const [content, setContent] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [tags, setTags] = useState([])
  const [tagDraft, setTagDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [assigneeKind, setAssigneeKind] = useState('human')
  const account = useKbnAccount()
  const [assigneeName, setAssigneeName] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef(null)
  const dropZoneRef = useRef(null)
  const uploadBatchRef = useRef(null)
  const tagInputRef = useRef(null)

  // A human assignee is the signed-in account: read its profile for the card.
  useEffect(() => {
    if (!open || assigneeKind !== 'human') return
    if (kanbanStore !== null) loadKbnAccount(kanbanStore.ctx)
  }, [open, assigneeKind])

  // Reopening (or switching to another task) always starts from the stored task.
  useEffect(() => {
    if (!open) return
    const source = task !== null && task !== undefined ? task : null
    setContent(source ? taskContentText(source) : '')
    setStartDate(source !== null && typeof source.startDate === 'string' ? source.startDate : '')
    setDueDate(source !== null && typeof source.dueDate === 'string' ? source.dueDate : '')
    setPriority(source !== null && PRIORITIES.indexOf(source.priority) >= 0 ? source.priority : 'medium')
    setTags(kbnCleanTags(source !== null && Array.isArray(source.tags) ? source.tags : []))
    setAttachments(source !== null && Array.isArray(source.attachments) ? source.attachments.slice() : [])
    setAssigneeKind(source !== null && source.assignee !== null && source.assignee !== undefined
      && source.assignee.kind === 'ai' ? 'ai' : 'human')
    setAssigneeName(source !== null && source.assignee !== null && source.assignee !== undefined
      && typeof source.assignee.name === 'string' ? source.assignee.name : '')
    setTagDraft('')
    setErrors({})
    setFormError(null)
    setSaving(false)
    setUploading(false)
    setDragActive(false)
    setConfirmDelete(false)
    return () => { uploadBatchRef.current = null }
  }, [open, mode, task === null || task === undefined ? null : task.id])

  function addTag() {
    const value = tagDraft.trim()
    if (value === '') return
    setTagDraft('')
    if (tags.indexOf(value.slice(0, KBN_MAX_TAG_LENGTH)) >= 0) return
    if (tags.length >= KBN_MAX_TAGS) {
      setFormError(t('editor.tagLimit'))
      return
    }
    setTags(kbnCleanTags(tags.concat([value])))
  }

  function handleTagKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
      return
    }
    if (event.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
      setTags(tags.slice(0, tags.length - 1))
    }
  }

  function removeTag(index) {
    setTags(tags.filter((tag, position) => position !== index))
  }

  function removeAttachment(index) {
    setAttachments(attachments.filter((attachment, position) => position !== index))
  }

  async function addFiles(picked, message = null) {
    if (saving || uploadBatchRef.current) return
    setFormError(message)
    if (!picked.length) return
    uploadBatchRef.current = picked
    const next = attachments.slice()
    setUploading(true)
    try {
      for (const file of picked) {
        try {
          const attachment = await kanbanStore.uploadAttachment(file, workspaceId)
          if (uploadBatchRef.current !== picked) return
          next.push(attachment)
          setAttachments(next.slice())
        } catch (error) {
          if (uploadBatchRef.current !== picked) return
          message = messageOf(error)
        }
      }
    } finally {
      if (uploadBatchRef.current === picked) {
        uploadBatchRef.current = null
        setUploading(false)
        setFormError(message)
      }
    }
  }

  function handleFileDrag(event) {
    const transfer = event.dataTransfer
    if (!transfer.types.includes('Files')) return
    // DSH also handles file drops on the document for conversation attachments.
    event.preventDefault()
    event.stopPropagation()
    const zone = dropZoneRef.current
    if (event.type === 'dragleave') {
      if (!zone?.contains(event.relatedTarget)) setDragActive(false)
      return
    }
    const inside = zone?.contains(event.target)
    const available = inside && !uploading && !saving
    transfer.dropEffect = available ? 'copy' : 'none'
    setDragActive(available && event.type !== 'drop')
    if (event.type !== 'drop' || !inside || uploading || saving) return
    const files = Array.from(transfer.files)
    const items = Array.from(transfer.items).filter((item) => item.kind === 'file')
    const picked = files.filter((file, i) => !items[i]?.webkitGetAsEntry?.()?.isDirectory)
    return addFiles(picked, picked.length < files.length ? t('editor.dropFolders') : null)
  }

  function validate() {
    const nextErrors = {}
    if (!content.trim()) nextErrors.content = t('editor.contentRequired')
    if ((!isEdit || content !== taskContentText(task)) && taskContentFields(content).description.length > 20000) {
      nextErrors.content = t('editor.contentLimit')
    }
    if (startDate !== '' && dueDate !== '' && dueDate < startDate) nextErrors.dueDate = t('editor.dateOrder')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    if (!isEdit && (typeof workspaceId !== 'string' || workspaceId === '')) {
      setFormError(t('editor.noWorkspace'))
      return
    }
    const payload = {
      ...(isEdit && content === taskContentText(task) ? {} : taskContentFields(content)),
      startDate: startDate === '' ? null : startDate,
      dueDate: dueDate === '' ? null : dueDate,
      priority,
      tags: kbnCleanTags(tags),
      attachments: attachments.slice(),
      assignee: {
        kind: assigneeKind,
        name: assigneeKind === 'human'
          ? (account.profile !== null && account.profile.name !== null
            ? account.profile.name
            : assigneeName.trim())
          : '',
      },
    }
    setSaving(true)
    setFormError(null)
    try {
      const saved = isEdit
        ? await kanbanStore.updateTask(task.id, payload)
        : await kanbanStore.createTask(workspaceId, { ...payload, status: columnStatus, sessionId })
      kanbanStore.toast(t('editor.saved'), 'info')
      if (typeof onSaved === 'function') onSaved(saved)
      if (typeof onClose === 'function') onClose()
    } catch (error) {
      setFormError(messageOf(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEdit) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await kanbanStore.deleteTask(task.id)
      kanbanStore.toast(t('editor.deleted'), 'info')
      if (typeof onClose === 'function') onClose()
    } catch (error) {
      setFormError(messageOf(error))
    } finally {
      setSaving(false)
    }
  }

  const priorityOptions = PRIORITIES.map((value) => ({ value, label: t('priority.' + value) }))

  const footer = h(Fragment, null,
    h(Button, {
      key: 'cancel',
      variant: 'ghost',
      disabled: saving,
      onClick: onClose,
    }, t('common.cancel')),
    isEdit
      ? h(Button, {
        key: 'delete',
        variant: 'danger',
        icon: h(Icon, { name: 'trash', size: 14 }),
        disabled: saving,
        onClick: handleDelete,
      }, confirmDelete ? t('editor.deleteConfirm') : t('common.delete'))
      : null,
    h(Button, {
      key: 'save',
      variant: 'primary',
      icon: h(Icon, { name: 'check', size: 14 }),
      busy: saving,
      disabled: uploading,
      onClick: handleSave,
    }, t('common.save')))

  return h(Modal, {
    open,
    onClose,
    title: isEdit ? t('editor.editTitle') : t('editor.newTitle'),
    onFileDrag: handleFileDrag,
    icon: isEdit ? h(Icon, { name: 'board', size: 16 }) : null,
    width: 560,
    busy: saving,
    footer,
  },
    h('div', { className: 'kbn-editor' },
      formError !== null ? h('p', { className: 'kbn-editor-error', role: 'alert' }, formError) : null,

      h(Field, { label: t('editor.content'), required: true, error: errors.content },
        h(TextArea, {
          value: content,
          onChange: (value) => {
            setContent(kbnFieldValue(value))
            if (errors.content) setErrors(Object.assign({}, errors, { content: undefined }))
          },
          rows: 4,
          placeholder: t('editor.contentPlaceholder'),
          ariaLabel: t('editor.content'),
        })),

      h('div', { className: 'kbn-form-grid' },
        h('div', { className: 'kbn-form-row' },
          h(Field, { label: t('editor.priority') },
            h(Select, {
              value: priority,
              onChange: (value) => setPriority(kbnFieldValue(value)),
              options: priorityOptions,
              ariaLabel: t('editor.priority'),
            }))),
        h('div', { className: 'kbn-form-row' },
          h(Field, { label: t('editor.tags') },
            h('div', {
              className: 'kbn-tag-input',
              onClick: () => {
                if (tagInputRef.current !== null) tagInputRef.current.focus()
              },
            },
              tags.map((tag, index) => h('span', { className: 'kbn-tag-pill', key: tag + ':' + index },
                h('span', { title: tag }, tag),
                h('button', {
                  type: 'button',
                  className: 'kbn-tag-x',
                  'aria-label': t('editor.tagRemove', { tag }),
                  title: t('editor.tagRemove', { tag }),
                  onClick: (event) => {
                    if (event !== null && event !== undefined) event.stopPropagation()
                    removeTag(index)
                  },
                }, h(Icon, { name: 'close', size: 12 })))),
              h('input', {
                ref: tagInputRef,
                className: 'kbn-tag-field',
                value: tagDraft,
                placeholder: tags.length === 0 ? t('editor.tagPlaceholder') : '',
                'aria-label': t('editor.tags'),
                onChange: (event) => setTagDraft(event.target.value),
                onKeyDown: handleTagKeyDown,
                maxLength: KBN_MAX_TAG_LENGTH,
              })))),
        h('div', { className: 'kbn-form-row' },
          h(Field, { label: t('editor.startDate') },
            h(DateField, {
              value: startDate,
              onChange: (value) => setStartDate(kbnFieldValue(value)),
              ariaLabel: t('editor.startDate'),
            }))),
        h('div', { className: 'kbn-form-row' },
          h(Field, { label: t('editor.dueDate'), error: errors.dueDate },
            h(DateField, {
              value: dueDate,
              onChange: (value) => {
                setDueDate(kbnFieldValue(value))
                if (errors.dueDate !== undefined) setErrors(Object.assign({}, errors, { dueDate: undefined }))
              },
              ariaLabel: t('editor.dueDate'),
            })))),

      h('div', { className: 'kbn-form-row kbn-assignee-block', 'data-span': 'full' },
        h('div', { className: 'kbn-seg', role: 'group', 'aria-label': t('editor.assignee') },
          h('button', {
            type: 'button',
            className: 'kbn-seg-btn',
            'aria-pressed': assigneeKind === 'ai' ? 'true' : 'false',
            onClick: () => setAssigneeKind('ai'),
          }, h(Icon, { name: 'sparkle', size: 14 }), t('editor.assigneeAi')),
          h('button', {
            type: 'button',
            className: 'kbn-seg-btn',
            'aria-pressed': assigneeKind === 'human' ? 'true' : 'false',
            onClick: () => setAssigneeKind('human'),
          }, h(Icon, { name: 'user', size: 14 }), t('editor.assigneeHuman'))),
        assigneeKind === 'human'
          ? h(AccountAssigneeCard, { profile: account.profile, status: account.status })
          : null),

      h('div', { className: 'kbn-form-row', ref: dropZoneRef, 'data-file-over': dragActive || undefined },
        h(Field, { label: t('editor.attachments') },
          h('div', { className: 'kbn-attach-list' },
            attachments.map((attachment, index) => h('div', {
              className: 'kbn-attach-item',
              key: typeof attachment.id === 'string' ? attachment.id : 'attachment-' + index,
            },
              h(Icon, { name: 'paperclip', size: 14 }),
              h('span', { className: 'kbn-attach-name', title: attachment.name }, attachment.name),
              h('span', { className: 'kbn-attach-size' }, formatBytes(attachment.size)),
              h('button', {
                type: 'button',
                className: 'kbn-attach-x',
                'aria-label': t('editor.removeAttachment', { name: attachment.name }),
                title: t('editor.removeAttachment', { name: attachment.name }),
                disabled: uploading || saving,
                onClick: () => removeAttachment(index),
              }, h(Icon, { name: 'close', size: 12 })))),
            h('input', {
              ref: fileRef,
              type: 'file',
              multiple: true,
              tabIndex: -1,
              'aria-hidden': 'true',
              className: 'kbn-visually-hidden',
              onChange: (event) => {
                const files = Array.from(event.currentTarget.files)
                event.currentTarget.value = ''
                return addFiles(files)
              },
            }),
            h('button', {
              type: 'button',
              className: 'kbn-attach-add',
              disabled: uploading || saving,
              onClick: () => {
                if (fileRef.current !== null) fileRef.current.click()
              },
            },
              h(Icon, { name: uploading ? 'refresh' : 'paperclip', size: 14 }),
              uploading ? t('common.loading') : t('editor.addAttachment')))))),
    )
}


/* ---- 50-archive-modal.js ---- */
/**
 * Archive settings: archived tasks grouped by board, with restore, inline
 * two-click delete and a jump to the linked harness session.
 */
addDict(
  {
    'archive.title': '归档任务',
    'archive.emptyTitle': '暂无归档任务',
    'archive.emptyDesc': '归档的任务会出现在这里，恢复后会回到原来的状态列。',
    'archive.restore': '恢复',
    'archive.confirmDelete': '确认删除',
    'archive.restored': '任务已恢复',
    'archive.deleted': '任务已删除',
    'archive.archivedOn': '归档于 {date}',
    'archive.noDate': '归档日期未知',
    'archive.tagsMore': '还有 {count} 个标签',
    'archive.showMore': '展开其余 {count} 项',
    'archive.showLess': '收起',
  },
  {
    'archive.title': 'Archived tasks',
    'archive.emptyTitle': 'No archived tasks',
    'archive.emptyDesc': 'Archived tasks appear here. Restore a task to return it to its original column.',
    'archive.restore': 'Restore',
    'archive.confirmDelete': 'Confirm delete',
    'archive.restored': 'Task restored',
    'archive.deleted': 'Task deleted',
    'archive.archivedOn': 'Archived {date}',
    'archive.noDate': 'Archived date unknown',
    'archive.tagsMore': '{count} more tags',
    'archive.showMore': 'Show {count} more',
    'archive.showLess': 'Show less',
  },
)

/** Compare two archived-task lists by the fields the dialog renders. */
function kbnSameArchived(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].id !== right[index].id) return false
    if (left[index].updatedAt !== right[index].updatedAt) return false
    if (left[index].archivedAt !== right[index].archivedAt) return false
  }
  return true
}

/**
 * Display day for one archived task (archived timestamp sliced to a day).
 * @param {object} task
 * @returns {string}
 */
function archiveDay(task) {
  const iso = typeof task.archivedAt === 'string' && task.archivedAt !== ''
    ? task.archivedAt
    : (typeof task.updatedAt === 'string' ? task.updatedAt : '')
  return iso.length >= 10 ? formatDay(iso.slice(0, 10)) : ''
}

/**
 * Archived-task manager.
 * @param {{ close: Function }} props
 * @returns {object} React element
 */
function ArchivedTaskList({ close }) {
  const state = kanbanStore.use((snapshot) => snapshot)
  const archived = archivedTasks(state)
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [expandedBoards, setExpandedBoards] = useState({})

  useEffect(() => {
    if (confirmId === null) return undefined
    const timer = setTimeout(() => setConfirmId(null), 5000)
    return () => clearTimeout(timer)
  }, [confirmId])

  async function handleRestore(task) {
    setBusyId(task.id)
    setConfirmId(null)
    try {
      await kanbanStore.restoreTask(task.id)
      kanbanStore.toast(t('archive.restored'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(task) {
    setBusyId(task.id)
    setConfirmId(null)
    try {
      await kanbanStore.deleteTask(task.id)
      kanbanStore.toast(t('archive.deleted'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const groups = []
  const byWorkspace = new Map()
  archived.forEach((task) => {
    const key = typeof task.workspaceId === 'string' ? task.workspaceId : ''
    let group = byWorkspace.get(key)
    if (group === undefined) {
      group = { id: key, workspace: boardOf(state, key), tasks: [] }
      byWorkspace.set(key, group)
      groups.push(group)
    }
    group.tasks.push(task)
  })

  let body
  if (state.status === 'loading' && archived.length === 0) {
    body = h('div', { className: 'kbn-empty' }, h(Spinner, { size: 20, label: t('common.loading') }))
  } else if (archived.length === 0) {
    body = h('div', { className: 'kbn-archive-empty kbn-detail-note' },
      h('p', null, t('archive.emptyTitle')),
      h('p', null, t('archive.emptyDesc')))
  } else {
    body = h('div', { className: 'kbn-archive' },
      groups.map((group) => {
        const workspaceTitle = group.workspace !== null && group.workspace !== undefined
          ? String(group.workspace.title || '')
          : t('common.none')
        const workspacePath = group.workspace !== null && group.workspace !== undefined && typeof group.workspace.path === 'string'
          ? group.workspace.path
          : ''
        const expanded = !!expandedBoards[group.id]
        const visibleTasks = expanded ? group.tasks : group.tasks.slice(0, 3)
        const listId = 'kbn-archive-tasks-' + encodeURIComponent(group.id)
        return h('section', { className: 'kbn-archive-group', key: group.id },
          h('h4', { className: 'kbn-archive-group-title' },
            h('span', null, workspaceTitle),
            h('span', { className: 'kbn-archive-count' }, '(', group.tasks.length, ')'),
            workspacePath !== '' ? h('span', { className: 'kbn-archive-ws', title: workspacePath }, workspacePath) : null),
          h('div', { id: listId, className: 'kbn-archive-rows' }, visibleTasks.map((task) => {
            const tags = Array.isArray(task.tags)
              ? task.tags.filter((tag) => typeof tag === 'string' && tag !== '')
              : []
            const shownTags = tags.slice(0, 4)
            const hiddenTags = tags.length - shownTags.length
            const day = archiveDay(task)
            const rowBusy = busyId === task.id
            const actions = []
            if (typeof task.sessionId === 'string' && task.sessionId !== '') {
              actions.push(h(Button, {
                key: 'session',
                size: 'sm',
                variant: 'ghost',
                icon: h(Icon, { name: 'link', size: 12 }),
                disabled: rowBusy,
                onClick: () => { close(); openTaskSession(task) },
              }, t('action.openSession')))
            }
            actions.push(h(Button, {
              key: 'restore',
              size: 'sm',
              variant: 'ghost',
              icon: h(Icon, { name: 'unarchive', size: 12 }),
              busy: rowBusy,
              onClick: () => handleRestore(task),
            }, t('archive.restore')))
            if (confirmId === task.id) {
              actions.push(h(Button, {
                key: 'delete',
                size: 'sm',
                variant: 'danger',
                icon: h(Icon, { name: 'trash', size: 12 }),
                disabled: rowBusy,
                onClick: () => handleDelete(task),
              }, t('archive.confirmDelete')))
            } else {
              actions.push(h(Button, {
                key: 'delete',
                size: 'sm',
                variant: 'ghost',
                icon: h(Icon, { name: 'trash', size: 12 }),
                disabled: rowBusy,
                onClick: () => setConfirmId(task.id),
              }, t('common.delete')))
            }
            return h('div', { className: 'kbn-archive-row', key: task.id },
              h('div', { className: 'kbn-archive-main' },
                h('span', { className: 'kbn-archive-title' }, String(task.title || t('card.untitled'))),
                h('div', { className: 'kbn-archive-meta' },
                  h('span', null,
                    h(Icon, { name: 'clock', size: 12 }),
                    day !== '' ? t('archive.archivedOn', { date: day }) : t('archive.noDate')),
                  shownTags.map((tag, index) => h('span', { className: 'kbn-tag', key: index, title: tag }, tag)),
                  hiddenTags > 0
                    ? h('span', {
                      className: 'kbn-tag kbn-tag-more',
                      title: tags.slice(4).join(', '),
                      'aria-label': t('archive.tagsMore', { count: hiddenTags }),
                    }, '+' + hiddenTags)
                    : null)),
              h('div', { className: 'kbn-archive-actions' }, actions))
          })),
          group.tasks.length > 3 && h(DshUI.Button, {
            variant: 'ghost', size: 'sm', className: 'kbn-archive-more',
            'aria-expanded': expanded, 'aria-controls': listId,
            'aria-label': workspaceTitle + ' · ' + (expanded ? t('archive.showLess') : t('archive.showMore', { count: group.tasks.length - 3 })),
            onClick: () => {
              setConfirmId(null)
              setExpandedBoards((previous) => ({ ...previous, [group.id]: !previous[group.id] }))
            },
          }, expanded ? t('archive.showLess') : t('archive.showMore', { count: group.tasks.length - 3 })))
      }))
  }

  return body
}


/* ---- 55-board.js ---- */
/**
 * The board panel: header + board switcher + three status columns, drag & drop,
 * empty/loading/error states, focus reveal, archive dialog and board creation.
 */
addDict(
  {
    'board.subtitle': '{todo} 个待办 · {doing} 个进行中 · {done} 个已完成',
    'board.subtitleEmpty': '选择或新建一个项目开始',
    'board.selectBoard': '选择看板',
    'board.newBoard': '新建看板',
    'board.resizeDetail': '拖动调整任务详情宽度',
    'board.newTask': '新建任务',
    'board.addToColumn': '在「{status}」中新建任务',
    'board.emptyColumn': '暂无任务',
    'board.noBoardTitle': '还没有看板',
    'board.noBoardDesc': '新建一个看板开始，不需要先绑定工作目录；第一次把 AI 任务发送到会话时再选择目录。',
    'board.errorTitle': '看板加载失败',
    'board.archived': '任务已归档',
    'detail.title': '任务详情',
    'detail.close': '关闭详情',
    'detail.emptyTitle': '选择一个任务',
    'detail.emptyDesc': '点击左侧卡片查看完整字段、附件与关联会话。',
    'detail.start': '开始日期',
    'detail.due': '截止日期',
    'detail.created': '创建时间',
    'detail.updated': '更新时间',
    'detail.description': '描述',
    'detail.tags': '标签',
    'detail.attachments': '附件',
    'detail.session': '执行会话',
    'detail.linkedSession': '已关联会话',
    'detail.noValue': '未设置',
    'detail.noDescription': '无描述',
    'detail.noAttachments': '没有附件',
    'detail.previewAttachment': '预览 {name}',
    'detail.previewHint': '点大图放大；视频与其他文件在右侧栏预览。',
    'detail.noSession': '这个任务还没有关联会话',
    'detail.aiHint': 'AI 任务可以发送到会话，执行后会话会关联回这张卡片。',
    'detail.edit': '编辑',
    'detail.run': '发送到会话',
    'detail.changeStatus': '修改任务状态',
    'detail.delete': '删除',
    'detail.deleteConfirm': '再点一次删除',
    'board.untitled': '未命名看板',
    'board.dialogTitle': '新建看板',
    'board.nameLabel': '看板名称',
    'board.namePlaceholder': '例如：Sprint 1',
    'board.nameRequired': '请填写看板名称',
    'board.createAction': '创建',
    'board.created': '看板「{title}」已创建',
    'board.dirLaterHint': '工作目录会在第一次把 AI 任务发送到会话时再选择。',
  },
  {
    'board.subtitle': '{todo} to do · {doing} in progress · {done} done',
    'board.subtitleEmpty': 'Choose or create a project to begin',
    'board.selectBoard': 'Select board',
    'board.newBoard': 'New board',
    'board.resizeDetail': 'Drag to resize the task details',
    'board.newTask': 'New task',
    'board.addToColumn': 'Add task to {status}',
    'board.emptyColumn': 'No tasks',
    'board.noBoardTitle': 'No boards yet',
    'board.noBoardDesc': 'Create a board to begin — no directory needed. The directory is picked the first time an AI task runs in a session.',
    'board.errorTitle': 'Could not load the board',
    'board.archived': 'Task archived',
    'detail.title': 'Task details',
    'detail.close': 'Close details',
    'detail.emptyTitle': 'Select a task',
    'detail.emptyDesc': 'Pick a card on the left to see its fields, attachments and session.',
    'detail.start': 'Start date',
    'detail.due': 'Due date',
    'detail.created': 'Created',
    'detail.updated': 'Updated',
    'detail.description': 'Description',
    'detail.tags': 'Tags',
    'detail.attachments': 'Attachments',
    'detail.session': 'Session',
    'detail.linkedSession': 'Linked session',
    'detail.noValue': 'Not set',
    'detail.noDescription': 'No description',
    'detail.noAttachments': 'No attachments',
    'detail.previewAttachment': 'Preview {name}',
    'detail.previewHint': 'Click the large image to zoom; video and other files preview in the right rail.',
    'detail.noSession': 'This task has no session yet',
    'detail.aiHint': 'AI tasks can run in a session; the session links back to this card.',
    'detail.edit': 'Edit',
    'detail.run': 'Send to session',
    'detail.changeStatus': 'Change task status',
    'detail.delete': 'Delete',
    'detail.deleteConfirm': 'Click again to delete',
    'board.untitled': 'Untitled board',
    'board.dialogTitle': 'New board',
    'board.nameLabel': 'Board name',
    'board.namePlaceholder': 'e.g. Sprint 1',
    'board.nameRequired': 'Enter a board name',
    'board.createAction': 'Create',
    'board.created': 'Board "{title}" created',
    'board.dirLaterHint': 'The working directory is chosen the first time an AI task runs in a session.',
  },
)

/** localStorage key remembering the user's detail-pane width across reloads. */
// Keep the original preference key so existing detail widths survive the rename.
const KBN_DETAIL_WIDTH_KEY = 'dsh-kanban:detail-width'

/**
 * Read the remembered detail width.
 * @returns {number | null}
 */
function kbnReadDetailWidth() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(KBN_DETAIL_WIDTH_KEY)
    if (typeof raw !== 'string' || raw === '') return null
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/**
 * Remember (or forget) the detail width.
 * @param {number | null} width
 * @returns {void}
 */
function kbnStoreDetailWidth(width) {
  try {
    if (typeof localStorage === 'undefined') return
    if (width === null) localStorage.removeItem(KBN_DETAIL_WIDTH_KEY)
    else localStorage.setItem(KBN_DETAIL_WIDTH_KEY, String(Math.round(width)))
  } catch {
    // Private browsing or a disabled store: the width simply is not remembered.
  }
}

/** Detail-pane width chosen by dragging; null means the responsive default. */
let kbnDetailWidth = kbnReadDetailWidth()
/** Narrowest usable detail pane. */
const KBN_DETAIL_MIN = 232
/** Widest detail pane on any screen. */
const KBN_DETAIL_MAX = 560
/** Three readable columns and the two 14px gutters between them. */
const KBN_BOARD_MIN = 3 * 216 + 2 * 14
/** Resizer width plus the two flex gaps it replaces. */
const KBN_RESIZER_SPACE = 34

/**
 * Reserve room for the three columns after the sidebar and page gutters.
 * @param {number} workbenchWidth
 * @returns {{ min: number, max: number, fallback: number, stacked: boolean }}
 */
function kbnDetailLimits(workbenchWidth) {
  const width = Number.isFinite(workbenchWidth) && workbenchWidth > 0 ? workbenchWidth : 1200
  const remaining = width - KBN_RESIZER_SPACE - KBN_BOARD_MIN
  const max = Math.max(KBN_DETAIL_MIN, Math.min(KBN_DETAIL_MAX, Math.floor(remaining)))
  const fallback = Math.min(max, 304, Math.max(248, Math.round(width * 0.26)))
  return { min: KBN_DETAIL_MIN, max, fallback, stacked: remaining < KBN_DETAIL_MIN }
}

/**
 * Clamp one requested detail width into the adaptive range.
 * @param {number} width
 * @param {{ min: number, max: number }} limits
 * @returns {number}
 */
function kbnClampDetailWidth(width, limits) {
  const rounded = Math.round(width)
  return Math.min(limits.max, Math.max(limits.min, Number.isFinite(rounded) ? rounded : limits.fallback))
}

/** Keep board identity across panel mounts, reloads and desktop restarts. */
const KBN_SELECTED_BOARD_KEY = 'dsh-workboard:selected-board'

function kbnReadSelectedBoard() {
  try {
    return localStorage.getItem(KBN_SELECTED_BOARD_KEY) || null
  } catch {
    return null
  }
}

let kbnLastWorkspaceId = kbnReadSelectedBoard()

function kbnRememberBoard(boardId) {
  if (boardId === kbnLastWorkspaceId) return
  kbnLastWorkspaceId = boardId
  try {
    if (boardId === null) localStorage.removeItem(KBN_SELECTED_BOARD_KEY)
    else localStorage.setItem(KBN_SELECTED_BOARD_KEY, boardId)
  } catch {
    // The in-memory selection still works when browser storage is unavailable.
  }
}

/**
 * Create a standalone board. A board does not need a working directory; the
 * directory is requested the first time one of its AI tasks is sent to a
 * session (handled by `dispatchTask`).
 * @param {{ open: boolean, onClose: (board?: object) => void }} props
 * @returns {object} React element
 */
function NewBoardDialog({ open, onClose }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const saving = useRef(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setBusy(false)
    setError(null)
  }, [open])

  async function save() {
    if (saving.current) return
    const name = title.trim()
    if (name === '') {
      setError(t('board.nameRequired'))
      return
    }
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      const board = await kanbanStore.createBoard(name)
      kanbanStore.toast(t('board.created', { title: board.title }), 'info')
      onClose(board)
    } catch (failure) {
      setError(messageOf(failure))
      setBusy(false)
    } finally {
      saving.current = false
    }
  }

  const footer = [
    h(DshUI.Button, { key: 'cancel', variant: 'ghost', size: 'sm', disabled: busy, onClick: () => onClose() }, t('common.cancel')),
    h(DshUI.Button, { key: 'create', variant: 'primary', size: 'sm', disabled: busy, onClick: save }, t('board.createAction')),
  ]

  return h(DshUI.Modal, {
    open,
    onClose: () => { if (!saving.current) onClose() },
    title: t('board.dialogTitle'),
    closeLabel: t('common.close'),
    className: 'kbn-new-board-dialog',
    footer,
  }, h('div', { className: 'kbn-project-dialog' },
    error !== null ? h('p', { className: 'kbn-editor-error', role: 'alert' }, error) : null,
    h(Field, { label: t('board.nameLabel') },
      h(DshUI.Input, {
        value: title,
        onChange: (event) => setTitle(event.currentTarget.value),
        placeholder: t('board.namePlaceholder'),
        maxLength: 80,
        disabled: busy,
        autoFocus: true,
        'aria-label': t('board.nameLabel'),
        onKeyDown: (event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            save()
          }
        },
      })),
    h('p', { className: 'kbn-detail-note' }, t('board.dirLaterHint'))))
}

function useMenuPlacement(open, heightLimit, anchorSelector) {
  const [side, setSide] = useState('bottom')
  const trigger = useRef(null)
  const firstItem = useRef(null)
  const getAnchorRect = useCallback(() => {
    const anchor = anchorSelector ? trigger.current?.closest(anchorSelector) : trigger.current
    return anchor?.getBoundingClientRect() ?? null
  }, [anchorSelector])

  React.useLayoutEffect(() => {
    if (!open) return
    const menu = firstItem.current?.closest('[role="menu"]')
    if (!menu) return
    function place() {
      const rect = getAnchorRect()
      if (!rect) return
      // DSH reserves a 12px viewport inset and a 4px gap around the trigger.
      const below = window.innerHeight - rect.bottom - 16
      const above = rect.top - 16
      if (heightLimit) menu.style.maxHeight = Math.max(0, Math.min(heightLimit, Math.max(above, below))) + 'px'
      setSide(below < menu.offsetHeight && above > below ? 'top' : 'bottom')
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, getAnchorRect, heightLimit])
  return { trigger, firstItem, getAnchorRect, side }
}

function BoardSwitcher({ boards, board, onChange, disabled }) {
  const [expanded, setExpanded] = useState(false)
  const open = expanded && !disabled && boards.length > 0
  const { trigger, firstItem, getAnchorRect, side } = useMenuPlacement(open, 360, '.kbn-head-main')
  const label = t('board.selectBoard')
  return h(DshUI.Menu, {
    className: 'kbn-board-switcher', listClassName: 'kbn-board-options',
    open, side, align: 'start', portal: true, autoFocus: true, getAnchorRect,
    selectedId: board?.id,
    items: boards.map(({ id, title }, index) => ({
      id, label: h('span', { ref: index === 0 ? firstItem : undefined, className: 'kbn-board-option-name', title }, title),
    })),
    onClose: () => setExpanded(false),
    onSelect: (id) => {
      setExpanded(false)
      if (id !== board?.id) onChange(id)
    },
    anchor: h(DshUI.Button, {
      ref: trigger, variant: 'ghost', className: 'kbn-board-switcher-button',
      disabled: disabled || !boards.length, title: open ? undefined : label,
      'aria-label': board ? label + ' · ' + board.title : label, 'aria-haspopup': 'menu', 'aria-expanded': open,
      onClick: () => setExpanded((value) => !value),
      onKeyDown: (event) => {
        if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
          event.preventDefault()
          setExpanded(true)
        }
      },
    }, h('span', { className: 'kbn-board-switcher-name' }, board?.title || label),
    h(DshUI.IconChevronDownOutlineRegular, { size: 16, className: 'kbn-board-switcher-arrow', 'aria-hidden': true })),
  })
}

function TaskStatusMenu({ status, busy, onChange, listClassName }) {
  const [open, setOpen] = useState(false)
  const { trigger, firstItem, side, getAnchorRect } = useMenuPlacement(open)
  const pointer = useRef(false)

  return h('span', {
    className: 'kbn-detail-status-picker',
    onPointerDownCapture: () => { pointer.current = true },
    onKeyDownCapture: () => { pointer.current = false },
  }, h(DshUI.Menu, {
    open, side, align: 'start', portal: true, autoFocus: true, getAnchorRect,
    selectedId: status, listClassName,
    items: STATUSES.map((id, i) => ({
      id, label: h('span', { ref: i === 0 ? firstItem : undefined }, t('status.' + id)),
    })),
    onClose: () => setOpen(false),
    onSelect: (id) => {
      setOpen(false)
      if (id !== status) onChange(id, pointer.current)
    },
    anchor: h(DshUI.Button, {
      variant: 'outline', size: 'sm', className: 'kbn-detail-status-trigger',
      disabled: busy, 'aria-label': t('detail.changeStatus'), title: t('detail.changeStatus'),
      'aria-haspopup': 'menu', 'aria-expanded': open,
      onClick: (event) => {
        trigger.current = event.currentTarget
        setOpen((value) => !value)
      },
    }, h(StatusDot, { status }), h(Icon, { name: 'chevronDown', size: 12 })),
  }))
}

/**
 * Right-hand task detail sheet. A single neutral surface with divided sections,
 * deliberately a different UI form from the three status columns: no status
 * colour bar, vertical field list, attachments and session in one place.
 * @param {{ task: object | null, workspace: object | null, busy: boolean,
 *   onClose: Function, onEdit: Function, onRun: Function,
 *   onOpenSession: Function, onArchive: Function, onStatusChange: Function, onDelete: Function }} props
 * @returns {object} React element
 */
function TaskDetailPanel({
  task,
  workspace,
  busy,
  onClose,
  onEdit,
  onRun,
  onOpenSession,
  onArchive,
  onStatusChange,
  onDelete,
  onPreview,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeAttachmentId, setActiveAttachmentId] = useState(null)
  const account = useKbnAccount()
  const taskId = task === null || task === undefined ? null : task.id
  useEffect(() => {
    setConfirmDelete(false)
  }, [taskId])
  useEffect(() => {
    setActiveAttachmentId(null)
  }, [taskId])

  if (task === null || task === undefined) {
    return h('aside', { className: 'kbn-detail kbn-detail-blank', 'aria-label': t('detail.title') },
      h('span', { className: 'kbn-detail-blank-icon', 'aria-hidden': 'true' }, h(Icon, { name: 'board', size: 22 })),
      h('p', { className: 'kbn-detail-blank-title' }, t('detail.emptyTitle')),
      h('p', { className: 'kbn-detail-note' }, t('detail.emptyDesc')))
  }

  const status = STATUSES.indexOf(task.status) >= 0 ? task.status : 'todo'
  const tags = Array.isArray(task.tags) ? task.tags.filter((tag) => typeof tag === 'string' && tag !== '') : []
  const attachments = Array.isArray(task.attachments) ? task.attachments : []
  const images = attachments.filter((attachment) => kbnAttachmentKind(attachment) === 'image')
  const activeImage = images.find((attachment) => attachment.id === activeAttachmentId)
    || images[0]
    || null
  const assignee = task.assignee !== null && typeof task.assignee === 'object'
    ? task.assignee
    : { kind: 'human', name: '' }
  const isAI = assignee.kind === 'ai'
  const accountProfile = account !== null && account !== undefined ? account.profile : null
  const showAccountAvatar = !isAI && kbnAccountMatchesTask(task, accountProfile)
  const assigneeLabel = typeof assignee.name === 'string' && assignee.name.trim() !== ''
    ? assignee.name
    : (isAI ? t('assignee.ai') : (showAccountAvatar && accountProfile.name !== null ? accountProfile.name : t('assignee.human')))
  const title = typeof task.title === 'string' && task.title.trim() !== '' ? task.title : t('card.untitled')
  const description = typeof task.description === 'string' ? task.description.trim() : ''
  const linked = typeof task.sessionId === 'string' && task.sessionId !== ''
  const dueIn = typeof task.dueDate === 'string' && task.dueDate !== '' ? daysUntil(task.dueDate) : null
  const overdue = dueIn !== null && dueIn < 0

  const actions = []
  if (linked) {
    actions.push(h(Button, {
      key: 'session',
      size: 'sm',
      variant: 'ghost',
      icon: h(Icon, { name: 'link', size: 12 }),
      onClick: () => onOpenSession(task),
    }, t('action.openSession')))
  }
  actions.push(h(Button, {
    key: 'archive',
    size: 'sm',
    variant: 'ghost',
    icon: h(Icon, { name: 'archive', size: 12 }),
    disabled: busy,
    onClick: () => onArchive(task),
  }, t('card.archive')))
  actions.push(h(Button, {
    key: 'delete',
    size: 'sm',
    variant: 'danger',
    icon: h(Icon, { name: 'trash', size: 12 }),
    disabled: busy,
    onClick: () => {
      if (confirmDelete) {
        setConfirmDelete(false)
        onDelete(task)
        return
      }
      setConfirmDelete(true)
    },
  }, confirmDelete ? t('detail.deleteConfirm') : t('detail.delete')))
  if (isAI && status !== 'done') {
    actions.push(h(Button, {
      key: 'run',
      size: 'sm',
      variant: 'primary',
      icon: h(Icon, { name: 'send', size: 12 }),
      disabled: busy,
      onClick: () => onRun(task),
    }, t('detail.run')))
  }

  return h('aside', { className: 'kbn-detail', 'aria-label': t('detail.title') },
    h('header', { className: 'kbn-detail-head' },
      h('span', { className: 'kbn-detail-eyebrow' }, t('detail.title')),
      h('div', { className: 'kbn-detail-head-actions' },
        h('button', {
          type: 'button',
          className: 'kbn-card-edit kbn-detail-edit',
          'aria-label': t('detail.edit'),
          title: t('detail.edit'),
          disabled: busy || undefined,
          onClick: () => onEdit(task),
        }, h(Icon, { name: 'edit', size: 13 })),
        h(IconButton, { icon: h(Icon, { name: 'close' }), label: t('detail.close'), onClick: onClose }))),
    h('div', { className: 'kbn-detail-body' },
      h('div', { className: 'kbn-detail-content' },
        h('div', { className: 'kbn-detail-title-row' },
          h('h2', { className: 'kbn-detail-title' }, title),
          h(PriorityBadge, { priority: task.priority })),
        description !== '' && h('p', { className: 'kbn-detail-desc' }, description)),
      workspace !== null && workspace !== undefined
        ? h('p', { className: 'kbn-detail-workspace', title: workspace.path || workspace.title },
          h(Icon, { name: workspace.path !== '' ? 'folderOpen' : 'board', size: 12 }),
          h('span', null, workspace.title))
        : null,
      h('div', { className: 'kbn-detail-chips' },
        h(TaskStatusMenu, {
          key: task.id, status, busy,
          onChange: (value, animate) => onStatusChange(task, value, animate),
        }),
        h('span', { className: 'kbn-detail-status', 'data-kind': isAI ? 'ai' : 'human' },
          showAccountAvatar
            ? h(KbnAccountAvatar, { profile: accountProfile, size: 18 })
            : h(Icon, { name: isAI ? 'sparkle' : 'user', size: 12 }),
          assigneeLabel),
        linked
          ? h('span', { className: 'kbn-detail-status', 'data-tone': 'brand' },
            h(Icon, { name: 'link', size: 12 }),
            t('detail.linkedSession'))
          : null),
      h('dl', { className: 'kbn-detail-fields' },
        h('dt', null, t('detail.start')),
        h('dd', null, typeof task.startDate === 'string' && task.startDate !== '' ? task.startDate : t('detail.noValue')),
        h('dt', null, t('detail.due')),
        h('dd', { className: overdue ? 'kbn-detail-overdue' : undefined },
          typeof task.dueDate === 'string' && task.dueDate !== '' ? formatDay(task.dueDate) : t('detail.noValue')),
        h('dt', null, t('detail.created')),
        h('dd', null, typeof task.createdAt === 'string' && task.createdAt !== '' ? task.createdAt.slice(0, 10) : t('detail.noValue')),
        h('dt', null, t('detail.updated')),
        h('dd', null, typeof task.updatedAt === 'string' && task.updatedAt !== '' ? task.updatedAt.slice(0, 10) : t('detail.noValue'))),
      tags.length > 0
        ? h('section', { className: 'kbn-detail-section' },
          h('h3', { className: 'kbn-detail-section-title' }, t('detail.tags')),
          h('div', { className: 'kbn-detail-tags' },
            tags.map((tag, index) => h('span', { className: 'kbn-tag', key: index }, tag))))
        : null,
      h('section', { className: 'kbn-detail-section' },
        h('h3', { className: 'kbn-detail-section-title' }, t('detail.attachments')),
        attachments.length > 0
          ? h('div', { className: 'kbn-attach' },
            activeImage !== null
              ? h('button', {
                type: 'button',
                className: 'kbn-attach-hero',
                title: activeImage.name,
                'aria-label': t('detail.previewAttachment', { name: activeImage.name }),
                onClick: () => {
                  if (typeof onPreview === 'function') onPreview(activeImage)
                },
              },
                h('img', {
                  className: 'kbn-attach-hero-img',
                  src: kanbanStore.attachmentUrl(activeImage.id),
                  alt: activeImage.name,
                  loading: 'lazy',
                }),
                h('span', { className: 'kbn-attach-hero-cap' },
                  h(Icon, { name: 'search', size: 12 }),
                  h('span', { className: 'kbn-attach-hero-name' }, activeImage.name),
                  h('span', { className: 'kbn-attach-hero-size' }, formatBytes(activeImage.size))))
              : null,
            h('div', { className: 'kbn-attach-thumbs' },
              attachments.map((attachment) => {
                const kind = kbnAttachmentKind(attachment)
                const active = activeImage !== null && attachment.id === activeImage.id
                if (kind === 'image') {
                  return h('button', {
                    key: attachment.id,
                    type: 'button',
                    className: 'kbn-attach-thumb',
                    'data-active': active ? 'true' : undefined,
                    title: t('detail.previewAttachment', { name: attachment.name }),
                    'aria-label': t('detail.previewAttachment', { name: attachment.name }),
                    onClick: () => setActiveAttachmentId(attachment.id),
                  }, h('img', {
                    className: 'kbn-attach-thumb-img',
                    src: kanbanStore.attachmentUrl(attachment.id),
                    alt: attachment.name,
                    loading: 'lazy',
                  }))
                }
                return h('button', {
                  key: attachment.id,
                  type: 'button',
                  className: 'kbn-attach-thumb kbn-attach-thumb-file',
                  title: attachment.name,
                  'aria-label': t('detail.previewAttachment', { name: attachment.name }),
                  onClick: () => {
                    if (typeof onPreview === 'function') onPreview(attachment)
                  },
                },
                  h(Icon, { name: kbnAttachmentIcon(kind), size: 16 }),
                  h('span', { className: 'kbn-attach-thumb-ext' }, kbnAttachmentExt(attachment.name) || 'FILE'))
              })),
            h('p', { className: 'kbn-detail-note' }, t('detail.previewHint')))
          : h('p', { className: 'kbn-detail-note' }, t('detail.noAttachments'))),
      h('section', { className: 'kbn-detail-section' },
        h('h3', { className: 'kbn-detail-section-title' }, t('detail.session')),
        linked
          ? h('code', { className: 'kbn-detail-session' }, task.sessionId)
          : h('p', { className: 'kbn-detail-note' }, isAI ? t('detail.aiHint') : t('detail.noSession')))),
    h('footer', { className: 'kbn-detail-actions' }, actions))
}

/** Reveal the destination in its column and carry the card across the column gutters. */
function revealMovedCard(card, from) {
  const column = card.closest('.kbn-col-body')
  const scroller = getComputedStyle(column).overflowY === 'visible' ? card.closest('.kbn-board-region') : column
  const viewport = scroller.getBoundingClientRect()
  const bounds = card.getBoundingClientRect()
  if (bounds.top < viewport.top) scroller.scrollTop += bounds.top - viewport.top
  else if (bounds.bottom > viewport.bottom) {
    scroller.scrollTop += Math.min(bounds.top - viewport.top, bounds.bottom - viewport.bottom)
  }
  if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const board = card.closest('.kbn-board')
  const origin = board.getBoundingClientRect()
  const to = card.getBoundingClientRect()
  const x1 = from.left - origin.left
  const y1 = from.top - origin.top
  const x2 = to.left - origin.left
  const y2 = to.top - origin.top
  const lift = Math.min(36, Math.abs(x2 - x1) * 0.08)
  // Both scrollable columns clip their children. Animate an inert copy on the
  // board surface; the real card already occupies its final slot.
  const copy = card.cloneNode(true)
  copy.inert = true
  copy.setAttribute('aria-hidden', 'true')
  copy.removeAttribute('data-task-id')
  copy.classList.add('kbn-card-flight')
  copy.style.width = to.width + 'px'
  copy.style.offsetPath = `path("M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - lift} ${x2} ${y2}")`
  board.appendChild(copy)
  const conceal = card.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 260, fill: 'both' })
  const flight = copy.animate([{ offsetDistance: '0%' }, { offsetDistance: '100%' }], {
    duration: 260, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both',
  })
  function removeCopy() {
    copy.remove()
    conceal.cancel()
  }
  flight.onfinish = removeCopy
  return () => { flight.cancel(); removeCopy() }
}

/**
 * The central board panel. Standard slot props are accepted; copy, data and
 * actions come from the prelude and the module-level store.
 * @param {object} [props]
 * @returns {object} React element
 */
function BoardPage(props) {
  const store = kanbanStore
  const state = store.use((snapshot) => snapshot)
  const [workspaceId, setWorkspaceId] = useState(props?.boardId || kbnLastWorkspaceId)
  const [sendTask, setSendTask] = useState(null)
  const [editor, setEditor] = useState(null)
  const [boardOpen, setBoardOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [busyTaskId, setBusyTaskId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [detailWidth, setDetailWidth] = useState(kbnDetailWidth)
  const [workbenchWidth, setWorkbenchWidth] = useState(() => window.innerWidth)
  const [resizing, setResizing] = useState(false)
  const workbenchRef = useRef(null)
  const pendingMove = useRef(null)
  const resizeStartRef = useRef(null)

  const boards = boardsOf(state)
  const selectedBoard = boardOf(state, workspaceId)
  const activeBoard = selectedBoard !== null
    ? selectedBoard
    : (boards.length > 0 ? boards[0] : null)
  const activeBoardId = activeBoard !== null ? activeBoard.id : null
  const boardTasks = activeBoardId !== null ? tasksOf(state, activeBoardId) : []
  const tasksByStatus = { todo: [], doing: [], done: [] }
  boardTasks.forEach((task) => {
    if (tasksByStatus[task.status] !== undefined) tasksByStatus[task.status].push(task)
  })
  const selectedTask = selectedTaskId === null ? null : taskById(state, selectedTaskId)

  // React mounts a new card when it changes columns. Measure its destination
  // before paint, after the host has confirmed the move and the board has reflowed.
  React.useLayoutEffect(() => {
    const move = pendingMove.current
    pendingMove.current = null
    if (!move || selectedTask?.id !== move.id || selectedTask.status !== move.status) return
    const card = workbenchRef.current?.querySelector('.kbn-card-slot > .kbn-card[data-selected=true]')
    if (card) return revealMovedCard(card, move.from)
  }, [selectedTask?.id, selectedTask?.status, activeBoardId])

  // The DSH sidebar can change the panel width without resizing the window.
  // Measure inside the page gutters. Only explicit splitter actions save a preference.
  React.useLayoutEffect(() => {
    const element = workbenchRef.current
    if (!element) return
    function measure() {
      if (element.clientWidth > 0) setWorkbenchWidth(element.clientWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const limits = kbnDetailLimits(workbenchWidth)
  const shownDetailWidth = detailWidth === null ? limits.fallback : kbnClampDetailWidth(detailWidth, limits)

  /** Store one width (clamped) and remember it across panel switches. */
  function applyDetailWidth(next) {
    const width = next === null ? null : kbnClampDetailWidth(next, limits)
    kbnDetailWidth = width
    kbnStoreDetailWidth(width)
    setDetailWidth(width)
  }

  function startResize(event) {
    if (event.button !== undefined && event.button !== 0) return
    const element = event.currentTarget
    resizeStartRef.current = { x: event.clientX, width: shownDetailWidth }
    if (element !== null && element !== undefined && typeof element.setPointerCapture === 'function') {
      try {
        element.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture is best effort; dragging still works without it.
      }
    }
    setResizing(true)
    event.preventDefault()
  }

  function moveResize(event) {
    const start = resizeStartRef.current
    if (start === null) return
    applyDetailWidth(start.width + (start.x - event.clientX))
  }

  function endResize(event) {
    if (resizeStartRef.current === null) return
    resizeStartRef.current = null
    setResizing(false)
    const element = event !== null && event !== undefined ? event.currentTarget : null
    if (element !== null && element !== undefined && typeof element.releasePointerCapture === 'function') {
      try {
        element.releasePointerCapture(event.pointerId)
      } catch {
        // Already released.
      }
    }
  }

  function keyResize(event) {
    const step = event.shiftKey ? 48 : 16
    if (event.key === 'ArrowLeft') applyDetailWidth(shownDetailWidth + step)
    else if (event.key === 'ArrowRight') applyDetailWidth(shownDetailWidth - step)
    else if (event.key === 'Home') applyDetailWidth(limits.min)
    else if (event.key === 'End') applyDetailWidth(limits.max)
    else return
    event.preventDefault()
  }

  // First mount: load the board unless something already did.
  useEffect(() => {
    if (store.getSnapshot().status === 'idle') store.refresh()
  }, [])

  // Keep a valid board selected and remember the last one.
  useEffect(() => {
    // Loading and failed requests cannot tell us whether a saved board is gone.
    if (state.status !== 'ready') return
    if (boards.length === 0) {
      kbnRememberBoard(null)
      if (workspaceId !== null) setWorkspaceId(null)
      return
    }
    if (workspaceId !== null && boardOf(state, workspaceId) !== null) {
      kbnRememberBoard(workspaceId)
      return
    }
    const fallback = kbnLastWorkspaceId !== null && boardOf(state, kbnLastWorkspaceId) !== null
      ? kbnLastWorkspaceId
      : boards[0].id
    kbnRememberBoard(fallback)
    setWorkspaceId(fallback)
  }, [state.status, state.workspaces, state.boards, workspaceId])

  // A preview belongs to the selected task; drop it when the selection moves.
  useEffect(() => {
    setPreview(null)
  }, [selectedTaskId])

  // Forget a selection whose task left the live board (archived or deleted).
  useEffect(() => {
    if (selectedTaskId === null) return
    const task = taskById(state, selectedTaskId)
    if (task === null || task.archived === true) setSelectedTaskId(null)
  }, [state.revision, state.tasks, selectedTaskId])

  // Reveal a task requested through the session header link.
  useEffect(() => {
    const id = store.takeFocusTask()
    if (id === null || id === undefined) return
    const task = taskById(store.getSnapshot(), id)
    if (task === null) {
      store.refresh()
      return
    }
    kbnRememberBoard(task.workspaceId)
    setWorkspaceId(task.workspaceId)
    setSelectedTaskId(id)
  }, [state.revision])

  const editorTask = editor !== null && editor.mode === 'edit' ? taskById(state, editor.taskId) : null
  const editorOpen = editor !== null && (editor.mode === 'create' || editorTask !== null)

  function openCreate(status) {
    if (activeBoardId === null) {
      setBoardOpen(true)
      return
    }
    setSelectedTaskId(null)
    setEditor({ mode: 'create', workspaceId: activeBoardId, status })
  }

  function openEdit(task) {
    setSelectedTaskId(task.id)
    setEditor({ mode: 'edit', taskId: task.id })
  }

  function closeEditor() {
    setEditor(null)
  }

  async function changeDetailStatus(task, status, animate) {
    if (task.status === status) return
    const board = workbenchRef.current
    const card = board?.querySelector('.kbn-card-flight') || board?.querySelector('.kbn-card[data-selected=true]')
    pendingMove.current = { id: task.id, status, from: animate ? card?.getBoundingClientRect() : null }
    setBusyTaskId(task.id)
    try {
      await store.moveTask(task.id, status)
    } catch (error) {
      if (pendingMove.current?.id === task.id) pendingMove.current = null
      store.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyTaskId((id) => id === task.id ? null : id)
    }
  }

  async function handleArchiveTask(task) {
    setBusyTaskId(task.id)
    try {
      await store.archiveTask(task.id)
      if (selectedTaskId === task.id) setSelectedTaskId(null)
      kanbanStore.toast(t('board.archived'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyTaskId(null)
    }
  }

  async function handleDeleteTask(task) {
    setBusyTaskId(task.id)
    try {
      await kanbanStore.deleteTask(task.id)
      if (selectedTaskId === task.id) setSelectedTaskId(null)
      kanbanStore.toast(t('editor.deleted'), 'info')
    } catch (error) {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    } finally {
      setBusyTaskId(null)
    }
  }

  function handleCardDragStart(task) {
    setDrag({ taskId: task.id })
    setDropTarget(null)
  }

  function handleCardDragEnd() {
    setDrag(null)
    setDropTarget(null)
  }

  function handleColumnDragOver(event, status) {
    if (drag === null) return
    event.preventDefault()
    if (event.dataTransfer !== null && event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
    if (dropTarget === null || dropTarget.status !== status || dropTarget.beforeId !== null) {
      setDropTarget({ status, beforeId: null })
    }
  }

  function handleCardDragOver(event, task) {
    if (drag === null || drag.taskId === task.id) return
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer !== null && event.dataTransfer !== undefined) event.dataTransfer.dropEffect = 'move'
    const cards = (tasksByStatus[task.status] || []).filter((item) => item.id !== drag.taskId)
    const index = cards.findIndex((item) => item.id === task.id)
    const rect = event.currentTarget.getBoundingClientRect()
    const below = event.clientY > rect.top + rect.height / 2
    let beforeId = task.id
    if (below) {
      const next = index >= 0 ? cards[index + 1] : null
      beforeId = next !== undefined && next !== null ? next.id : null
    }
    if (dropTarget === null || dropTarget.status !== task.status || dropTarget.beforeId !== beforeId) {
      setDropTarget({ status: task.status, beforeId })
    }
  }

  function handleDrop(status) {
    if (drag === null) return
    const target = dropTarget !== null && dropTarget.status === status
      ? dropTarget
      : { status, beforeId: null }
    const taskId = drag.taskId
    setDrag(null)
    setDropTarget(null)
    if (typeof target.beforeId === 'string' && target.beforeId === taskId) return
    kanbanStore.moveTask(taskId, status, target.beforeId === null ? undefined : target.beforeId).catch((error) => {
      kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
    })
  }

  function renderColumn(status) {
    const tasks = tasksByStatus[status] || []
    const isDropColumn = drag !== null && dropTarget !== null && dropTarget.status === status
    const statusLabel = t('status.' + status)
    const items = []

    tasks.forEach((task) => {
      const showLine = drag !== null && dropTarget !== null && dropTarget.status === status
        && dropTarget.beforeId === task.id && drag.taskId !== task.id
      items.push(h('div', {
        className: 'kbn-card-slot',
        key: task.id,
        'data-task-id': task.id,
        onDragOver: (event) => handleCardDragOver(event, task),
        onDrop: (event) => {
          event.preventDefault()
          event.stopPropagation()
          handleDrop(status)
        },
      },
        showLine ? h('div', { className: 'kbn-drop-line', 'aria-hidden': 'true' }) : null,
        h(TaskCard, {
          task,
          workspace: activeBoard,
          selected: selectedTaskId === task.id,
          busy: busyTaskId === task.id,
          onEdit: openEdit,
          onRun: setSendTask,
          onOpenSession: openTaskSession,
          onArchive: handleArchiveTask,
          onDelete: handleDeleteTask,
          onDragStart: () => handleCardDragStart(task),
          onDragEnd: handleCardDragEnd,
          onSelect: (selected) => setSelectedTaskId(selected.id),
        })))
    })

    if (tasks.length === 0) {
      items.push(h('div', { className: 'kbn-col-empty', key: 'empty' }, t('board.emptyColumn')))
    }
    if (drag !== null && dropTarget !== null && dropTarget.status === status && dropTarget.beforeId === null) {
      items.push(h('div', { className: 'kbn-drop-line', key: 'drop-end', 'aria-hidden': 'true' }))
    }

    return h('section', {
      className: 'kbn-col',
      key: status,
      'data-status': status,
      'data-drop': isDropColumn ? 'true' : undefined,
    },
      h('div', { className: 'kbn-col-head' },
        h('span', { className: 'kbn-col-dot', 'data-status': status, 'aria-hidden': 'true' }),
        h('h2', { className: 'kbn-col-title' }, statusLabel),
        h('span', { className: 'kbn-col-count' }, String(tasks.length)),
        h('button', {
          type: 'button',
          className: 'kbn-col-add',
          'aria-label': t('board.addToColumn', { status: statusLabel }),
          title: t('board.addToColumn', { status: statusLabel }),
          onClick: () => openCreate(status),
        }, h(Icon, { name: 'plus', size: 14 }))),
      h('div', {
        className: cx('kbn-col-body', isDropColumn ? 'kbn-col-drop kbn-drop-target' : null),
        onDragOver: (event) => handleColumnDragOver(event, status),
        onDrop: (event) => {
          event.preventDefault()
          handleDrop(status)
        },
      }, items))
  }

  const inlineError = state.status === 'error' && typeof state.error === 'string' && state.error !== ''
    ? h('div', { className: 'kbn-error-bar', role: 'alert' },
      h(Icon, { name: 'warning', size: 14 }),
      h('span', null, state.error),
      h(Button, {
        size: 'sm',
        variant: 'ghost',
        icon: h(Icon, { name: 'refresh', size: 12 }),
        onClick: () => store.refresh(),
      }, t('common.retry')))
    : null

  const newBoardAction = h(Button, {
    variant: 'primary',
    icon: h(Icon, { name: 'projectAdd', size: 14 }),
    onClick: () => setBoardOpen(true),
  }, t('board.newBoard'))

  let region
  if (boards.length === 0) {
    if (state.status === 'error') {
      region = h('div', { className: 'kbn-board-region' },
        h('div', { className: 'kbn-board-placeholder' },
          h(EmptyState, {
            icon: h(Icon, { name: 'warning', size: 22 }),
            title: t('board.errorTitle'),
            description: state.error || '',
            action: h(Button, {
              variant: 'outline',
              icon: h(Icon, { name: 'refresh', size: 14 }),
              onClick: () => store.refresh(),
            }, t('common.retry')),
          })))
    } else if (state.status === 'loading' || state.status === 'idle') {
      region = h('div', { className: 'kbn-board-region' },
        h('div', { className: 'kbn-board-placeholder' },
          h('div', { className: 'kbn-empty' },
            h(Spinner, { size: 20, label: t('common.loading') }))))
    } else {
      region = h('div', { className: 'kbn-board-region' },
        h('div', { className: 'kbn-board-placeholder' },
          h(EmptyState, {
            icon: h(Icon, { name: 'projectAdd', size: 22 }),
            title: t('board.noBoardTitle'),
            description: t('board.noBoardDesc'),
            action: newBoardAction,
          })))
    }
  } else {
    region = h('div', { className: 'kbn-board-region' },
      inlineError,
      h('div', { className: 'kbn-board' }, STATUSES.map(renderColumn)))
  }

  return h('div', { className: 'kbn-root' },
    h('div', { className: 'kbn-page' },
      h('header', { className: 'kbn-head' },
        h(DshUI.Button, {
          className: 'kbn-head-back', variant: 'ghost', size: 'sm', 'aria-label': t('home.back'),
          onClick: () => store.openHome(), icon: h(DshUI.IconChevronLeftOutlineRegular, { size: 16 }),
        }, t('home.back')),
        h('div', { className: 'kbn-head-main' },
          h('h1', { className: 'kbn-board-heading', 'aria-label': activeBoard?.title || t('board.selectBoard') },
            h(BoardSwitcher, {
              boards, board: activeBoard,
              onChange: (next) => {
                kbnRememberBoard(next)
                setSelectedTaskId(null)
                store.openBoard(next)
                setWorkspaceId(next)
              },
            })),
          h('p', { className: 'kbn-subtitle' },
            activeBoard !== null
              ? t('board.subtitle', { todo: tasksByStatus.todo.length, doing: tasksByStatus.doing.length, done: tasksByStatus.done.length })
              : t('board.subtitleEmpty'))),
        h('div', { className: 'kbn-head-actions' },
          h(DshUI.Button, {
            variant: 'ghost', size: 'sm',
            title: t('settings.open'), 'aria-label': t('settings.open'), 'aria-haspopup': 'dialog',
            onClick: () => openWorkboardSettings(store.ctx),
          }, h(DshUI.IconSettingsOutlineMedium, { size: 16 })),
          newBoardAction)),

      h('div', {
        className: 'kbn-workbench',
        ref: workbenchRef,
        'data-resizing': resizing ? 'true' : undefined,
        'data-layout': limits.stacked ? 'stacked' : 'split',
        style: { '--kbn-detail-width': shownDetailWidth + 'px' },
      },
        region,
        h('div', {
          className: 'kbn-detail-resizer',
          role: 'separator',
          'aria-orientation': 'vertical',
          'aria-label': t('board.resizeDetail'),
          'aria-valuemin': limits.min,
          'aria-valuemax': limits.max,
          'aria-valuenow': shownDetailWidth,
          'data-resizing': resizing ? 'true' : undefined,
          tabIndex: 0,
          title: t('board.resizeDetail'),
          onPointerDown: startResize,
          onPointerMove: moveResize,
          onPointerUp: endResize,
          onPointerCancel: endResize,
          onKeyDown: keyResize,
          onDoubleClick: () => applyDetailWidth(null),
        }, h('span', { className: 'kbn-detail-resizer-grip', 'aria-hidden': 'true' })),
        h(TaskDetailPanel, {
          task: selectedTask,
          workspace: activeBoard,
          busy: selectedTask !== null && busyTaskId === selectedTask.id,
          onClose: () => setSelectedTaskId(null),
          onEdit: openEdit,
          onRun: setSendTask,
          onOpenSession: openTaskSession,
          onArchive: handleArchiveTask,
          onDelete: handleDeleteTask,
          onPreview: (attachment) => setPreview({ task: selectedTask, attachment }),
          onStatusChange: changeDetailStatus,
        }))),
      h(AttachmentPreviewRail, { preview, onClose: () => setPreview(null) }),

    sendTask && h(TaskSendDialog, { key: sendTask.id, task: sendTask, onClose: () => setSendTask(null) }),
    h(TaskEditorDialog, {
      open: editorOpen,
      mode: editor !== null ? editor.mode : 'create',
      task: editorTask,
      columnStatus: editor?.status,
      workspaceId: editor !== null && typeof editor.workspaceId === 'string' ? editor.workspaceId : activeBoardId,
      onClose: closeEditor,
    }),
    h(NewBoardDialog, {
      open: boardOpen,
      onClose: (board) => {
        setBoardOpen(false)
        if (board !== null && board !== undefined && typeof board.id === 'string') {
          kbnRememberBoard(board.id)
          store.openBoard(board.id)
          setWorkspaceId(board.id)
          setSelectedTaskId(null)
        }
      },
    }),
    h(ToastHost))
}


/* ---- 56-home.js ---- */
/** Workboard overview. Interactive controls and glyphs come from DSH itself. */
addDict({
  'home.subtitle': '所有看板与灵感，都在这里。',
  'home.back': '返回',
  'home.boards': '任务看板',
  'home.boardCount': '{count} 个看板',
  'home.unbound': '未绑定工作目录',
  'home.empty': '创建你的第一块看板',
  'home.emptyHint': '先记录任务，首次发送 AI 任务时再选择工作目录。',
  'home.searchBoards': '搜索看板',
  'home.noResults': '没有匹配的看板',
  'home.retry': '重新加载',
  'heat.title': '完成记录',
  'heat.subtitle': '最近一年 · 每日完成任务数',
  'heat.total': '共完成 {count} 项',
  'heat.day': '{date}：完成 {count} 项任务',
  'heat.note': '从启用此功能起记录；同一任务每天计一次。',
  'heat.less': '少',
  'heat.more': '多',
  'heat.empty': '完成一项任务，点亮今天。',
  'notes.title': '灵感便签',
  'notes.subtitle': '随手记下想法，便签修改自动保存。',
  'notes.count': '{count} 张便签',
  'notes.search': '搜索便签',
  'notes.placeholder': '写下你的下一个灵感…',
  'notes.add': '添加便签',
  'notes.edit': '编辑便签',
  'notes.done': '完成编辑',
  'notes.delete': '删除便签',
  'notes.deleteHint': '这张便签将被永久删除。',
  'notes.empty': '给下一个好点子，留点空间。',
  'notes.noResults': '没有匹配的便签',
  'notes.saving': '正在保存…',
  'notes.pending': '等待保存…',
  'notes.saved': '已保存',
  'notes.failed': '保存失败，内容已保留',
  'notes.required': '便签内容不能为空',
  'notes.retry': '重试保存',
  'notes.limit': '最多 4000 字',
  'notes.yellow': '浅黄', 'notes.pink': '浅粉', 'notes.blue': '浅蓝',
  'notes.mint': '薄荷绿', 'notes.purple': '淡紫', 'notes.neutral': '中性',
}, {
  'home.subtitle': 'Your boards and ideas, together.',
  'home.back': 'Back',
  'home.boards': 'Boards',
  'home.boardCount': '{count} boards',
  'home.unbound': 'No working directory yet',
  'home.empty': 'Create your first board',
  'home.emptyHint': 'Capture tasks now. Choose a directory when sending your first AI task.',
  'home.searchBoards': 'Search boards',
  'home.noResults': 'No matching boards',
  'home.retry': 'Reload',
  'heat.title': 'Completions',
  'heat.subtitle': 'Past year · tasks completed each day',
  'heat.total': '{count} completions',
  'heat.day': '{date}: {count} tasks completed',
  'heat.note': 'Recorded since this feature was enabled; each task counts once per day.',
  'heat.less': 'Less',
  'heat.more': 'More',
  'heat.empty': 'Complete a task to light up today.',
  'notes.title': 'Ideas',
  'notes.subtitle': 'Capture a thought. Changes to notes save automatically.',
  'notes.count': '{count} notes',
  'notes.search': 'Search notes',
  'notes.placeholder': 'Write down your next idea…',
  'notes.add': 'Add note',
  'notes.edit': 'Edit note',
  'notes.done': 'Finish editing',
  'notes.delete': 'Delete note',
  'notes.deleteHint': 'This note will be permanently deleted.',
  'notes.empty': 'Leave some room for your next good idea.',
  'notes.noResults': 'No matching notes',
  'notes.saving': 'Saving…',
  'notes.pending': 'Waiting to save…',
  'notes.saved': 'Saved',
  'notes.failed': 'Could not save. Your changes are kept.',
  'notes.required': 'A note cannot be empty',
  'notes.retry': 'Retry save',
  'notes.limit': 'Up to 4000 characters',
  'notes.yellow': 'Yellow', 'notes.pink': 'Pink', 'notes.blue': 'Blue',
  'notes.mint': 'Mint', 'notes.purple': 'Purple', 'notes.neutral': 'Neutral',
})

const KBN_NOTE_COLORS = ['yellow', 'pink', 'blue', 'mint', 'purple', 'neutral']
const KBN_HEAT_CELL_SIZE = 24
const KBN_HEAT_GAP = 4
const KBN_HEAT_WEEKS = 52

function kbnLocalDay(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
}

/** Calendar arithmetic stays local across DST; duplicate completions count once per task/day. */
function kbnHeatmap(completions, today) {
  const end = parseDay(today)
  const start = new Date(end)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (KBN_HEAT_WEEKS - 1) * 7)
  const byDay = new Map()
  for (const event of completions) {
    const at = new Date(event.at)
    if (!Number.isFinite(at.getTime())) continue
    const day = kbnLocalDay(at)
    if (!byDay.has(day)) byDay.set(day, new Set())
    byDay.get(day).add(event.taskId)
  }
  return Array.from({ length: KBN_HEAT_WEEKS * 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const day = kbnLocalDay(date)
    return { day, date, future: day > today, count: byDay.get(day)?.size || 0 }
  })
}

function CompletionHeatmap({ completions }) {
  const [today, setToday] = useState(todayISO)
  const weeks = KBN_HEAT_WEEKS
  const [cursor, setCursor] = useState(null)
  const root = useRef(null)
  useEffect(() => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = setTimeout(() => setToday(todayISO()), next - now + 100)
    return () => clearTimeout(timer)
  }, [today])
  const days = useMemo(() => kbnHeatmap(completions, today), [completions, today])
  const total = days.reduce((sum, day) => sum + (day.future ? 0 : day.count), 0)
  const active = cursor && days.some((day) => day.day === cursor) ? cursor : today
  const formatter = new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  const months = []
  for (let week = 0; week < weeks; week++) {
    const date = days[week * 7].date
    const previous = days[(week - 1) * 7]?.date
    if (!previous || date.getMonth() !== previous.getMonth()) {
      if (months.length) months[months.length - 1].end = week
      months.push({ week, end: weeks, date })
    }
  }
  // Leave a partial opening month unlabeled when its year would be clipped.
  if (months.length > 1 && months[0].end < 4) months.shift()
  function move(event, index) {
    const delta = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key]
    let next = delta === undefined ? null : index + delta
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = days.findIndex((day) => day.day === today)
    if (next === null) return
    event.preventDefault()
    next = Math.max(0, Math.min(days.findIndex((day) => day.day === today), next))
    setCursor(days[next].day)
    root.current?.querySelectorAll('[data-heat-day]')[next]?.focus()
  }
  return h('section', {
    className: 'kbn-home-section kbn-heat', 'aria-labelledby': 'kbn-heat-title',
    style: { '--kbn-heat-max-width': (weeks * (KBN_HEAT_CELL_SIZE + KBN_HEAT_GAP) - KBN_HEAT_GAP + 6) + 'px' },
  },
    h('div', { className: 'kbn-home-section-head' },
      h('div', null, h('h2', { id: 'kbn-heat-title' }, t('heat.title')), h('p', null, t('heat.subtitle'))),
      h('span', { className: 'kbn-home-count' }, t('heat.total', { count: total }))),
    h('div', { className: 'kbn-heat-chart', style: { '--kbn-heat-weeks': weeks } },
      h('div', { className: 'kbn-heat-months', 'aria-hidden': true }, months.map(({ week, end, date }, index) => {
        const label = index === 0 || date.getFullYear() !== months[index - 1].date.getFullYear()
          ? date.getFullYear() + '/' + (date.getMonth() + 1)
          : new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', { month: 'short' }).format(date)
        const column = Math.max(0, Math.min(week, weeks - 2))
        return h('span', { key: week, style: { gridColumn: (column + 1) + ' / ' + (end + 1) } },
          h('span', { className: 'kbn-heat-month-full' }, label),
          h('span', { className: 'kbn-heat-month-compact' }, date.getMonth() + 1))
      })),
      h('div', { ref: root, className: 'kbn-heat-grid', role: 'group', 'aria-label': t('heat.title') }, days.map((day, index) => {
        const label = t('heat.day', { date: formatter.format(day.date), count: day.count })
        return h(DshUI.Tooltip, { key: day.day, label, side: 'top', portal: true, disabled: day.future },
          h(DshUI.Button, {
            className: 'kbn-heat-cell', variant: 'ghost', size: 'sm',
            'data-heat-day': day.day, 'data-level': Math.min(4, day.count),
            'data-today': day.day === today, 'data-future': day.future,
            disabled: day.future, tabIndex: day.day === active ? 0 : -1,
            'aria-label': label, onFocus: () => setCursor(day.day), onKeyDown: (event) => move(event, index),
          }))
      }))),
    h('div', { className: 'kbn-heat-foot' },
      h('p', null, total === 0 ? t('heat.empty') : t('heat.note')),
      h('div', { className: 'kbn-heat-legend', 'aria-hidden': true },
        t('heat.less'), [0, 1, 2, 3, 4].map((level) => h('span', { key: level, className: 'kbn-heat-sample', 'data-level': level })), t('heat.more'))),
    total === 0 ? h('p', { className: 'kbn-heat-explanation' }, t('heat.note')) : null)
}

function NoteColors({ value, onChange, disabled = false }) {
  return h('div', { className: 'kbn-note-colors', role: 'group', 'aria-label': localeId === 'zh' ? '便签颜色' : 'Note color' },
    KBN_NOTE_COLORS.map((color) => h(DshUI.Tooltip, { key: color, label: t('notes.' + color), side: 'top', portal: true },
      h(DshUI.Button, {
        variant: 'ghost', size: 'sm', className: 'kbn-note-swatch', 'data-note-color': color,
        'aria-label': t('notes.' + color), 'aria-pressed': color === value, disabled,
        onClick: () => onChange(color),
      }, color === value ? h(DshUI.IconCheckOutlineRegular, { size: 14 }) : null))))
}

/** The host InlineEditor supplies sizing, composition handling and focus.
 * Plain Enter remains a newline; Cmd/Ctrl+Enter uses its native save handler. */
function NoteEditor({ value, onChange, onSave, onClose, label }) {
  return h('div', {
    className: 'kbn-note-editor',
    onKeyDownCapture: (event) => {
      if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) event.stopPropagation()
    },
  }, h(DshUI.InlineEditor, { value, label, onChange: (value) => onChange(value.slice(0, 4000)), onSave, onCancel: onClose }))
}

function IdeaCard({ note, draft, status }) {
  const store = kanbanStore
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const current = draft ? { ...note, ...draft } : note
  const editButton = useRef(null)
  const save = () => store.flushNote(note.id).then(() => {
    if ((store.getSnapshot().noteEdits[note.id]?.content ?? note.content).trim()) {
      setEditing(false)
      editButton.current?.focus()
    }
  }).catch(() => undefined)
  const statusKey = { pending: 'pending', saving: 'saving', saved: 'saved', error: 'failed', empty: 'required' }[status]
  async function remove() {
    setDeleting(true)
    setError('')
    try { await store.deleteNote(note.id); setConfirm(false) }
    catch (failure) { setError(messageOf(failure)); setDeleting(false) }
  }
  return h('article', { className: 'kbn-note-card', 'data-note-color': current.color, 'data-note-id': note.id, 'data-editing': editing },
    h('div', { className: 'kbn-note-body' }, editing
      ? h(NoteEditor, { value: current.content, label: t('notes.edit'), onChange: (content) => store.editNote(note.id, { content }), onSave: save, onClose: save })
      : h('p', { className: 'kbn-note-content' }, current.content)),
    editing ? h(NoteColors, { value: current.color, onChange: (color) => store.editNote(note.id, { color }) }) : null,
    h('div', { className: 'kbn-note-foot' },
      h('time', { className: 'kbn-note-save', dateTime: note.updatedAt }, new Intl.DateTimeFormat(localeId === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(note.updatedAt))),
      statusKey ? h('span', { className: 'kbn-note-save', role: 'status' }, t('notes.' + statusKey)) : null,
      status === 'error' ? h(DshUI.Button, { size: 'sm', variant: 'ghost', onClick: () => store.flushNote(note.id).catch(() => undefined) }, t('notes.retry')) : null,
      h('div', { className: 'kbn-note-actions' },
        editing ? h(DshUI.Button, { size: 'sm', variant: 'ghost', onClick: save }, t('notes.done'))
          : h(DshUI.Tooltip, { label: t('notes.edit'), side: 'top', portal: true },
            h(DshUI.Button, { ref: editButton, size: 'sm', variant: 'ghost', 'aria-label': t('notes.edit'), onClick: () => setEditing(true) }, h(DshUI.IconEditOutlineRegular, { size: 16 }))),
        h(DshUI.Tooltip, { label: t('notes.delete'), side: 'top', portal: true },
          h(DshUI.Button, { size: 'sm', variant: 'ghost', 'aria-label': t('notes.delete'), onClick: () => setConfirm(true) }, h(DshUI.IconTrashOutlineRegular, { size: 16 }))))),
    h(DshUI.Modal, {
      open: confirm, onClose: () => { if (!deleting) setConfirm(false) }, title: t('notes.delete'), closeLabel: t('common.close'),
      footer: h(Fragment, null,
        h(DshUI.Button, { size: 'sm', variant: 'ghost', disabled: deleting, onClick: () => setConfirm(false) }, t('common.cancel')),
        h(DshUI.Button, { size: 'sm', variant: 'primary', disabled: deleting, onClick: remove }, t('notes.delete'))),
    }, h('p', null, t('notes.deleteHint')), error ? h('p', { role: 'alert' }, error) : null))
}

function IdeasSection({ state }) {
  const store = kanbanStore
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(Boolean(state.noteDraft.content))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const draft = state.noteDraft
  const notes = state.notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((note) => (state.noteEdits[note.id]?.content || note.content).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  async function add() {
    if (pending.current || !draft.content.trim()) return
    pending.current = true
    setBusy(true)
    setError('')
    const input = { ...draft }
    try {
      await store.createNote(input)
      if (store.getSnapshot().noteDraft.content === input.content) {
        store.setNoteDraft({ content: '' })
        setExpanded(false)
      }
    } catch (failure) { setError(messageOf(failure)) }
    finally { pending.current = false; setBusy(false) }
  }
  return h('section', { className: 'kbn-home-section kbn-ideas', 'aria-labelledby': 'kbn-ideas-title' },
    h('div', { className: 'kbn-home-section-head' },
      h('div', null, h('h2', { id: 'kbn-ideas-title' }, t('notes.title')), h('p', null, t('notes.subtitle'))),
      h('div', { className: 'kbn-home-section-tools' },
        h('span', { className: 'kbn-home-count' }, t('notes.count', { count: state.notes.length })),
        h(DshUI.Input, { className: 'kbn-home-search', value: query, onChange: (event) => setQuery(event.currentTarget.value), placeholder: t('notes.search'), 'aria-label': t('notes.search'), icon: h(DshUI.IconSearchOutlineRegular, { size: 16 }) }))),
    h('div', { className: 'kbn-note-composer', 'data-note-color': draft.color, 'aria-busy': busy },
      expanded ? h(NoteEditor, { value: draft.content, label: t('notes.placeholder'), onChange: (content) => store.setNoteDraft({ content }), onSave: add, onClose: () => setExpanded(false) })
        : h(DshUI.Button, { variant: 'ghost', className: 'kbn-note-prompt', onClick: () => setExpanded(true) }, draft.content || t('notes.placeholder')),
      h('div', { className: 'kbn-note-compose-foot' },
        h(NoteColors, { value: draft.color, onChange: (color) => store.setNoteDraft({ color }), disabled: busy }),
        h('div', { className: 'kbn-note-submit' },
          h('span', { className: 'kbn-note-shortcut' }, '⌘ / Ctrl + Enter'),
          h(DshUI.Button, { variant: 'primary', size: 'sm', disabled: busy || !draft.content.trim(), onClick: add, icon: h(DshUI.IconPlusOutlineRegular, { size: 16 }) }, t('notes.add')))),
      draft.content.length >= 4000 ? h('p', { className: 'kbn-note-save' }, t('notes.limit')) : null,
      error ? h('div', { className: 'kbn-home-error', role: 'alert' }, error) : null),
    notes.length ? h('div', { className: 'kbn-notes-grid' }, notes.map((note) => h(IdeaCard, { key: note.id, note, draft: state.noteEdits[note.id], status: state.noteStatus[note.id] })))
      : h('p', { className: 'kbn-home-empty-note' }, t(query ? 'notes.noResults' : 'notes.empty')))
}

function WorkboardHome({ state }) {
  const store = kanbanStore
  const [query, setQuery] = useState('')
  const [newBoard, setNewBoard] = useState(false)
  const boards = boardsOf(state)
  const visible = boards.filter((board) => (board.title + ' ' + board.path).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const stats = useMemo(() => {
    const result = new Map()
    for (const task of state.tasks) {
      if (task.archived) continue
      if (!result.has(task.workspaceId)) result.set(task.workspaceId, { todo: 0, doing: 0, done: 0 })
      result.get(task.workspaceId)[task.status]++
    }
    return result
  }, [state.tasks])
  return h('div', { className: 'kbn-root' },
    h('div', { className: 'kbn-home', 'data-workboard-view': 'home' },
      h('header', { className: 'kbn-home-head' },
        h('div', null, h('h1', null, t('panel.title')), h('p', null, t('home.subtitle'))),
        h('div', { className: 'kbn-home-head-actions' },
          h(DshUI.Tooltip, { label: t('settings.open'), side: 'bottom', portal: true },
            h(DshUI.Button, { variant: 'ghost', size: 'sm', 'aria-label': t('settings.open'), onClick: () => openWorkboardSettings(store.ctx) }, h(DshUI.IconSettingsOutlineMedium, { size: 18 }))),
          h(DshUI.Button, { variant: 'primary', disabled: state.status !== 'ready', icon: h(DshUI.IconPlusOutlineRegular, { size: 16 }), onClick: () => setNewBoard(true) }, t('board.newBoard')))),
      state.status === 'error' ? h('div', { className: 'kbn-home-error', role: 'alert' },
        h(DshUI.IconWarningTriangleOutlineRegular, { size: 18 }), h('span', null, state.error),
        h(DshUI.Button, { variant: 'ghost', size: 'sm', onClick: () => store.refresh() }, t('home.retry'))) : null,
      state.status === 'idle' || (state.status === 'loading' && state.revision === 0)
        ? h('div', { className: 'kbn-home-loading', role: 'status' }, h(DshUI.IconLoadingOutlineRegular, { size: 22 }), t('common.loading'))
        : h(Fragment, null,
          h(CompletionHeatmap, { completions: state.completions }),
          h('div', { className: 'kbn-home-content' },
            h('section', { className: 'kbn-home-section kbn-home-board-section', 'aria-labelledby': 'kbn-boards-title' },
              h('div', { className: 'kbn-home-section-head' },
                h('div', { className: 'kbn-home-section-title' }, h('h2', { id: 'kbn-boards-title' }, t('home.boards')), h('span', { className: 'kbn-home-count' }, t('home.boardCount', { count: boards.length }))),
                h(DshUI.Input, { className: 'kbn-home-search', value: query, onChange: (event) => setQuery(event.currentTarget.value), placeholder: t('home.searchBoards'), 'aria-label': t('home.searchBoards'), icon: h(DshUI.IconSearchOutlineRegular, { size: 16 }) })),
              visible.length ? h('div', { className: 'kbn-home-boards' }, visible.map((board) => {
                const counts = stats.get(board.id) || { todo: 0, doing: 0, done: 0 }
                return h(DshUI.Button, { key: board.id, variant: 'outline', className: 'kbn-home-board', 'data-board-id': board.id, onClick: () => store.openBoard(board.id) },
                  h('span', { className: 'kbn-home-board-title' }, h(DshUI.IconFlatListOutlineRegular, { size: 18 }), h('span', null, board.title), h(DshUI.IconChevronRightOutlineRegular, { size: 16 })),
                  h('span', { className: 'kbn-home-board-path', title: board.path || t('home.unbound') }, board.path || t('home.unbound')),
                  h('span', { className: 'kbn-home-board-counts' }, STATUSES.map((status) => h('span', { key: status }, h('i', { 'data-status': status, 'aria-hidden': true }), t('status.' + status), h('strong', null, counts[status])))))
              })) : h('div', { className: 'kbn-home-empty' }, h('h3', null, t(query ? 'home.noResults' : 'home.empty')), !query ? h('p', null, t('home.emptyHint')) : null)),
            h(IdeasSection, { state })))),
    h(NewBoardDialog, { open: newBoard, onClose: (board) => { setNewBoard(false); if (board) store.openBoard(board.id) } }),
    state.toast ? h(DshUI.Toast, { key: state.toast.id, text: state.toast.message, holdMs: 4000, onDone: () => undefined }) : null)
}

function WorkboardPage() {
  const state = kanbanStore.use()
  useEffect(() => {
    if (state.status === 'ready' && state.boardId && !boardOf(state, state.boardId)) kanbanStore.openHome()
  }, [state.status, state.boardId, state.workspaces, state.boards])
  return state.boardId && boardOf(state, state.boardId)
    ? h(BoardPage, { key: state.boardId, boardId: state.boardId })
    : h(WorkboardHome, { state })
}

addStyle(`
.kbn-panel-glyph{display:inline-flex;align-items:center;justify-content:center}
.kbn-home{flex:1;min-width:0;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent;padding:28px clamp(18px,4%,56px) 48px;container:workboard-home / inline-size}
.kbn-home h1,.kbn-home h2,.kbn-home h3,.kbn-home p{margin:0}
.kbn-home h1{font-size:24px;line-height:32px;font-weight:600}
.kbn-home h2{font-size:17px;line-height:24px;font-weight:600}
.kbn-home-head,.kbn-home-section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.kbn-home-head p,.kbn-home-section-head p{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;margin-top:4px}
.kbn-home-head-actions,.kbn-home-section-tools,.kbn-home-section-title{display:flex;align-items:center;gap:12px;min-width:0}
.kbn-home-section{margin-top:32px}
.kbn-home-content{display:grid;grid-template-columns:minmax(0,1fr);gap:32px;margin-top:32px;align-items:start}
.kbn-home-content>.kbn-home-section{min-width:0;margin-top:0;container-type:inline-size}
.kbn-home-section-head{margin-bottom:16px}
.kbn-home-count{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}
.kbn-home-search{width:200px;max-width:100%}
.kbn-home-boards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:14px}
.kbn-home-board{display:flex!important;flex-direction:column;align-items:stretch!important;justify-content:flex-start!important;gap:10px!important;height:auto!important;min-width:0;white-space:normal!important;text-align:start;padding:18px!important;border-radius:var(--dsw-radius-lg)!important}
.kbn-home-board-title{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:550;min-width:0}
.kbn-home-board-title>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kbn-home-board-title>svg{flex-shrink:0;color:var(--dsw-alias-label-secondary)}
.kbn-home-board-path{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-secondary)}
.kbn-home-board-counts{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.kbn-home-board-counts>span{display:flex;align-items:center;gap:5px}
.kbn-home-board-counts strong{font-weight:500;color:var(--dsw-alias-label-primary)}
.kbn-home-board-counts i{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.kbn-home-board-counts i[data-status=doing]{background:var(--dsw-alias-state-business-primary)}
.kbn-home-board-counts i[data-status=done]{background:var(--dsw-alias-state-success-primary)}
.kbn-home-empty{padding:24px;border:1px dashed var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg)}
.kbn-home-empty h3{font-size:14px;font-weight:500}
.kbn-home-empty p,.kbn-home-empty-note{margin-top:6px!important;color:var(--dsw-alias-label-secondary);font-size:13px}
.kbn-home-empty-note{padding:16px 0}
.kbn-home-error{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;color:var(--dsw-alias-state-error-primary);font-size:13px}
.kbn-home-error>span{flex:1}
.kbn-home-loading{display:flex;align-items:center;justify-content:center;gap:10px;min-height:280px;color:var(--dsw-alias-label-secondary)}
.kbn-heat{padding-bottom:24px;border-bottom:1px solid var(--dsw-alias-border-l4)}
.kbn-heat-chart{--kbn-heat-gap:clamp(1px,.25cqw,4px);width:100%;max-width:var(--kbn-heat-max-width);margin-inline:auto;padding:3px;box-sizing:border-box}
.kbn-heat-months{display:grid;grid-template-columns:repeat(var(--kbn-heat-weeks),minmax(0,1fr));gap:var(--kbn-heat-gap);margin-bottom:8px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
.kbn-heat-months>span{grid-row:1;white-space:nowrap;overflow:hidden}
.kbn-heat-month-compact{display:none}
.kbn-heat-grid{display:grid;grid-template-rows:repeat(7,auto);grid-template-columns:repeat(var(--kbn-heat-weeks),minmax(0,1fr));grid-auto-flow:column;gap:var(--kbn-heat-gap)}
.kbn-heat-cell{min-width:0!important;width:100%;height:auto!important;aspect-ratio:1;min-height:0!important;padding:0!important;border:0!important;border-radius:3px!important}
.kbn-heat-cell[data-today=true]{outline:1px solid var(--dsw-alias-label-tertiary);outline-offset:2px}
.kbn-heat-cell:focus-visible{outline:2px solid var(--dsw-focus-ring-color)!important;outline-offset:2px}
.kbn-heat-cell[data-future=true]{visibility:hidden}
.kbn-heat-cell[data-level="0"],.kbn-heat-sample[data-level="0"]{background:var(--dsw-alias-interactive-bg-hover)!important}
.kbn-heat-cell[data-level="1"],.kbn-heat-sample[data-level="1"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 25%,var(--dsw-alias-bg-base))!important}
.kbn-heat-cell[data-level="2"],.kbn-heat-sample[data-level="2"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,var(--dsw-alias-bg-base))!important}
.kbn-heat-cell[data-level="3"],.kbn-heat-sample[data-level="3"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 70%,var(--dsw-alias-bg-base))!important}
.kbn-heat-cell[data-level="4"],.kbn-heat-sample[data-level="4"]{background:var(--dsw-alias-state-success-primary)!important}
.kbn-heat-foot{display:flex;justify-content:space-between;gap:12px;margin-top:14px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.kbn-heat-explanation{margin-top:4px!important;color:var(--dsw-alias-label-secondary);font-size:11px}
.kbn-heat-legend{display:flex;align-items:center;gap:5px}
.kbn-heat-sample{width:10px;height:10px;border-radius:2px}
.kbn-note-composer,.kbn-note-card{--kbn-note-accent:#dcae38;--kbn-note-bg:color-mix(in srgb,var(--kbn-note-accent) 18%,var(--dsw-alias-bg-base));background:var(--kbn-note-bg);color:var(--dsw-alias-label-primary);border:1px solid color-mix(in srgb,var(--kbn-note-accent) 24%,var(--dsw-alias-border-l4));border-radius:var(--dsw-radius-lg)}
[data-note-color=yellow]{--kbn-note-accent:#dcae38}
[data-note-color=pink]{--kbn-note-accent:#dc82a6}
[data-note-color=blue]{--kbn-note-accent:#71b5e4}
[data-note-color=mint]{--kbn-note-accent:#62b5a6}
[data-note-color=purple]{--kbn-note-accent:#a58ad7}
[data-note-color=neutral]{--kbn-note-accent:#aca69c}
.kbn-note-composer{padding:16px 18px;margin-bottom:18px}
.kbn-note-prompt{display:block!important;width:100%;min-height:68px;height:auto!important;text-align:start;white-space:pre-wrap!important;overflow-wrap:anywhere;justify-content:flex-start!important;align-items:flex-start!important;padding:0!important;color:var(--dsw-alias-label-secondary)!important;background:transparent!important}
.kbn-note-compose-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px}
.kbn-note-colors{display:flex;gap:7px;align-items:center}
.kbn-note-swatch{width:22px!important;min-width:22px!important;height:22px!important;padding:0!important;border:1px solid var(--dsw-alias-border-l3)!important;border-radius:7px!important;background:color-mix(in srgb,var(--kbn-note-accent,#dcae38) 40%,var(--dsw-alias-bg-base))!important;color:var(--dsw-alias-label-primary)!important}
.kbn-note-swatch[aria-pressed=true]{outline:1px solid var(--dsw-alias-label-secondary);outline-offset:2px}
.kbn-note-submit{display:flex;align-items:center;gap:12px;margin-left:auto}
.kbn-note-shortcut{font-size:11px;color:var(--dsw-alias-label-secondary)}
.kbn-notes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:16px;align-items:start}
.kbn-note-card{display:flex;flex-direction:column;gap:12px;min-height:178px;padding:18px 16px 10px;box-shadow:0 3px 10px color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent);animation:kbn-note-arrive .18s ease-out}
.kbn-note-body{flex:1;min-width:0}
.kbn-note-content{font-size:16px;line-height:26px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow-y:auto;scrollbar-width:thin}
.kbn-note-editor textarea{font:inherit;font-size:16px;line-height:26px;width:100%;min-height:68px;max-height:280px;overflow-y:auto!important;color:inherit;box-sizing:border-box}
.kbn-note-foot{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-height:28px}
.kbn-note-save{font-size:11px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.kbn-note-actions{margin-left:auto;display:flex;align-items:center;gap:2px}
.kbn-note-actions button{padding-inline:6px}
@keyframes kbn-note-arrive{from{opacity:.6;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@container workboard-home (min-width:1120px){.kbn-home-content{grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}.kbn-home-content>.kbn-home-section>.kbn-home-section-head{min-height:48px}}
@container workboard-home (max-width:540px){.kbn-heat-month-full{display:none}.kbn-heat-month-compact{display:inline}}
@container (max-width:540px){.kbn-home-head-actions{gap:6px}.kbn-home-search{width:160px}.kbn-home-section-tools{flex-wrap:wrap}.kbn-note-shortcut{display:none}.kbn-home h1{font-size:21px}.kbn-home-section{margin-top:26px}}
@media(prefers-reduced-motion:reduce){.kbn-note-card{animation:none}}
`)


/* ---- 58-attachment-preview.js ---- */
/**
 * Attachment preview surface.
 *
 * The task-detail sheet shows images inline (one large preview plus a thumbnail
 * strip of every attachment). Video, audio, text-like files and everything else
 * open this right-hand preview rail, which mirrors the Harness right sidebar's
 * shape: a full-height column over a mask, its own header, and the preview body.
 */
addDict(
  {
    'preview.title': '附件预览',
    'preview.close': '关闭预览',
    'preview.download': '下载',
    'preview.loading': '正在加载…',
    'preview.loadFailed': '无法加载这个附件',
    'preview.tooLarge': '文件较大，请下载后查看',
    'preview.unsupported': '这个类型暂不支持内嵌预览，可下载后查看',
    'preview.video': '视频',
    'preview.audio': '音频',
    'preview.file': '文件',
    'preview.image': '图片',
  },
  {
    'preview.title': 'Attachment preview',
    'preview.close': 'Close preview',
    'preview.download': 'Download',
    'preview.loading': 'Loading…',
    'preview.loadFailed': 'This attachment could not be loaded',
    'preview.tooLarge': 'This file is large — download it to view the contents',
    'preview.unsupported': 'This file type has no inline preview; download it to view',
    'preview.video': 'Video',
    'preview.audio': 'Audio',
    'preview.file': 'File',
    'preview.image': 'Image',
  },
)

/** Text-like extensions that are worth reading inline. */
const KBN_TEXT_EXTENSIONS = /\.(md|markdown|txt|log|json|jsonc|ya?ml|csv|tsv|xml|html?|css|scss|less|js|jsx|mjs|cjs|ts|tsx|vue|svelte|py|rb|go|rs|java|kt|swift|c|h|cc|cpp|hpp|cs|php|sh|bash|zsh|sql|toml|ini|conf|env)$/i

/** Maximum text body we will fetch for an inline text preview. */
const KBN_TEXT_PREVIEW_LIMIT = 512 * 1024

/**
 * Classify an attachment by MIME type, falling back to its extension.
 * @param {{ name?: string, type?: string }} attachment
 * @returns {'image' | 'video' | 'audio' | 'text' | 'pdf' | 'file'}
 */
function kbnAttachmentKind(attachment) {
  const type = attachment !== null && attachment !== undefined && typeof attachment.type === 'string'
    ? attachment.type.toLowerCase()
    : ''
  const name = attachment !== null && attachment !== undefined && typeof attachment.name === 'string'
    ? attachment.name
    : ''
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf'
  if (type.startsWith('text/') || KBN_TEXT_EXTENSIONS.test(name)) return 'text'
  if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(name)) return 'image'
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(name)) return 'video'
  if (/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(name)) return 'audio'
  return 'file'
}

/**
 * Short uppercase extension for a file name.
 * @param {string} name
 * @returns {string}
 */
function kbnAttachmentExt(name) {
  if (typeof name !== 'string') return ''
  const match = /\.([A-Za-z0-9]{1,6})$/.exec(name.trim())
  return match === null ? '' : match[1].toUpperCase()
}

/** Icon name for one attachment kind. */
function kbnAttachmentIcon(kind) {
  if (kind === 'video') return 'play'
  if (kind === 'audio') return 'stop'
  if (kind === 'text') return 'folderOpen'
  return 'paperclip'
}

/**
 * The right-hand preview rail. Renders nothing without a preview target.
 * @param {{ preview: { task: object, attachment: object } | null, onClose: Function }} props
 * @returns {object | null} React element
 */
function AttachmentPreviewRail({ preview, onClose }) {
  const attachment = preview === null || preview === undefined ? null : preview.attachment
  const attachmentId = attachment === null ? null : attachment.id
  const kind = attachment === null ? 'file' : kbnAttachmentKind(attachment)
  const [text, setText] = useState({ status: 'idle', value: '', error: null })
  const railRef = useRef(null)

  // Focus the rail so Escape and keyboard scrolling work without a click.
  useEffect(() => {
    if (attachment === null) return
    const rail = railRef.current
    const trigger = document.activeElement
    if (rail) rail.focus()
    return () => {
      if (trigger && trigger.isConnected) trigger.focus()
    }
  }, [attachmentId])

  // Escape closes the preview instead of the dialog underneath.
  useEffect(() => {
    if (attachment === null) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Tab') {
        containDialogTab(event, railRef.current)
        event.stopPropagation()
        return
      }
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [attachmentId, onClose])

  useEffect(() => {
    if (attachment === null || kind !== 'text') {
      setText({ status: 'idle', value: '', error: null })
      return undefined
    }
    if (Number(attachment.size) > KBN_TEXT_PREVIEW_LIMIT) {
      setText({ status: 'tooLarge', value: '', error: null })
      return undefined
    }
    const controller = new AbortController()
    setText({ status: 'loading', value: '', error: null })
    fetch(kanbanStore.attachmentUrl(attachment.id), {
      credentials: 'same-origin',
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(String(response.status))
      const value = await response.text()
      setText({ status: 'ready', value, error: null })
    }).catch((error) => {
      if (controller.signal.aborted) return
      setText({ status: 'error', value: '', error: messageOf(error) })
    })
    return () => controller.abort()
  }, [attachmentId, kind])

  useEffect(() => {
    if (attachment === null) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [attachmentId])

  if (attachment === null) return null

  const url = kanbanStore.attachmentUrl(attachment.id)
  const title = attachment.name

  const media = kind === 'image'
    ? h('img', { className: 'kbn-preview-media', src: url, alt: title, loading: 'eager' })
    : kind === 'video'
      ? h('video', { className: 'kbn-preview-media', src: url, controls: true, preload: 'metadata' })
      : kind === 'audio'
        ? h('audio', { className: 'kbn-preview-audio', src: url, controls: true, preload: 'metadata' })
        : kind === 'text'
          ? h('pre', { className: 'kbn-preview-text' },
            text.status === 'loading' ? t('preview.loading')
              : text.status === 'tooLarge' ? t('preview.tooLarge')
                : text.status === 'error' ? t('preview.loadFailed')
                  : text.value)
          : h('div', { className: 'kbn-preview-file' },
            h('span', { className: 'kbn-preview-file-icon', 'aria-hidden': 'true' }, h(Icon, { name: kbnAttachmentIcon(kind), size: 30 })),
            h('p', { className: 'kbn-preview-file-name' }, title),
            h('p', { className: 'kbn-preview-file-meta' }, formatBytes(attachment.size) + (kbnAttachmentExt(title) === '' ? '' : ' · ' + kbnAttachmentExt(title))),
            h('p', { className: 'kbn-preview-file-hint' }, t('preview.unsupported')))

  return h('div', { className: 'kbn-preview', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('preview.title') },
    h('div', { className: 'kbn-preview-mask', onClick: onClose, 'aria-hidden': 'true' }),
    h('aside', { className: 'kbn-preview-rail', ref: railRef, tabIndex: -1 },
      h('header', { className: 'kbn-preview-head' },
        h('span', { className: 'kbn-preview-head-icon', 'aria-hidden': 'true' }, h(Icon, { name: kbnAttachmentIcon(kind), size: 16 })),
        h('div', { className: 'kbn-preview-head-text' },
          h('h2', { className: 'kbn-preview-title', title }, title),
          h('p', { className: 'kbn-preview-sub' }, formatBytes(attachment.size) + ' · ' + kbnPreviewKindLabel(kind))),
        h(IconButton, { icon: h(Icon, { name: 'close' }), label: t('preview.close'), onClick: onClose })),
      h('div', { className: 'kbn-preview-body' }, media),
      h('footer', { className: 'kbn-preview-actions' },
        h('a', {
          className: 'kbn-btn',
          'data-variant': 'primary',
          'data-size': 'sm',
          href: url,
          download: title,
        }, h(Icon, { name: 'archive', size: 12 }), t('preview.download')))))
}

/**
 * Human label for a preview kind.
 * @param {string} kind
 * @returns {string}
 */
function kbnPreviewKindLabel(kind) {
  if (kind === 'video') return t('preview.video')
  if (kind === 'audio') return t('preview.audio')
  if (kind === 'image') return t('preview.image')
  return t('preview.file')
}

addStyle(`
.kbn-attach {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kbn-attach-hero {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  overflow: hidden;
  cursor: zoom-in;
  text-align: left;
  font: inherit;
}
.kbn-attach-hero-img {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  background: var(--dsw-alias-bg-layer-2);
}
.kbn-attach-hero-cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 8px 6px;
  color: var(--dsw-alias-label-primary-foreground);
  background: linear-gradient(to top, rgb(0 0 0 / 62%), transparent);
  font-size: 11px;
  line-height: 16px;
}
.kbn-attach-hero-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kbn-attach-hero-size { flex: none; opacity: .85; }
.kbn-attach-hero:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.kbn-attach-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.kbn-attach-thumb {
  width: 48px;
  height: 48px;
  flex: none;
  padding: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  cursor: pointer;
  color: var(--dsw-alias-label-secondary);
}
.kbn-attach-thumb:hover { border-color: var(--dsw-alias-border-l3); background: var(--dsw-alias-interactive-bg-hover); }
.kbn-attach-thumb[data-active=true] {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-state-business-primary);
}
.kbn-attach-thumb:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.kbn-attach-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.kbn-attach-thumb-file { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.kbn-attach-thumb-ext {
  max-width: 44px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-tertiary);
  font-size: 9px;
  line-height: 11px;
  letter-spacing: .02em;
}

/* Right-hand preview rail: a panel column over a mask, inside the board panel. */
.kbn-preview {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  justify-content: flex-end;
}
.kbn-preview-mask {
  position: absolute;
  inset: 0;
  background: var(--dsw-alias-bg-mask-1);
  backdrop-filter: var(--dsw-mask-blur);
}
.kbn-preview-rail {
  position: relative;
  width: min(560px, 92%);
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border-left: .5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-elevation-panel);
  outline: none;
}
.kbn-preview-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 12px 16px;
  border-bottom: .5px solid var(--dsw-alias-border-l2);
}
.kbn-preview-head-icon { flex: none; display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.kbn-preview-head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.kbn-preview-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 21px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kbn-preview-sub {
  margin: 0;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.kbn-preview-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
}
.kbn-preview-body::-webkit-scrollbar { width: 8px; height: 8px; }
.kbn-preview-body::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.kbn-preview-media {
  max-width: 100%;
  max-height: 100%;
  display: block;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  object-fit: contain;
}
.kbn-preview-audio { width: 100%; }
.kbn-preview-text {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code);
  font-size: 12px;
  line-height: 18px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.kbn-preview-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  padding: 28px 20px;
  width: 100%;
  max-width: 360px;
  box-sizing: border-box;
  border: .5px dashed var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
}
.kbn-preview-file-icon { color: var(--dsw-alias-label-caption); display: inline-flex; }
.kbn-preview-file-name {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
}
.kbn-preview-file-meta {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}
.kbn-preview-file-hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.kbn-preview-actions {
  flex: none;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.kbn-preview-actions .kbn-btn { text-decoration: none; }
@media (prefers-reduced-motion: reduce) {
  .kbn-attach-thumb { transition: none; }
}
`);


/* ---- 59-data-transfer.js ---- */
/**
 * Board import / export.
 *
 * Export produces one JSON document with every task (fields, tags, assignee and
 * attachment metadata). Attachment bytes and session links stay on this machine,
 * so they are not part of the document. Import creates new tasks in the project
 * currently selected on the board; ids, archived state and sessions are not
 * carried over, which keeps an import additive and safe to repeat.
 */
addDict(
  {
    'data.trigger': '数据导入导出',
    'data.export': '导出数据',
    'data.import': '导入数据',
    'data.exported': '已导出 {count} 个任务',
    'data.exportFailed': '导出失败：{message}',
    'data.importTitle': '导入数据',
    'data.importFile': '文件',
    'data.importTarget': '导入到',
    'data.importCount': '{count} 个任务可导入',
    'data.importInvalid': '{count} 条记录无法识别，将跳过',
    'data.importEmpty': '文件里没有可导入的任务',
    'data.importNoWorkspace': '请先选择一个项目，再导入数据',
    'data.importing': '正在导入… {done}/{total}',
    'data.importDone': '已导入 {created} 个任务',
    'data.importPartial': '已导入 {created} 个任务，{failed} 个失败',
    'data.importFailed': '导入失败：{message}',
    'data.importConfirm': '开始导入',
    'data.importCancel': '取消',
    'data.readFailed': '无法读取这个文件',
    'data.parseFailed': '不是有效的任务看板导出文件',
    'data.attachmentNote': '附件文件不会被导入；任务字段、标签与指派会保留。',
  },
  {
    'data.trigger': 'Import or export data',
    'data.export': 'Export data',
    'data.import': 'Import data',
    'data.exported': 'Exported {count} tasks',
    'data.exportFailed': 'Export failed: {message}',
    'data.importTitle': 'Import data',
    'data.importFile': 'File',
    'data.importTarget': 'Import into',
    'data.importCount': '{count} tasks can be imported',
    'data.importInvalid': '{count} records are unrecognized and will be skipped',
    'data.importEmpty': 'This file has no importable tasks',
    'data.importNoWorkspace': 'Select a project before importing data',
    'data.importing': 'Importing… {done}/{total}',
    'data.importDone': 'Imported {created} tasks',
    'data.importPartial': 'Imported {created} tasks, {failed} failed',
    'data.importFailed': 'Import failed: {message}',
    'data.importConfirm': 'Start import',
    'data.importCancel': 'Cancel',
    'data.readFailed': 'This file could not be read',
    'data.parseFailed': 'This is not a valid task-board export',
    'data.attachmentNote': 'Attachment files are not imported; task fields, tags and assignee are kept.',
  },
)

/** Marker written into every export document. */
const KBN_DATA_FORMAT = 'dsh-workboard'
/** Current export schema version. */
const KBN_DATA_VERSION = 1
/** Upper bound for one import, so a huge file cannot flood the board. */
const KBN_IMPORT_LIMIT = 1000
/** Calendar-day pattern accepted on import. */
const KBN_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** @param {unknown} value */
function kbnIsObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Build the export document from the live snapshot.
 * @param {object} snapshot - client store snapshot
 * @returns {object}
 */
function kbnExportPayload(snapshot) {
  const tasks = snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.tasks) ? snapshot.tasks : []
  const workspaces = snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.workspaces)
    ? snapshot.workspaces
    : []
  return {
    format: KBN_DATA_FORMAT,
    version: KBN_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      title: workspace.title,
      path: workspace.path,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      workspaceId: task.workspaceId,
      title: task.title,
      description: task.description,
      status: task.status,
      startDate: task.startDate,
      dueDate: task.dueDate,
      priority: task.priority,
      tags: Array.isArray(task.tags) ? task.tags.slice() : [],
      attachments: Array.isArray(task.attachments)
        ? task.attachments.map((attachment) => ({
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
        }))
        : [],
      assignee: kbnIsObject(task.assignee)
        ? { kind: task.assignee.kind, name: task.assignee.name }
        : { kind: 'human', name: '' },
      archived: task.archived === true,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })),
  }
}

/**
 * File name for one export.
 * @param {Date} [date]
 * @returns {string}
 */
function kbnExportFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return 'dsh-workboard-' + date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
    + '-' + pad(date.getHours()) + pad(date.getMinutes()) + '.json'
}

/**
 * Validate one imported record into a create input.
 * @param {unknown} raw
 * @returns {object}
 */
function kbnNormalizeImportTask(raw) {
  if (!kbnIsObject(raw)) throw new Error('not an object')
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (title === '' || title.length > 200) throw new Error('invalid title')
  const status = STATUSES.includes(raw.status) ? raw.status : 'todo'
  const priority = PRIORITIES.includes(raw.priority) ? raw.priority : 'medium'
  const day = (value) => (typeof value === 'string' && KBN_DAY_PATTERN.test(value) ? value : null)
  const tags = []
  if (Array.isArray(raw.tags)) {
    for (const entry of raw.tags) {
      if (typeof entry !== 'string') continue
      const tag = entry.trim()
      if (tag !== '' && !tags.includes(tag) && tags.length < 12) tags.push(tag)
    }
  }
  const assigneeRaw = kbnIsObject(raw.assignee) ? raw.assignee : {}
  const kind = assigneeRaw.kind === 'ai' || assigneeRaw.kind === 'human' ? assigneeRaw.kind : 'human'
  const name = typeof assigneeRaw.name === 'string' ? assigneeRaw.name.trim() : ''
  return {
    title,
    description: typeof raw.description === 'string' ? raw.description.slice(0, 20000) : '',
    status,
    startDate: day(raw.startDate),
    dueDate: day(raw.dueDate),
    priority,
    tags,
    assignee: { kind, name },
  }
}

/**
 * Parse one export document (or a bare task array).
 * @param {string} text
 * @returns {{ ok: boolean, reason?: string, tasks: object[], invalid: number }}
 */
function kbnParseImport(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'parse', tasks: [], invalid: 0 }
  }
  let source
  if (Array.isArray(parsed)) {
    source = parsed
  } else if (kbnIsObject(parsed) && Array.isArray(parsed.tasks)) {
    if (typeof parsed.version === 'number' && parsed.version > KBN_DATA_VERSION) {
      return { ok: false, reason: 'version', tasks: [], invalid: 0 }
    }
    source = parsed.tasks
  } else {
    return { ok: false, reason: 'format', tasks: [], invalid: 0 }
  }
  const tasks = []
  let invalid = 0
  for (const raw of source) {
    try {
      tasks.push(kbnNormalizeImportTask(raw))
    } catch {
      invalid += 1
    }
  }
  const overflow = Math.max(0, tasks.length - KBN_IMPORT_LIMIT)
  return { ok: true, tasks: tasks.slice(0, KBN_IMPORT_LIMIT), invalid: invalid + overflow }
}

/**
 * Create every imported task in one workspace, sequentially so the column order
 * follows the file.
 * @param {object} store - client store
 * @param {string} workspaceId
 * @param {object[]} tasks - normalized create inputs
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<{ created: number, failed: number }>}
 */
async function kbnImportTasks(store, workspaceId, tasks, onProgress) {
  let created = 0
  let failed = 0
  for (let index = 0; index < tasks.length; index += 1) {
    try {
      await store.createTask(workspaceId, tasks[index])
      created += 1
    } catch {
      failed += 1
    }
    if (typeof onProgress === 'function') onProgress(index + 1, tasks.length)
  }
  return { created, failed }
}

/**
 * Confirmation sheet shown between picking a file and importing it.
 * @param {{ state: object | null, onCancel: Function, onConfirm: Function }} props
 * @returns {object} React element
 */
function KbnImportReview({ state, onCancel, onConfirm }) {
  if (!state) return null
  const busy = state.busy
  return h('div', { className: 'kbn-import', role: 'group', 'aria-label': t('data.importTitle') },
    h('div', { className: 'kbn-import-row' },
      h('span', { className: 'kbn-import-label' }, t('data.importFile')),
      h('span', { className: 'kbn-import-value', title: state.fileName }, state.fileName)),
    h('div', { className: 'kbn-import-row' },
      h('span', { className: 'kbn-import-label' }, t('data.importTarget')),
      h('span', { className: 'kbn-import-value' }, state.workspaceTitle)),
    h('p', { className: 'kbn-import-count' }, t('data.importCount', { count: state.tasks.length })),
    state.invalid > 0
      ? h('p', { className: 'kbn-import-note' }, t('data.importInvalid', { count: state.invalid }))
      : null,
    h('p', { className: 'kbn-import-note' }, t('data.attachmentNote')),
    busy && state.progress !== null && state.progress !== undefined
      ? h('p', { className: 'kbn-import-progress', role: 'status' },
        t('data.importing', { done: state.progress.done, total: state.progress.total }))
      : null,
    state.error !== null && state.error !== undefined
      ? h('p', { className: 'kbn-import-error', role: 'alert' }, state.error)
      : null,
    h('div', { className: 'kbn-settings-actions' },
      h(DshUI.Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: onCancel }, t('data.importCancel')),
      h(DshUI.Button, { variant: 'primary', size: 'sm', disabled: busy, onClick: onConfirm }, t('data.importConfirm'))))
}

addStyle(`
.kbn-import { display: flex; flex-direction: column; gap: 8px; }
.kbn-import-row { display: flex; gap: 8px; font-size: 13px; line-height: 20px; min-width: 0; }
.kbn-import-label { flex: none; color: var(--dsw-alias-label-tertiary); }
.kbn-import-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); }
.kbn-import-count { margin: 4px 0 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.kbn-import-note { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.kbn-import-progress { margin: 2px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.kbn-import-error { margin: 2px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
`)


/* ---- 60-session-bridge.js ---- */
/**
 * Task ↔ Session bridge.
 *
 * An AI task can be executed by a harness session: the board asks for a session
 * in the task's workspace, links it to the card, sends the task brief as the
 * first prompt, and from then on the card and the session header link to each
 * other.
 *
 * `ctx` comes from the store (`kanbanStore.ctx`) because this part is loaded
 * before the entry runs; all exported functions are hoisted declarations so
 * board parts can call them from event handlers.
 */
addDict(
  {
    'bridge.prompt.title': '你要执行任务看板中的一个任务。',
    'bridge.prompt.workspace': '工作区：{title}（{path}）',
    'bridge.prompt.task': '任务：{title}',
    'bridge.prompt.status': '当前状态：{status}',
    'bridge.prompt.priority': '紧急程度：{priority}',
    'bridge.prompt.start': '开始日期：{date}',
    'bridge.prompt.due': '截止日期：{date}',
    'bridge.prompt.tags': '标签：{tags}',
    'bridge.prompt.description': '任务描述：',
    'bridge.prompt.request': '请直接开始执行这个任务，完成后给出结果摘要；必要时先列出计划再动手。',
    'bridge.prompt.discuss': '先讨论这个任务：提出需要澄清的问题或建议方案，等待我确认后再执行。讨论阶段不要修改文件或运行命令。',
    'send.title': '发送任务',
    'send.destination': '发送到',
    'send.new': '新建会话',
    'send.current': '当前会话',
    'send.linked': '关联会话',
    'send.mode': '发送方式',
    'send.execute': '直接执行',
    'send.discuss': '先讨论',
    'send.submit': '发送',
    'send.unavailable': '会话已变更或不可用，请重新选择。',
    'send.relink': '发送后，任务将关联到所选会话。',
    'bridge.sessionTitle': '[任务] {title}',
    'bridge.link.label': '关联任务',
    'bridge.link.reveal': '在工作看板中查看「{title}」',
    'bridge.error.noWorkspace': '找不到任务所在的工作区',
    'bridge.error.create': '创建会话失败：{message}',
    'bridge.error.link': '未能关联会话，任务尚未发送。{message}',
    'bridge.error.attachment': '附件「{name}」准备失败，任务尚未发送。{message}',
    'bridge.error.prompt': '未能确认任务已发送，请打开关联会话查看。{message}',
    'bridge.error.move': '任务已发送，请手动更新卡片状态。{message}',
    'bridge.bind.hint': '这个看板还没有工作目录，请选择一个目录再创建会话。',
    'bridge.bind.cancelled': '已取消选择工作目录',
    'bridge.bind.done': '已为看板「{title}」绑定工作目录',
    'bridge.bind.failed': '绑定工作目录失败：{message}',
  },
  {
    'bridge.prompt.title': 'You are executing a task from the task board.',
    'bridge.prompt.workspace': 'Workspace: {title} ({path})',
    'bridge.prompt.task': 'Task: {title}',
    'bridge.prompt.status': 'Status: {status}',
    'bridge.prompt.priority': 'Priority: {priority}',
    'bridge.prompt.start': 'Start date: {date}',
    'bridge.prompt.due': 'Due date: {date}',
    'bridge.prompt.tags': 'Tags: {tags}',
    'bridge.prompt.description': 'Task description:',
    'bridge.prompt.request': 'Start working on this task now and finish with a result summary; lay out a short plan first when useful.',
    'bridge.prompt.discuss': 'Discuss the task first: ask clarifying questions or propose an approach, then wait for my confirmation. Do not change files or run commands during discussion.',
    'send.title': 'Send task',
    'send.destination': 'Destination',
    'send.new': 'New session',
    'send.current': 'Current session',
    'send.linked': 'Linked session',
    'send.mode': 'Send mode',
    'send.execute': 'Execute now',
    'send.discuss': 'Discuss first',
    'send.submit': 'Send',
    'send.unavailable': 'The session changed or is unavailable. Choose a destination again.',
    'send.relink': 'Sending will link the task to the selected session.',
    'bridge.sessionTitle': '[Task] {title}',
    'bridge.link.label': 'Linked tasks',
    'bridge.link.reveal': 'Show “{title}” on the Workboard',
    'bridge.error.noWorkspace': 'The task workspace could not be found',
    'bridge.error.create': 'Could not create a session: {message}',
    'bridge.error.link': 'Could not link the session. The brief was not sent. {message}',
    'bridge.error.attachment': 'Could not prepare “{name}”. The task was not sent. {message}',
    'bridge.error.prompt': 'Could not confirm delivery. Open the linked session to check. {message}',
    'bridge.error.move': 'The brief was sent. Update the card status manually. {message}',
    'bridge.bind.hint': 'This board has no working directory yet — pick one to create its first session.',
    'bridge.bind.cancelled': 'Working-directory selection cancelled',
    'bridge.bind.done': 'Board "{title}" is now bound to its working directory',
    'bridge.bind.failed': 'Could not bind the working directory: {message}',
  },
)

/**
 * Resolve a task and its workspace from the current store snapshot.
 * @param {string} taskId
 * @returns {{ task: object, workspace: object } | null}
 */
function bridgeLookup(taskId) {
  if (kanbanStore === null) return null
  const snapshot = kanbanStore.getSnapshot()
  const task = taskById(snapshot, taskId)
  if (task === null) return null
  const workspace = workspaceOf(snapshot, task.workspaceId)
  return { task, workspace }
}

/**
 * Build the first prompt for a task's execution session.
 * @param {object} task
 * @param {object | null} workspace
 * @returns {string}
 */
function buildTaskBrief(task, workspace, mode) {
  const lines = []
  if (mode !== 'discuss') lines.push(t('bridge.prompt.title'))
  if (lines.length) lines.push('')
  lines.push(t('bridge.prompt.task', { title: taskContentText(task) }))
  if (workspace !== null) {
    lines.push(t('bridge.prompt.workspace', { title: workspace.title, path: workspace.path }))
  }
  lines.push(t('bridge.prompt.status', { status: t('status.' + task.status) }))
  lines.push(t('bridge.prompt.priority', { priority: t('priority.' + task.priority) }))
  if (task.startDate !== null) lines.push(t('bridge.prompt.start', { date: task.startDate }))
  if (task.dueDate !== null) lines.push(t('bridge.prompt.due', { date: task.dueDate }))
  if (Array.isArray(task.tags) && task.tags.length > 0) {
    lines.push(t('bridge.prompt.tags', { tags: task.tags.join('、') }))
  }
  lines.push('')
  lines.push(t(mode === 'discuss' ? 'bridge.prompt.discuss' : 'bridge.prompt.request'))
  return lines.join('\n')
}

/** Convert a board file into the same image block or session-scoped file receipt the DSH composer sends. */
async function prepareSessionAttachment(ctx, sessionId, attachment) {
  try {
    const response = await fetch(kanbanStore.attachmentUrl(attachment.id), { credentials: 'same-origin' })
    if (!response.ok) throw new Error(t('api.httpError', { status: response.status }))
    const blob = await response.blob()
    const mediaType = blob.type || attachment.type
    if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mediaType)) {
      return { type: 'image', mediaType, name: attachment.name, data: await kanbanReadFileBase64(blob) }
    }
    const upload = await ctx.fileUpload.upload(sessionId, blob, attachment.name)
    if (!upload.ok) throw new Error(upload.error.message)
    return { type: 'file', receiptId: upload.value.receiptId }
  } catch (error) {
    throw new Error(t('bridge.error.attachment', { name: attachment.name, message: messageOf(error) }))
  }
}

/**
 * Queue the brief and attachments in the selected session, naming a newly created one.
 * @param {object} ctx - client context from the store
 * @param {string} sessionId
 * @param {object[]} content - ordered native prompt blocks
 * @param {string} title - session title to write when the host accepts it
 * @returns {Promise<void>}
 */
async function promptSession(ctx, sessionId, content, title) {
  const reference = ctx.sessions.retain(sessionId, { source: 'gateway' })
  try {
    await reference.ready
    const session = reference.binding.session
    if (title) await session.rename(t('bridge.sessionTitle', { title }))
    const result = await session.prompt(content, 'queue')
    if (result !== undefined && result !== null && result.ok === false) {
      const message = result.error && result.error.message ? result.error.message : String(result.error)
      throw new Error(message)
    }
  } finally {
    reference.release()
  }
}

/**
 * Resolve the Harness workspace a task's board runs in. A standalone board has
 * no directory yet: the first AI session asks for one, creates the workspace and
 * migrates the board's tasks onto it.
 * @param {object} task
 * @returns {Promise<string | null>} the workspace id, or null when cancelled
 */
async function ensureBoardWorkspace(task) {
  if (kanbanStore === null) return null
  const board = boardOf(kanbanStore.getSnapshot(), task.workspaceId)
  if (board === null || board.bound) return task.workspaceId
  const ctx = kanbanStore.ctx
  kanbanStore.toast(t('bridge.bind.hint'), 'info')
  let directory = null
  try {
    directory = await ctx.uiWorkspace.pickDirectory()
  } catch (error) {
    throw new Error(t('bridge.bind.failed', { message: messageOf(error) }))
  }
  if (directory === null || directory === undefined || directory === '') {
    kanbanStore.toast(t('bridge.bind.cancelled'), 'info')
    return null
  }
  let created
  try {
    created = await ctx.workspaces.create({ path: directory })
  } catch (error) {
    throw new Error(t('bridge.bind.failed', { message: messageOf(error) }))
  }
  const workspaceId = created !== null && created !== undefined ? created.workspaceId : undefined
  if (typeof workspaceId !== 'string' || workspaceId === '') {
    throw new Error(t('bridge.bind.failed', { message: 'no workspace id' }))
  }
  await kanbanStore.bindBoard(board.id, workspaceId)
  try {
    await ctx.workspaces.rename(workspaceId, board.title)
  } catch {
    // The workspace keeps its directory-derived title; binding still succeeded.
  }
  kanbanStore.toast(t('bridge.bind.done', { title: board.title }), 'info')
  return workspaceId
}

// The main-view reference survives opening the board. Workspace membership
// and archive state come from the same public catalogs used by the DSH sidebar.
function dispatchDestinations(task) {
  const ctx = kanbanStore.ctx
  const sessions = ctx.sessions.list.getSnapshot()
  const workspaces = ctx.workspaces.list.getSnapshot()
  const members = workspaces.items.find((workspace) => workspace.workspaceId === task.workspaceId)?.sessionIds || []
  const tasks = kanbanStore.getSnapshot().tasks
  const destinations = []
  for (const id of members) {
    const session = sessions.byId[id]
    if (!session || workspaces.archivedSessionIds.includes(id)) continue
    if (tasks.some((other) => other.workspaceId !== task.workspaceId && other.sessionId === id)) continue
    const linked = id === task.sessionId
    if (!linked && !session.retainedBy?.mainView) continue
    destinations.push({
      value: id, label: t(linked ? 'send.linked' : 'send.current'),
      title: session.displayTitle || id,
    })
  }
  destinations.push({ value: 'new', label: t('send.new') })
  return destinations
}

async function dispatchTask(task, destination, mode) {
  const ctx = kanbanStore.ctx
  const found = bridgeLookup(task.id)
  if (!found || found.task.archived || found.task.status === 'done' ||
      found.task.sessionId !== task.sessionId) throw new Error(t('send.unavailable'))
  if (destination !== 'new' && !dispatchDestinations(found.task).some((item) => item.value === destination)) {
    throw new Error(t('send.unavailable'))
  }
  const workspaceId = await ensureBoardWorkspace(found.task)
  if (workspaceId === null) return null
  const refreshed = bridgeLookup(task.id)
  if (!refreshed) throw new Error(t('send.unavailable'))
  let sessionId = destination
  if (destination === 'new') {
    try {
      sessionId = await ctx.sessions.create({ workspaceId })
      if (!sessionId) throw new Error(t('api.badResponse'))
    } catch (error) {
      throw new Error(t('bridge.error.create', { message: messageOf(error) }))
    }
  }
  let linkedTask
  try {
    linkedTask = await kanbanStore.linkSession(task.id, sessionId, task.sessionId)
  } catch (error) {
    throw new Error(t('bridge.error.link', { message: messageOf(error) }))
  }
  const content = []
  for (const attachment of linkedTask.attachments || []) {
    content.push(await prepareSessionAttachment(ctx, sessionId, attachment))
  }
  content.push({ type: 'text', text: buildTaskBrief(linkedTask, refreshed.workspace, mode) })
  try {
    await promptSession(ctx, sessionId, content, destination === 'new' ? linkedTask.title : null)
  } catch (error) {
    throw new Error(t('bridge.error.prompt', { message: messageOf(error) }))
  }
  const current = taskById(kanbanStore.getSnapshot(), task.id)
  if (mode === 'execute' && current?.status === 'todo') {
    try {
      await kanbanStore.moveTask(task.id, 'doing')
    } catch (error) {
      kanbanStore.toast(t('bridge.error.move', { message: messageOf(error) }), 'error')
      return sessionId
    }
  }
  ctx.uiWorkspace.openSession(sessionId)
  return sessionId
}

function TaskSendDialog({ task, onClose }) {
  const destinations = dispatchDestinations(task)
  const initial = destinations.some((item) => item.value === task.sessionId) ? task.sessionId : 'new'
  const [destination, setDestination] = useState(initial)
  const [mode, setMode] = useState('execute')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const selected = destinations.find((item) => item.value === destination)
  async function send() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await dispatchTask(task, destination, mode)
      onClose()
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return h(DshUI.Modal, {
    open: true, title: t('send.title'), closeLabel: t('common.close'),
    onClose: () => { if (!pending.current) onClose() },
    footer: h('div', { className: 'kbn-send-footer' },
      h(DshUI.Button, { variant: 'ghost', disabled: busy, onClick: onClose }, t('common.cancel')),
      h(DshUI.Button, { variant: 'primary', disabled: busy || !selected, onClick: send }, t('send.submit'))),
  }, h('div', { className: 'kbn-send-form' },
    h('strong', null, task.title),
    h('span', null, t('send.destination')),
    h(DshUI.SegmentedControl, {
      id: 'kbn-destination', label: t('send.destination'), value: destination,
      options: destinations, onChange: setDestination, disabled: busy,
    }),
    selected?.title && h('div', { className: 'kbn-send-note' }, selected.title),
    task.sessionId && destination !== task.sessionId && h('div', { className: 'kbn-send-note' }, t('send.relink')),
    h('span', null, t('send.mode')),
    h(DshUI.SegmentedControl, {
      id: 'kbn-mode', label: t('send.mode'), value: mode, onChange: setMode, disabled: busy,
      options: ['execute', 'discuss'].map((value) => ({ value, label: t('send.' + value) })),
    }),
    error && h('p', { role: 'alert', className: 'kbn-editor-error' }, error)))
}

addStyle(`
.kbn-send-form { display: grid; gap: 10px; overflow-wrap: anywhere; }
.kbn-send-form > strong { margin-bottom: 6px; }
.kbn-send-note { color: var(--dsw-alias-label-secondary); }
.kbn-send-footer { display: flex; justify-content: flex-end; gap: 8px; }
`)

async function openTaskSession(task) {
  if (!task.sessionId) return
  try {
    await kanbanStore.ctx.uiWorkspace.openSession(task.sessionId)
  } catch (error) {
    kanbanStore.toast(t('toast.failed', { message: messageOf(error) }), 'error')
  }
}

function TaskLinkAction({ sessionId }) {
  const linked = tasksForSession(kanbanStore.use(), sessionId)
  if (!linked.length) return null
  return h(SessionTaskMenu, { key: sessionId, sessionId, tasks: linked })
}

function SessionTaskMenu({ sessionId, tasks }) {
  const [content, setContent] = useState(null)
  const [editor, setEditor] = useState(null)
  const trigger = useRef(null)
  const panel = useRef(null)
  const id = 'kbn-linked-' + sessionId
  const open = content !== null
  const dismiss = useCallback(() => setContent(null), [])
  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true })
  }, [open])
  useEffect(() => {
    if (!open || editor) return
    function onPointerDown(event) {
      // DSH portals the card's status menu to the document body.
      if (event.composedPath().some((node) => node === panel.current || node === trigger.current ||
        node.classList?.contains('kbn-session-status-menu'))) return
      dismiss()
    }
    function onEscape(event) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.stopPropagation()
      dismiss()
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open, editor, dismiss])

  function toggle(event) {
    const root = event.currentTarget.closest('[data-phase]')
    const body = root?.querySelector('[data-conversation-content]')
    setContent((current) => !current && body?.dataset.conversationSession === sessionId ? body : null)
  }
  const label = t('bridge.link.label')
  function reveal(task) {
    dismiss()
    kanbanStore.setFocusTask(task.id)
    kanbanStore.ctx.layout.selectPanel(PANEL_ID)
  }
  return h(Fragment, null,
    h(DshUI.Button, {
      ref: trigger, className: 'kbn-session-trigger', variant: 'ghost', size: 'sm', title: label,
      'aria-label': label, 'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-controls': open ? id : undefined,
      onClick: toggle,
    }, h(DshUI.IconFlatListOutlineRegular, { size: 16 })),
    open && createPortal(h(DshUI.MenuSurface, {
      id, ref: panel, role: 'dialog', tabIndex: -1, 'aria-label': label, className: 'kbn-session-tasks',
    }, h('div', { className: 'kbn-session-tasks-head' },
      h('strong', null, label),
      h(DshUI.Button, {
        variant: 'ghost', size: 'sm', title: t('editor.newTitle'), 'aria-label': t('editor.newTitle'),
        onClick: () => setEditor({ mode: 'create' }),
      }, h(DshUI.IconPlusOutlineRegular, { size: 16 }))),
    h('ul', { className: 'kbn-session-task-list' }, tasks.map((task) =>
      h(SessionTaskRow, { key: task.id, task, onReveal: reveal, onEdit: () => setEditor({ mode: 'edit', task }) })))), content),
    editor && createPortal(h(TaskEditorDialog, {
      open: true, mode: editor.mode, task: editor.task, workspaceId: tasks[0].workspaceId,
      sessionId, columnStatus: 'todo', onClose: () => setEditor(null),
    }), document.body))
}

function SessionTaskRow({ task, onEdit, onReveal }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function changeStatus(status) {
    if (busy || status === task.status) return
    setBusy(true)
    setError(null)
    try {
      await kanbanStore.moveTask(task.id, status)
    } catch (err) {
      setError(t('toast.failed', { message: messageOf(err) }))
    } finally {
      setBusy(false)
    }
  }
  const revealLabel = t('bridge.link.reveal', { title: task.title })
  return h('li', { className: 'kbn-session-task-row', 'aria-label': task.title },
    h('div', { className: 'kbn-session-task-line' },
      h('span', { className: 'kbn-session-task-title', title: task.title }, task.title),
      h(TaskStatusMenu, {
        status: task.status, busy, onChange: changeStatus, listClassName: 'kbn-session-status-menu',
      }),
      h('div', { className: 'kbn-session-task-actions' },
        h(DshUI.Button, {
          variant: 'ghost', size: 'sm', title: revealLabel, 'aria-label': revealLabel, onClick: () => onReveal(task),
        }, h(DshUI.IconRightUpOutlineRegular, { size: 15 })),
        h(DshUI.Button, {
          variant: 'ghost', size: 'sm', title: t('editor.editTitle'), 'aria-label': t('editor.editTitle'), onClick: onEdit,
        }, h(DshUI.IconEditOutlineRegular, { size: 14 })))),
    error && h('span', { role: 'alert', className: 'kbn-editor-error' }, error))
}

addStyle(`
.kbn-session-trigger[aria-expanded=true] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.kbn-session-tasks { position: absolute; z-index: 10; inset-block-start: 12px; inset-inline-end: 16px;
  display: flex; flex-direction: column; width: min(400px, calc(100% - 32px)); max-height: calc(100% - 24px);
  box-sizing: border-box; padding: 8px; outline: none; color: var(--dsw-alias-label-primary);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1); box-shadow: var(--dsw-elevation-prominent); }
.kbn-session-tasks-head { display: flex; align-items: center; justify-content: space-between; padding-inline-start: 8px;
  font-size: 13px; color: var(--dsw-alias-label-secondary); }
.kbn-session-task-list { display: flex; flex-direction: column; gap: 6px; list-style: none; margin: 4px 0 0; padding: 0;
  min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.kbn-session-task-row { padding: 7px 8px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }
.kbn-session-task-title { min-width: 0; max-width: 14em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kbn-session-task-line { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; }
.kbn-session-task-actions { display: flex; flex: none; align-items: center; gap: 2px; margin-inline-start: auto; }
.kbn-session-task-actions button { width: 26px; height: 26px; padding: 0; color: var(--dsw-alias-label-secondary); }
.kbn-session-task-line .kbn-detail-status-picker { flex: none; }
.kbn-session-task-row [role=alert] { width: 100%; overflow-wrap: anywhere; }
`)


/* ---- 65-settings.js ---- */
/** Workboard contributes one section to the DSH settings shell. */
addDict({
  'settings.open': '工作看板设置',
  'settings.target': '看板列表',
  'settings.editName': '编辑名称',
  'settings.renameUnavailable': '看板改名接口暂不可用，请重启 DSH 后重试。',
  'settings.boardMissing': '该看板已不存在，请重新打开设置。',
  'settings.saved': '看板名称已保存',
  'settings.exportAll': '导出所有看板的任务。导入的任务会添加到上方选中的看板。',
  'settings.unavailable': 'DSH 设置暂时不可用，请重新打开看板后重试。',
}, {
  'settings.open': 'Workboard settings',
  'settings.target': 'Boards',
  'settings.editName': 'Edit name',
  'settings.renameUnavailable': 'The board rename endpoint is unavailable. Restart DSH and try again.',
  'settings.boardMissing': 'This board no longer exists. Reopen settings.',
  'settings.saved': 'Board name saved',
  'settings.exportAll': 'Export tasks from all boards. Imported tasks are added to the board selected above.',
  'settings.unavailable': 'DSH settings are unavailable. Reopen the board and try again.',
})

function openWorkboardSettings(ctx) {
  // DSH registers the same root settings store instance for its sidebar and shortcut.
  const handle = ctx.slots.entriesOfSlot('sidebar.settings')[0]?.store
  const shell = handle && ctx.slots.resolveStore(handle)
  if (shell?.actions?.openSection) shell.actions.openSection(PLUGIN_ID)
  else kanbanStore.toast(t('settings.unavailable'), 'error')
}

function SettingsBoardRow({ board, selected, onSelect, disabled }) {
  const [name, setName] = useState(board.title)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const rowRef = useRef(null)
  const saving = useRef(false)
  const title = name.trim()

  function finishEditing() {
    setEditing(false)
    setError('')
    setTimeout(() => rowRef.current?.querySelector('.kbn-board-name-action')?.focus(), 0)
  }

  async function save(event) {
    event.preventDefault()
    if (saving.current || disabled) return
    if (!editing) {
      setName(board.title)
      setError('')
      setEditing(true)
      return
    }
    if (!title) return
    if (title === board.title) {
      finishEditing()
      return
    }
    saving.current = true
    setBusy(true)
    setError('')
    try {
      await kanbanStore.renameBoard(board.id, title)
      finishEditing()
      kanbanStore.toast(t('settings.saved'), 'info')
    } catch (failure) {
      if (failure.code === 'kanban/board-not-found') setError(t('settings.boardMissing'))
      else if (failure.status === 404) setError(t('settings.renameUnavailable'))
      else setError(messageOf(failure))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  function handleKeyDown(event) {
    if (!editing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (!saving.current) finishEditing()
    }
    if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
  }

  return h('li', { ref: rowRef, className: 'kbn-settings-board', 'data-selected': selected, 'data-editing': editing, onKeyDown: handleKeyDown },
    h('input', {
      type: 'radio', name: 'kbn-settings-board', checked: selected,
      'aria-label': board.title, onChange: onSelect, disabled: disabled || busy,
    }),
    h('form', { className: 'kbn-board-name-form', onSubmit: save, 'aria-busy': busy },
      editing ? h(Input, {
        value: name, onChange: (value) => { setName(value); setError('') },
        ariaLabel: t('board.nameLabel'), maxLength: 80, disabled: busy, autoFocus: true,
      }) : h('button', { type: 'button', className: 'kbn-board-name', onClick: onSelect, disabled, title: board.title }, board.title),
      h(DshUI.Button, {
        className: 'kbn-board-name-action kbn-board-icon-button', type: 'submit', variant: 'ghost', size: 'sm',
        disabled: busy || disabled || (editing && !title), loading: busy,
        'aria-label': (editing ? t('common.save') : t('settings.editName')) + ' · ' + board.title,
        title: editing ? t('common.save') : t('settings.editName'),
      },
      h('span', { className: 'kbn-board-name-caption kbn-board-name-edit', 'aria-hidden': true },
        h(DshUI.IconEditOutlineRegular, { size: 16 })),
      h('span', { className: 'kbn-board-name-caption kbn-board-name-save', 'aria-hidden': true },
        h(Icon, { name: 'check', size: 16 }))),
      editing && h(DshUI.Button, {
        className: 'kbn-board-icon-button', type: 'button', variant: 'ghost', size: 'sm', disabled: busy,
        'aria-label': t('common.cancel'), title: t('common.cancel'), onClick: finishEditing,
        icon: h(Icon, { name: 'close', size: 16 }),
      })),
    error && h('p', { className: 'kbn-import-error', role: 'alert' }, error))
}

function WorkboardSettings({ close }) {
  const store = kanbanStore
  const state = store.use((snapshot) => snapshot)
  const boards = boardsOf(state)
  const [boardId, setBoardId] = useState(kbnLastWorkspaceId)
  const [boardOpen, setBoardOpen] = useState(false)
  const activeBoard = boards.find((board) => board.id === boardId) || boards[0] || null
  const [importState, setImportState] = useState(null)
  const importFileRef = useRef(null)

  function handleExport() {
    try {
      const payload = kbnExportPayload(store.getSnapshot())
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = kbnExportFileName()
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      store.toast(t('data.exported', { count: payload.tasks.length }), 'info')
    } catch (error) {
      store.toast(t('data.exportFailed', { message: messageOf(error) }), 'error')
    }
  }

  function handleImportPick() {
    const input = importFileRef.current
    if (input !== null && input !== undefined) input.click()
  }

  async function handleImportFile(event) {
    const input = event !== null && event !== undefined ? event.target : null
    const file = input !== null && input !== undefined
      && input.files !== null && input.files !== undefined && input.files.length > 0
      ? input.files[0]
      : null
    if (input !== null && input !== undefined) input.value = ''
    if (file === null || file === undefined) return
    if (activeBoard === null) {
      store.toast(t('data.importNoWorkspace'), 'error')
      return
    }
    let text
    try {
      text = await file.text()
    } catch {
      store.toast(t('data.readFailed'), 'error')
      return
    }
    const parsed = kbnParseImport(text)
    if (!parsed.ok) {
      store.toast(t('data.parseFailed'), 'error')
      return
    }
    if (parsed.tasks.length === 0) {
      store.toast(t('data.importEmpty'), 'error')
      return
    }
    setImportState({
      fileName: file.name,
      tasks: parsed.tasks,
      invalid: parsed.invalid,
      workspaceId: activeBoard.id,
      workspaceTitle: activeBoard.title,
      busy: false,
      progress: null,
      error: null,
    })
  }

  async function confirmImport() {
    if (importState === null || importState.busy === true) return
    const target = importState
    setImportState(Object.assign({}, target, { busy: true, error: null, progress: { done: 0, total: target.tasks.length } }))
    try {
      const result = await kbnImportTasks(store, target.workspaceId, target.tasks, (done, total) => {
        setImportState((previous) => (previous === null
          ? null
          : Object.assign({}, previous, { progress: { done, total } })))
      })
      await store.refresh()
      setImportState(null)
      store.toast(result.failed > 0
        ? t('data.importPartial', { created: result.created, failed: result.failed })
        : t('data.importDone', { created: result.created }), result.failed > 0 ? 'error' : 'info')
    } catch (error) {
      setImportState((previous) => (previous === null
        ? null
        : Object.assign({}, previous, { busy: false, error: messageOf(error) })))
    }
  }

  return h('div', { className: 'kbn-settings' },
    h('section', { className: 'kbn-settings-group' },
      h('div', { className: 'kbn-settings-heading' },
        h('h3', null, t('settings.target')),
        h(DshUI.Button, {
          variant: 'ghost', size: 'sm', disabled: !!importState,
          onClick: () => setBoardOpen(true),
        }, h(Icon, { name: 'projectAdd', size: 16 }), t('board.newBoard'))),
      activeBoard ? h('ul', { className: 'kbn-settings-boards', 'aria-label': t('settings.target') },
        boards.map((board) => h(SettingsBoardRow, {
          key: board.id, board, selected: board.id === activeBoard.id,
          onSelect: () => setBoardId(board.id), disabled: !!importState,
        })))
        : h('p', null, t('board.noBoardTitle'))),
    h('section', { className: 'kbn-settings-group' },
      h('h3', null, t('archive.title'), ' (', archivedTasks(state).length, ')'),
      h(ArchivedTaskList, { close })),
    h('section', { className: 'kbn-settings-group' },
      h('div', { className: 'kbn-settings-copy' },
        h('h3', null, t('data.trigger')),
        h('p', { className: 'kbn-detail-note' }, t('settings.exportAll'))),
      h('div', { className: 'kbn-settings-actions' },
        h(DshUI.Button, { variant: 'outline', size: 'sm', onClick: handleExport }, t('data.export')),
        h(DshUI.Button, { variant: 'outline', size: 'sm', onClick: handleImportPick, disabled: !activeBoard || !!importState }, t('data.import'))),
      h('input', {
        ref: importFileRef,
        type: 'file',
        accept: 'application/json,.json',
        className: 'kbn-visually-hidden',
        tabIndex: -1,
        'aria-hidden': 'true',
        onChange: handleImportFile,
      }),
      h(KbnImportReview, {
        state: importState,
        onCancel: () => setImportState(null),
        onConfirm: confirmImport,
      })),
    h(NewBoardDialog, { open: boardOpen, onClose: (board) => {
      setBoardOpen(false)
      if (board) setBoardId(board.id)
    } }),
    h(ToastHost))
}

addStyle(`
.kbn-settings { display: grid; gap: 24px; color: var(--dsw-alias-label-primary); }
.kbn-settings-group { min-width: 0; }
.kbn-settings-group + .kbn-settings-group { padding-top: 24px; border-top: 1px solid var(--dsw-alias-border-l2); }
.kbn-settings-group > * + * { margin-top: 12px; }
.kbn-settings-group > h3 + .kbn-detail-note { margin-top: 4px; }
.kbn-settings-group > .kbn-detail-note p { margin: 0; }
.kbn-settings-group > .kbn-detail-note p + p { margin-top: 4px; }
.kbn-settings-group > .kbn-archive-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; min-height: 112px; margin-top: 12px; padding: 24px 20px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); text-align: center; }
.kbn-settings-group > h3, .kbn-settings-heading > h3, .kbn-settings-copy > h3 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; }
.kbn-settings-copy { display: grid; gap: 4px; }
.kbn-settings-copy > * { margin: 0; }
.kbn-settings-group > .kbn-empty { min-height: 0; padding: 16px; }
.kbn-settings-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.kbn-settings-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.kbn-settings-actions .kbn-input-wrap { flex: 1; min-width: 100px; }
.kbn-settings-boards { display: grid; gap: 6px; margin-bottom: 0; padding: 0; list-style: none; }
.kbn-settings-board { display: grid; grid-template-columns: 16px minmax(0, 1fr); align-items: center; gap: 6px 10px; padding: 4px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); }
.kbn-settings-board[data-selected="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.kbn-settings-board > input { margin: 0; width: 16px; height: 16px; accent-color: var(--dsw-alias-label-primary); }
.kbn-settings-board .kbn-import-error { grid-column: 2; margin: 0; }
.kbn-board-name-form { display: flex; align-items: center; gap: 4px; min-width: 0; }
.kbn-board-name-form > .kbn-input-wrap { flex: 1; min-width: 0; }
.kbn-board-name-form .kbn-input { height: 32px; font-size: 14px; font-weight: 400; }
.kbn-board-name { flex: 1; min-width: 0; height: 32px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-size: 14px; font-weight: 400; line-height: 20px; text-align: start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.kbn-settings-board .kbn-board-icon-button { flex-shrink: 0; width: 28px; height: 28px; min-width: 28px; padding: 0; }
.kbn-board-name-action { display: grid !important; order: 1; }
.kbn-board-name-caption { grid-area: 1 / 1; display: flex; align-items: center; justify-content: center; gap: 6px; pointer-events: none; transition: opacity 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1); }
.kbn-board-name-save { opacity: 0; transform: translateY(5px) scale(.96); }
.kbn-settings-board[data-editing="true"] .kbn-board-name-edit { opacity: 0; transform: translateY(-5px) scale(.96); }
.kbn-settings-board[data-editing="true"] .kbn-board-name-save { opacity: 1; transform: translateY(0) scale(1); }
@media (prefers-reduced-motion: reduce) {
  .kbn-board-name-caption { transition: none; }
}
`)


/* ---- 90-entry.js ---- */
/**
 * Browser-half entry. Registers the plugin's copy, stylesheet, client store and
 * the harness surfaces: the left-sidebar panel entry, the central board
 * panel, Workboard settings, and the session-header task status menu.
 */

/**
 * Sidebar glyph: the sidebar owns the button and its accessible name; this is
 * only the decorative icon child, rendered at the size the rail asks for.
 * @param {{ size?: number, active?: boolean }} props
 * @returns {object} React element
 */
function PanelGlyph({ size }) {
  const ref = useRef(null)
  useEffect(() => {
    // The host owns the sidebar button. Bind only the button containing our
    // slot glyph, including keyboard activation; leave its navigation intact.
    const button = ref.current?.closest('button')
    const home = () => kanbanStore.openHome()
    button?.addEventListener('click', home)
    return () => button?.removeEventListener('click', home)
  }, [])
  return h('span', { ref, className: 'kbn-panel-glyph' },
    h(DshUI.IconFlatListOutlineRegular, { size: typeof size === 'number' && size > 0 ? size : 20 }))
}

/**
 * Client plugin body.
 * @param {object} ctx - Harness client context with the injected services.
 * @returns {void}
 */
function apply(ctx) {
  ctx.effect(
    () => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }),
    'kanban: dictionaries',
  )

  const refreshCopy = () => {
    setTranslate(ctx.locale.bind(NS))
    const snapshot = ctx.locale.getLocale()
    setLocaleId(snapshot && typeof snapshot.active === 'string' ? snapshot.active : 'en')
  }
  refreshCopy()
  ctx.effect(() => ctx.locale.subscribe(() => {
    refreshCopy()
    if (kanbanStore !== null && typeof kanbanStore.notifyLocale === 'function') kanbanStore.notifyLocale()
  }), 'kanban: locale changes')

  ctx.effect(() => {
    const element = installStyles()
    return () => {
      element.remove()
    }
  }, 'kanban: stylesheet')

  kanbanStore = createKanbanStore(ctx)
  // Load once at activation so session-header task links work before the board
  // panel has ever been opened; a failure keeps the board's own retry state.
  kanbanStore.refresh().catch(() => undefined)
  // Read the signed-in account once the other client services have applied.
  ctx.effect(() => {
    const timer = setTimeout(() => {
      loadKbnAccount(ctx)
    }, 0)
    return () => clearTimeout(timer)
  }, 'kanban: account profile')
  ctx.effect(() => () => {
    if (kanbanStore !== null && typeof kanbanStore.dispose === 'function') kanbanStore.dispose()
  }, 'kanban: client store')

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 20,
    locale: NS,
    label: () => t('panel.title'),
  }, PanelGlyph))

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
  }, WorkboardPage))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: PLUGIN_ID,
    order: 100,
    locale: NS,
    label: () => t('panel.title'),
  }, WorkboardSettings))

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'kanban-task-link',
    order: -1,
    locale: NS,
    inject: (sessionId) => ({ sessionId }),
  }, TaskLinkAction))
}

return {
  inject: ['slots', 'locale', 'layout', 'sessions', 'uiWorkspace', 'workspaces', 'fileUpload'],
  apply,
}

  },
});
