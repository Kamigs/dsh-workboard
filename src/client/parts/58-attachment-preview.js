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
    if (rail !== null && rail !== undefined && typeof rail.focus === 'function') rail.focus()
  }, [attachmentId])

  // Escape closes the preview instead of the dialog underneath.
  useEffect(() => {
    if (attachment === null) return undefined
    const onKeyDown = (event) => {
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
