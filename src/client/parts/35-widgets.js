/**
 * Generic widgets shared by the board, editor and archive parts.
 *
 * Props are exactly those documented in ARCHITECTURE.md §5; every class is
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

/** @param {HTMLElement} root @returns {HTMLElement | null} */
function widgetFocusable(root) {
  if (!root || typeof root.querySelector !== 'function') return null
  return root.querySelector(
    'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
  )
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
      const first = widgetFocusable(dialog.querySelector('.kbn-dialog-body')) || widgetFocusable(dialog)
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

  return h('div', { className: 'kbn-mask', onClick: handleMaskClick },
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
