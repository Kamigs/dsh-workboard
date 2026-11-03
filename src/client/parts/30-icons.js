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
