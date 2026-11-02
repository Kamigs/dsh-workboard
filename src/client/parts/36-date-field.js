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
