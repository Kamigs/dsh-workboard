# Architecture

`dsh-workboard` is one DeepSeek Harness bundle with two halves:

- **Host half** (`index.js` + `host/`) — a durable JSON store and the
  authenticated `/api/kanban.*` routes. Node built-ins only.
- **Browser half** (`lib/client.js`, built from `src/client/parts/`) — a single
  `window.__ModuleLoader__.load({ id, factory })` bundle that registers the
  sidebar entry, board panel, native settings section and session-header task
  link. It uses React and DSH UI primitives from the Harness module table.

The two halves talk over the Connection service's authenticated exact-Fetch
registry (`ctx.connection.fetch.register` on the host,
`fetch('/api/kanban.*')` in the browser). No Harness-internal state is mutated.

## 1. Hard rules

1. Resolve React and the host-provided `@deepseek-ai/dsh-client-ui-primitives` through the client module table. The send dialog and session task menu use the native controls.
2. Parts are plain scripts concatenated inside one `factory(require)` scope. No
   `import`/`export`; a part may use names declared by an earlier part and never
   redeclares one. `node scripts/build-client.mjs` validates the assembly.
3. Every class is `kbn-` prefixed; all colors come from `--dsw-*` custom
   properties so light/dark and theme changes keep working.
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
| `host/store.js` | Task model, validation, atomic JSON persistence, attachments |
| `host/routes.js` | `/api/kanban.*` route table, JSON/error mapping, downloads |
| `src/client/parts/00-prelude.js` | React binding, `t`, `cx`, style registry, date/size helpers |
| `src/client/parts/05-l10n.js` | copy shared by more than one part |
| `src/client/parts/10-style-base.js` | page shell, buttons, fields, modal, toast, empty state |
| `src/client/parts/12-style-board.js` | board columns, cards, workbench, detail sheet, resizer |
| `src/client/parts/20-api.js` | JSON `fetch` wrapper with timeout and host error surfacing |
| `src/client/parts/25-store.js` | client snapshot store, mutations, toasts, focus queue |
| `src/client/parts/30-icons.js` | `Icon` component with the Harness glyph set |
| `src/client/parts/35-widgets.js` | `Button`, `IconButton`, `Field`, `Input`, `TextArea`, `Select`, `Chip`, `Modal`, `EmptyState`, `Spinner`, `ToastHost` |
| `src/client/parts/36-date-field.js` | `DateField`: text field + floating calendar panel (the native date popup cannot be themed) |
| `src/client/parts/37-account.js` | signed-in DeepSeek profile via optional `remote.account.getProfile`; identity card + avatar |
| `src/client/parts/40-card.js` | `TaskCard`, `StatusDot`, `PriorityBadge`, corner edit / send controls |
| `src/client/parts/45-task-editor.js` | single-content create/edit dialog, metadata and attachment drops |
| `src/client/parts/50-archive-modal.js` | archived-task manager (restore / delete / open session) |
| `src/client/parts/55-board.js` | `BoardPage`: workspace switch, three columns, drag & drop, detail sheet, resizer |
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
| GET | `/api/kanban.state` | — | `{ ok, workspaces, boards, tasks }` |
| POST | `/api/kanban.board.create` | `{ title }` | `{ ok, board }` |
| POST | `/api/kanban.board.bind` | `{ boardId, workspaceId }` | `{ ok, boardId, workspaceId, migrated }` |
| POST | `/api/kanban.task.create` | `{ workspaceId, input }` | `{ ok, task }` |
| POST | `/api/kanban.task.update` | `{ id, patch }` | `{ ok, task }` |
| POST | `/api/kanban.task.move` | `{ id, status, beforeId? }` | `{ ok, tasks }` |
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

The editor exposes one task-content field. `taskContentFields` and
`taskContentText` map it to the legacy title/description storage fields while
preserving paragraph breaks. New cards inherit their column's status; the
editor does not submit status changes. Details render the body below the name
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
  getSnapshot()             // { status, workspaces, tasks, error, toast, revision }
  subscribe(listener)
  refresh()
  createTask(workspaceId, input)
  updateTask(id, patch)
  moveTask(id, status, beforeId?)
  archiveTask(id) / restoreTask(id) / deleteTask(id)
  linkSession(id, sessionId) / uploadAttachment(file) / attachmentUrl(id)
  setFocusTask(id) / takeFocusTask()
  setBusy(flag) / toast(message, kind?)
  notifyLocale() / dispose()
  ctx                       // the client context, for navigation/pickers
}
```

Derived helpers: `tasksOf`, `archivedTasks`, `taskById`, `tasksForSession`,
`workspaceOf`.

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

Additional part-local primitives: `DateField` (§2 table), `AccountAssigneeCard`,
`KbnAccountAvatar`, `TaskCard`, `StatusDot`, `PriorityBadge`, `TaskDetailPanel`,
`AttachmentPreviewRail`.

## 6. Icons

`<Icon name="…" size={16} />` renders 16×16 `currentColor` strokes copied from
the Harness client icon set: `board, plus, archive, unarchive, trash, close,
chevronDown, chevronLeft, chevronRight, check, play, sparkle, user, paperclip,
warning, clock, search, refresh, projectAdd, workspace, send, link, folderOpen,
checkCircle, stop, edit, download, data`. The import glyph is the `download`
icon rotated 180°, so import/export read as one pair.

## 7. Visual language

The board styles use Harness theme tokens. The send dialog and header menu render the host primitives directly.

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

## 8. Slot registration (`90-entry.js`)

```js
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: 'kanban', order: 20, locale: NS,
  label: () => t('panel.title'),
}, PanelGlyph))                       // ({ size, active }) => <Icon name="board" />

ctx.slots.inject('main', () => ctx.slots.register({
  name: 'main', key: 'kanban', locale: NS,
}, BoardPage))

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

## 9. Build & verification

```sh
node scripts/build-client.mjs        # concatenate parts -> lib/client.js
node scripts/verify.mjs              # manifest, exports, locales, bundle guards
node --test                          # storage, archival and session dispatch tests
node scripts/smoke-host-routes.mjs   # every host route through a fake registry
node scripts/smoke-client.mjs        # render every surface without a browser
```

`lib/client.js` is committed because it is the plugin's browser runtime; CI
rebuilds it and fails if the committed artifact differs from the sources.

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
- The selected board is remembered under `dsh-workboard:selected-board`.
  Returning to the panel, reloading or restarting restores that board while it
  still exists. Settings maintain a separate selection for the import target.

## 12. Data import / export

The header gear opens the Workboard section in DSH’s `settings.section` slot.
Its sections appear in this order: board list, archived tasks, data transfer.
Sections use dividers; individual board rows remain compact bordered controls.
Archive groups show their three most recent tasks with a per-group expand
button for the rest. Settings toasts appear at the dialog's bottom right.
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
