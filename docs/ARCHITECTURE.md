# Architecture

`dsh-workboard` is one DeepSeek Harness bundle with two halves:

- **Host half** (`index.js` + `host/`) — a durable JSON store and the
  authenticated `/api/kanban.*` routes. Node built-ins only.
- **Browser half** (`lib/client.js`, built from `src/client/parts/`) — a single
  `window.__ModuleLoader__.load({ id, factory })` bundle that registers the
  sidebar entry, home/board panel, native settings section and session-header task
  link. It uses React and DSH UI primitives from the Harness module table.

The two halves talk over the Connection service's authenticated exact-Fetch
registry (`ctx.connection.fetch.register` on the host,
`fetch('/api/kanban.*')` in the browser). No Harness-internal state is mutated.

## 1. Hard rules

1. Resolve React and the host-provided `@deepseek-ai/dsh-client-ui-primitives` through the client module table. The home page, send dialog and session task menu use the native controls; icons reference the host exports directly.
2. Parts are plain scripts concatenated inside one `factory(require)` scope. No
   `import`/`export`; a part may use names declared by an earlier part and never
   redeclares one. `node scripts/build-client.mjs` validates the assembly.
3. Every class is `kbn-` prefixed. Surfaces, text, borders and status colors use
   `--dsw-*` custom properties. The six note accent hues mix with the host's
   background and border tokens so the same notes adapt to light/dark themes.
4. Interactive controls are real `<button>`/`<input>` elements with
   `aria-label`, `:focus-visible` rings, keyboard operation and no
   `window.alert/confirm/prompt`.
5. Copy goes through `t()`; each part contributes its own dictionary with
   `addDict({ zh: … }, { en: … })`, and both languages must carry the same keys.
6. Resources (routes, timers, styles, subscriptions, store timers, body scroll
   locks) are owned by the fiber through `ctx.effect` and released on dispose.

## 2. Source layout

| File | Responsibility |
|---|---|
| `index.js` | Host plugin: resolves `dataDir`, opens the store, registers routes |
| `host/store.js` | Task/note/completion models, validation, atomic JSON persistence, attachments |
| `host/routes.js` | `/api/kanban.*` route table, JSON/error mapping, downloads |
| `src/client/parts/00-prelude.js` | React binding, `t`, `cx`, style registry, date/size helpers |
| `src/client/parts/05-l10n.js` | copy shared by more than one part |
| `src/client/parts/10-style-base.js` | page shell, buttons, fields, modal, toast, empty state |
| `src/client/parts/12-style-board.js` | board columns, cards, workbench, detail sheet, resizer |
| `src/client/parts/20-api.js` | JSON `fetch` wrapper with timeout and host error surfacing |
| `src/client/parts/25-store.js` | client snapshot, home/board navigation, note drafts and save queue, mutations, toasts, focus queue |
| `src/client/parts/30-icons.js` | `Icon` aliases to Harness icon exports |
| `src/client/parts/35-widgets.js` | `Button`, `IconButton`, `Field`, `Input`, `TextArea`, `Select`, `Chip`, `Modal`, `EmptyState`, `Spinner`, `ToastHost` |
| `src/client/parts/36-date-field.js` | `DateField`: text field + floating calendar panel (the native date popup cannot be themed) |
| `src/client/parts/37-account.js` | signed-in DeepSeek profile via optional `remote.account.getProfile`; identity card + avatar |
| `src/client/parts/40-card.js` | `TaskCard`, `StatusDot`, `PriorityBadge`, corner edit / send controls |
| `src/client/parts/45-task-editor.js` | single-content create/edit dialog, metadata and attachment drops |
| `src/client/parts/50-archive-modal.js` | archived-task manager (restore / delete / open session) |
| `src/client/parts/55-board.js` | `BoardPage`: workspace switch, three columns, drag & drop, detail sheet, resizer |
| `src/client/parts/56-home.js` | `WorkboardPage` and home: completion heatmap, board cards, idea notes, native DSH controls |
| `src/client/parts/58-attachment-preview.js` | attachment classification, thumbnail data, right-hand preview rail |
| `src/client/parts/60-session-bridge.js` | destination/mode dialog, attachment dispatch, linked-task panel and navigation |
| `src/client/parts/65-settings.js` | Workboard settings, board names, archive and data transfer controls |
| `src/client/parts/90-entry.js` | `apply()`: locale, styles, store, slot registrations |

Build order is fixed in `scripts/build-client.mjs`; later parts may use
hoisted functions from earlier ones, so the order matters.

## 3. Host API

All routes are exact Fetch routes under `/api`, so the Connection service
authenticates them and only the owner principal is admitted. Responses are JSON
with `cache-control: no-store`; failures answer non-2xx with
`{ "ok": false, "error": "message" }`.

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/kanban.state` | — | `{ ok, workspaces, boards, boardOrder, tasks, notes, completions }` |
| POST | `/api/kanban.note.create` | `{ input: { content, color? } }` | `{ ok, note }` |
| POST | `/api/kanban.note.update` | `{ id, input: { content, color? } }` | `{ ok, note }` |
| POST | `/api/kanban.note.delete` | `{ id }` | `{ ok }` |
| POST | `/api/kanban.board.create` | `{ title }` | `{ ok, board }` |
| POST | `/api/kanban.board.bind` | `{ boardId, workspaceId }` | state snapshot plus `{ boardId, workspaceId, migrated }` |
| POST | `/api/kanban.board.unbind` | `{ boardId }` (workspace board) | state snapshot plus `{ board, migrated }` |
| POST | `/api/kanban.board.move` | `{ boardId, beforeId?: string \| null }` | `{ ok, boardOrder }` |
| POST | `/api/kanban.task.create` | `{ workspaceId, input }` | `{ ok, task, completions }` |
| POST | `/api/kanban.task.update` | `{ id, patch }` | `{ ok, task, completions }` |
| POST | `/api/kanban.task.move` | `{ id, status, beforeId? }` | `{ ok, tasks, completions }` |
| POST | `/api/kanban.task.moveMany` | `{ ids: string[], status, beforeId? }` | `{ ok, tasks, completions }` |
| POST | `/api/kanban.board.rename` | `{ boardId, title }` | `{ ok, board: { id, title } }` |
| POST | `/api/kanban.task.archive` | `{ id }` | `{ ok, task }` |
| POST | `/api/kanban.task.restore` | `{ id }` | `{ ok, task }` |
| POST | `/api/kanban.task.delete` | `{ id }` | `{ ok }` |
| POST | `/api/kanban.task.link` | `{ id, sessionId: string \| null }` | `{ ok, task }` |
| POST | `/api/kanban.attachment.upload` | `{ name, type, data (base64), workspaceId }` | `{ ok, attachment }` |
| GET | `/api/kanban.attachment?id=` | — | binary download |

Types:

```ts
type Status = 'todo' | 'doing' | 'done'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface Workspace { id: string; title: string; path: string }
interface Attachment { id: string; name: string; size: number; type: string }
type NoteColor = 'yellow' | 'pink' | 'blue' | 'mint' | 'purple' | 'neutral'
interface IdeaNote {
  id: string                   // 'note_' + UUID
  content: string              // 1–4000 characters, trimmed; preserves newlines
  color: NoteColor
  createdAt: string            // ISO timestamp
  updatedAt: string
}
interface Completion { taskId: string; at: string } // ISO event timestamp

interface Task {
  id: string
  workspaceId: string
  title: string
  description: string
  status: Status
  startDate: string | null      // 'YYYY-MM-DD'
  dueDate: string | null        // 'YYYY-MM-DD'
  priority: Priority
  tags: string[]
  attachments: Attachment[]
  assignee: { kind: 'ai' | 'human'; name: string }
  sessionId: string | null
  archived: boolean
  archivedAt: string | null
  order: number
  createdAt: string             // ISO timestamp
  updatedAt: string
}
```

Validation lives in `host/store.js` (title 1–200 chars, description ≤ 20000,
12 tags); unknown patch keys are ignored. Writes serialize
through one queue and publish atomically (temp file + `fsync` + `rename`); a
corrupt `state.json` is quarantined as `state.json.corrupt-<timestamp>`.

`boardOrder` persists one shared order for workspace and standalone boards.
Moving a board inserts it before `beforeId`; omitting it or passing null moves
the board to the end. Unknown boards return 404. Legacy documents default to
workspace order followed by standalone boards, and new boards append after the
saved order. Home supports drag/drop and accessible earlier/later buttons.
During a drag, CSS grid order previews the insertion and other cards give way.
The original DOM node stays mounted for native drag events. Cancelling restores
the saved layout; dropping persists the order, and a failed save restores it.

Task details support Cmd/Ctrl-click to toggle individual cards and Shift-click
to select a range in column/card order. Cmd/Ctrl-Shift-click adds a range to the
selection. Plain click selects one card and opens its details; Escape or a click
on the empty board clears selection. Selected cards are highlighted without
checkboxes, a selection toolbar or instruction text, and move together by dragging.
The host validates one live board selection and
writes the entire move atomically, preserving column/order sequence and recording
completion events only for tasks newly entering Done. Failure preserves both
task state and completion history. The target card stays in its original status.
Native dragstart leaves the source visible and in place so the browser can capture
its preview. The first dragover removes source cards from the layout and reserves
their combined height with a dashed rounded placeholder; siblings give way at
the insertion position.

Board details expose explicit workspace binding below the title, alongside the
existing first-AI-dispatch binding flow. Binding merges tasks into an existing
workspace board, keeps the standalone board's display name and saved position,
and removes its standalone record. Only registered workspaces can be bound.
Unbinding creates a standalone board with the same title, moving all live and
archived tasks and clearing their session links. Attachments and completion
history remain intact. DSH workspaces, sessions and files are untouched; the
original workspace still contributes an empty board to Home. Binding responses
include an authoritative snapshot so navigation and migrated task identities
update together, without an intermediate empty board.

The version-1 state document also contains `notes` and `completions`. Both are
global to the plugin data directory and use the same serialized atomic write
queue as tasks and boards. A failed write publishes neither the changed record
nor its completion event. Legacy documents without these arrays load them as
empty; existing Done tasks remain intact and do not acquire invented history.
Notes require nonblank content of at most 4000 characters and one of the six
supported colors; an omitted color defaults to yellow. Updating a note sends
the full content/color input, rather than a task-style patch.

A task created as Done, or changed from another state to Done through update
or move, appends `{ taskId, at }`. Editing or reordering an already completed
task adds no event. Reopening and completing again records another event;
the heatmap deduplicates those events per task/local day. Archive, restore and
deletion leave history intact. Task ID allocation also considers saved
completion events, so deleted task IDs are not reused after restart.

The editor exposes one task-content field. `taskContentFields` and
`taskContentText` map it to the legacy title/description storage fields while
preserving paragraph breaks. The board's New task button creates cards in To do;
the editor does not submit status changes. Details render the body below the name
without a separate description heading or empty-description placeholder.

Attachments are not stored in the data directory by default: an upload carries
the owning `workspaceId`, the Host resolves it through `workspaceRegistry`, and
the bytes land in `<workspace>/.dsh/assets/kanban/<attachmentId>-<name>`. The
sidecar records `workspaceId` + `fileName` (portable across machines) with the
absolute path and the legacy data-directory layout as read fallbacks. There is
no plugin-level file-size limit; the request transport still bounds one JSON
body (256 MiB, base64-inlined) and DSH Connection enforces its own
`maxRequestBodyBytes`.

## 4. Client store

`src/client/parts/25-store.js` exposes `createKanbanStore(ctx)`; `90-entry.js`
assigns it to the module-level `kanbanStore` that every component reads.

```ts
interface KanbanStore {
  use(selector, isEqual?)   // useSyncExternalStore selector
  getSnapshot()             // { status, workspaces, boards, boardOrder, tasks, notes, completions,
                            //   boardId, noteDraft, noteEdits, noteStatus, error, toast, revision, busy }
  subscribe(listener)
  refresh()
  openHome() / openBoard(boardId)
  createBoard(title) / renameBoard(boardId, title) / bindBoard(boardId, workspaceId)
  unbindBoard(boardId) / moveBoard(boardId, beforeId?)
  createTask(workspaceId, input)
  updateTask(id, patch)
  moveTask(id, status, beforeId?)
  moveTasks(ids, status, beforeId?)
  archiveTask(id) / restoreTask(id) / deleteTask(id)
  linkSession(id, sessionId, expectedSessionId?) / uploadAttachment(file, workspaceId) / attachmentUrl(id)
  createNote(input) / editNote(id, patch) / flushNote(id) / deleteNote(id)
  setNoteDraft(patch)
  setFocusTask(id) / takeFocusTask()
  setBusy(flag) / toast(message, kind?)
  notifyLocale() / dispose()
  ctx                       // the client context, for navigation/pickers
}
```

Derived helpers: `tasksOf`, `archivedTasks`, `taskById`, `tasksForSession`,
`workspaceOf`, `boardsOf`, `boardOf`.

`boardId: null` selects home. `openBoard` selects a detail page; `openHome`
clears the board and pending task focus. A session task link uses `setFocusTask`
to select the task's board before the detail page consumes its focus request.
The main slot renders `WorkboardPage`, which falls back to home if the selected
board no longer exists.

Note drafts belong to this store, not the mounted home component. Existing-note
edits debounce for 600ms, serialize writes per note, and retain newer typing
when an older response arrives. The UI distinguishes pending, saving, saved,
failed and blank-content states. Failure keeps the draft for explicit retry;
blank edits never overwrite the saved note. Deletion waits for pending writes
and removes local data only after the host confirms it. The new-note composer
uses an explicit Add action or Cmd/Ctrl+Enter; plain Enter inserts a newline.

`dsh-workboard:note-drafts` in localStorage caches the composer and pending
edits. Recovered edits remain available for retry after reload. If storage is
unavailable, in-memory drafts still work. Leaving home does not cancel a save;
plugin disposal clears timers and attempts to flush pending edits, with the
draft cache available on the next load.

## 5. Widgets (`35-widgets.js`)

```jsx
<Button variant="primary|outline|ghost|danger" size="md|sm" icon busy onClick>…</Button>
<IconButton icon label />
<Field label hint error required>{children}</Field>
<Input value onChange={(value)} placeholder icon disabled ariaLabel />
<TextArea value onChange={(value)} rows placeholder ariaLabel />
<Select value onChange={(value)} options={[{ value, label }]} ariaLabel />
<Chip tone="neutral|brand|success|warn|danger" icon onRemove>…</Chip>
<Modal open onClose title icon width busy footer>{children}</Modal>
<EmptyState icon title description action />
<Spinner size label />
<ToastHost />   // mounted by BoardPage and WorkboardSettings
```

`Input`/`TextArea`/`Select` are value-first: `onChange` receives the string, not
an event. `Modal` traps Escape, locks body scroll and restores focus.

The home page directly renders `DshUI.Button`, `Input`, `InlineEditor`,
`Tooltip`, `Modal` and `Toast`. These use the host's API rather than the local
widget wrappers: for example, `DshUI.Input.onChange` receives an event, while
`DshUI.InlineEditor.onChange` receives the edited string.

Additional part-local primitives: `DateField` (§2 table), `AccountAssigneeCard`,
`KbnAccountAvatar`, `TaskCard`, `StatusDot`, `PriorityBadge`, `TaskDetailPanel`,
`AttachmentPreviewRail`.

## 6. Icons

`<Icon name="…" size={16} />` resolves aliases to icon components exported by
the Harness UI module, without copied SVG paths: `board, plus, archive, unarchive, trash, close,
chevronDown, chevronLeft, chevronRight, check, play, sparkle, user, paperclip,
warning, clock, search, refresh, projectAdd, workspace, send, link, folderOpen,
checkCircle, stop, edit, download, data`. The import glyph is the `download`
icon rotated 180°, so import/export read as one pair.
The sidebar uses `DshUI.IconFlatListOutlineRegular` directly. Settings navigation
keeps the icon supplied by the host; the plugin does not replace it with a CSS mask.

## 7. Visual language

The visual authority is DSH: the home page extends its existing workbench,
using host primitives, icons, type and theme surfaces. The note area follows
the user's reference, Bilibili `BV1i24P6rEmt` at 00:39–00:42: soft colors,
quick input, six-color choices,
search and content-first cards with edit/time footers. Its accent colors are
local choices; layout and controls remain part of the DSH interface.

- Radius: `--dsw-radius-xs:4px`, `-sm:8px`, `-md:12px`, `-lg:16px`, `-xl:20px`,
  `-panel:28px`.
- Type: base 14/22, secondary 13/20, caption 12/18, micro 11/17;
  `var(--dsw-font-family)` and `var(--ds-font-family-code)`.
- Buttons: md 36px, radius md, `padding: 0 14px`; sm 28px, radius sm,
  `padding: 0 10px`; primary uses `--dsw-alias-button-primary-fill` with
  `--dsw-alias-label-primary-foreground`.
- Fields: 36px, `.5px` border `--dsw-alias-border-l4`,
  `background: --dsw-alias-bg-layer-1`, radius md; focus adds
  `box-shadow: 0 0 0 2px color-mix(… 18%, transparent)`.
- Dialogs: radius 24px, `--dsw-elevation-prominent`, mask
  `--dsw-alias-bg-mask-1` + `--dsw-mask-blur`, header 46–54px, 28px close.
- Menus/popovers: `--dsw-specific-menu` + `--dsw-menu-backdrop-filter`.
- Status tones: todo → `--dsw-alias-state-idle-primary`, doing →
  `--dsw-alias-state-business-primary`, done → success-primary. Card accents,
  selected-card rings and column headers use the corresponding status tone;
  card surfaces remain neutral.

Home-specific design contract (`56-home.js`):

- **Type and layout:** inherited host font; page heading 24/32 at weight 600,
  section heading 17/24 at weight 600, supporting text 13/20, note body 16/26.
  Sections use 32px spacing. At a home content width of 1120px or more, boards
  and ideas occupy two equal side-by-side columns; narrower panels stack them.
  The breakpoint follows the panel's container, including sidebar/zoom changes.
  Each list independently auto-fills cards with a 250px minimum that can shrink
  to its container width; below a 540px container, controls and spacing compact.
  The heatmap always has 52 columns, including the current week. CSS scales
  square cells and 1–4px gaps with the container, without changing the dates.
  The grid has a centered 1458px maximum width, capping cells at 24px;
  wider panels add equal space on both sides. The heading and explanatory
  text stay aligned to the page content edge as the grid resizes. Month
  labels occupy one explicit grid row, including a final month with only one
  visible week; narrow panels use numeric month labels to avoid crowding.
- **Surfaces and shapes:** cards use `--dsw-radius-lg`. Note surfaces mix their
  accent at 18% with `--dsw-alias-bg-base`; borders mix the accent at 24% with
  `--dsw-alias-border-l4`. Content uses host primary/secondary label tokens.
  Note cards have a subtle shadow derived from the host primary label color.
  Their footer keeps the update date visible alongside any save status.
- **Six note accents:** yellow `#dcae38`, pink `#dc82a6`, blue `#71b5e4`,
  mint `#62b5a6`, purple `#a58ad7`, neutral `#aca69c`. They identify notes,
  independently of the board's task-status colors. Selected swatches include a
  check mark and outline; color alone does not convey selection.
- **Heatmap:** zero uses the host hover surface; levels 1–3 blend the success
  token with the base at 25%, 45% and 70%; 4 or more uses the success token.
  Each cell exposes its date and exact count through a native tooltip and
  accessible label. Arrow keys move by day/week; Home and End move to the first
  day and today. Future cells are hidden and disabled.
- **Motion and interaction:** note arrival lasts 180ms and is disabled under
  `prefers-reduced-motion`. Native buttons, inputs and dialogs retain host
  interaction behavior. Saving feedback reflects the request state; it cannot
  imply success while a draft is pending or failed.

## 8. Slot registration (`90-entry.js`)

```js
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: 'kanban', order: 20, locale: NS,
  label: () => t('panel.title'),
}, PanelGlyph))                       // ({ size, active }) => <Icon name="board" />

ctx.slots.inject('main', () => ctx.slots.register({
  name: 'main', key: 'kanban', locale: NS,
}, WorkboardPage))

ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section', id: PLUGIN_ID, order: 100, locale: NS,
  label: () => t('panel.title'),
}, WorkboardSettings))

ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
  name: 'conversation.session.header.utilities', id: 'kanban-task-link',
  order: -1, locale: NS, inject: (sessionId) => ({ sessionId }),
}, TaskLinkAction))
```

Navigation uses `ctx.layout.selectPanel('kanban')`, `ctx.uiWorkspace.openSession`,
`ctx.uiWorkspace.startSession`-family calls and `ctx.workspaces.create/rename`.
`PanelGlyph` listens for activation on its containing sidebar button and calls
`openHome`, including keyboard activation through the button's click event.
The listener is removed when the glyph unmounts. Direct task navigation selects
the panel programmatically and keeps its explicit board/task target.

## 9. Build & verification

```sh
node scripts/build-client.mjs        # concatenate parts -> lib/client.js
node scripts/verify.mjs              # manifest, exports, locales, bundle guards
node --test                          # storage, archival, dispatch, heatmap and note saves
node scripts/smoke-host-routes.mjs   # every host route through a fake registry
node scripts/smoke-client.mjs        # render every surface without a browser
```

`lib/client.js` is committed because it is the plugin's browser runtime; CI
rebuilds it and fails if the committed artifact differs from the sources.

Home coverage includes persistent notes, validation, completion transitions,
legacy data without backfilled history, failed disk writes, local-day heatmap
deduplication, serialized note saves, draft recovery and rejected deletion.
Host-route and component-render smoke checks include the home and note routes.
These checks do not replace Desktop/Web interaction and light/dark visual
acceptance of the new home page.

`npm run pack` runs those checks via `prepack`, creates a tarball in `dist/`,
then installs it offline without lifecycle scripts into a temporary consumer.
The verifier and both smoke scripts accept that installed package root, so the
release check detects missing runtime files instead of accidentally importing
from the checkout. Sources, tests and check scripts are excluded by the
`package.json.files` allowlist. See [Packaging and release](RELEASING.md).

## 10. Class ownership

Base part (`10-style-base.js`):

```
.kbn-root .kbn-page .kbn-scroll .kbn-head .kbn-head-main .kbn-title .kbn-subtitle
.kbn-head-actions .kbn-toolbar .kbn-btn .kbn-icon-btn .kbn-field .kbn-label
.kbn-hint .kbn-error-text .kbn-input-wrap .kbn-input-icon .kbn-input .kbn-textarea
.kbn-select .kbn-chip .kbn-mask .kbn-dialog .kbn-dialog-* .kbn-empty .kbn-spinner
.kbn-toast .kbn-divider .kbn-row .kbn-stack .kbn-visually-hidden
```

Board part (`12-style-board.js`): everything else — `.kbn-board`,
`.kbn-col*`, `.kbn-card*` (including `.kbn-card-side`, `.kbn-card-edit`,
`.kbn-card-send`, `.kbn-card-foot`), `.kbn-workbench`, `.kbn-detail*`,
`.kbn-detail-resizer*`, `.kbn-editor*`, `.kbn-form-*`, `.kbn-tag*`,
`.kbn-attach*`, `.kbn-archive*`, `.kbn-project-*`.

Other parts own their own prefixed classes: `36-date-field.js` → `.kbn-date*`;
`37-account.js` → `.kbn-account-*`; `58-attachment-preview.js` → `.kbn-attach-*`
and `.kbn-preview-*`; `59-data-transfer.js` → `.kbn-data-*`, `.kbn-import-*` and
`.kbn-icon-flip`.
`56-home.js` owns `.kbn-panel-glyph`, `.kbn-home*`, `.kbn-heat*`,
`.kbn-ideas`, `.kbn-note-*` and `.kbn-notes-grid`.

## 11. Cross-part integration

- `let kanbanStore = null` is declared in `25-store.js` and assigned by
  `90-entry.js` before any slot registers.
- `60-session-bridge.js` declares hoisted functions the board calls from event
  handlers: `dispatchTask(task, destination, mode)` and `openTaskSession(task)`.
  It links the card before sending and prepares every attachment first. Images
  become native image content blocks; other files use `fileUpload.upload` for
  the target session. Only an accepted execution prompt advances To do to
  Doing. Discussion and AI reply completion do not change task status.
  The board and archive list call the task store directly to archive and restore
  individual cards without archiving or restoring the session.
- `37-account.js` declares the optional account read the editor and card use:
  `loadKbnAccount(ctx)`, `useKbnAccount()`, `kbnAccountMatchesTask()`.
- `58-attachment-preview.js` declares `kbnAttachmentKind`,
  `kbnAttachmentIcon`, `kbnAttachmentExt` and `AttachmentPreviewRail`.
- `90-entry.js` reads the collected dictionaries/styles, installs them, and is
  the only place that registers slots.
- The detail-pane width is a browser preference kept in `localStorage` under
  `dsh-kanban:detail-width` (retained for preference compatibility); the displayed width follows the space available inside
  the DSH panel. Narrow panels place the selected task below the columns. Widening
  the panel restores the preferred width. Double-clicking the splitter clears it.
- The selected board preference remains under `dsh-workboard:selected-board`
  for detail-page fallback. It does not restore a detail page at startup:
  clicking the sidebar entry, reloading or restarting starts at home. The
  detail page's **Back** button also returns home. Settings maintain a
  separate selection for the import target.
- `kbnHeatmap` always derives 52 Monday-first calendar weeks, including the
  current week, from completion event timestamps. Resizing does not change
  the date range or displayed total. Cross-year month labels and day tooltips
  include the year. Dates use the browser's local time;
  each day counts distinct task IDs. The displayed total sums those daily
  counts, so the same task can count on different days. A midnight timer advances
  the calendar while home remains open. This is completion history, separate
  from the current unarchived task counts shown on each board card.

## 12. Data import / export

The header gear opens the Workboard section in DSH’s `settings.section` slot.
Its sections appear in this order: board list, archived tasks, data transfer.
Sections use dividers; individual board rows remain compact bordered controls.
Archive groups show their three most recent tasks with a per-group expand
button for the rest. Settings toasts appear at the dialog's bottom right.
Board toasts appear at the panel's top centre, with their width constrained to
the panel so task-detail footer actions remain visible in narrow layouts.
Workspace board names are stored in the plugin’s `workspaceBoardTitles` map
by workspace ID; they do not rename the Harness workspace or directory.

Export (`kbnExportPayload` + a Blob download) writes one document:

```json
{
  "format": "dsh-workboard",
  "version": 1,
  "exportedAt": "2026-11-03T00:00:00.000Z",
  "workspaces": [{ "id": "…", "title": "…", "path": "…" }],
  "tasks": [
    {
      "id": "task_…", "workspaceId": "…", "title": "…", "description": "…",
      "status": "todo", "startDate": null, "dueDate": null,
      "priority": "medium", "tags": [], "attachments": [
        { "name": "shot.png", "size": 1024, "type": "image/png" }
      ],
      "assignee": { "kind": "ai", "name": "AI" },
      "archived": false, "createdAt": "…", "updatedAt": "…"
    }
  ]
}
```

Import (`kbnParseImport` + `kbnImportTasks`) accepts that document, legacy
`dsh-kanban` exports, or a bare task array. It clamps to 1000 tasks, normalizes
each field, skips unrecognized records, and creates the rest in the board
selected in Workboard settings. Ids, session
links, attachment bytes and archived state intentionally do not cross the
boundary; the dialog states this before the user confirms. Repeating an import is
safe because it only ever creates tasks.

The task export does not include global notes or completion history. Import
therefore cannot restore either. A Done task created by import records a new
completion at import time, just like a task created directly in the Done
column; it does not reconstruct a historical completion date from timestamps.
