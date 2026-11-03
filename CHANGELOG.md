# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Verified release packaging with a prepack build/check gate, offline tarball
  installation smoke tests, SHA-256 output and CI package artifacts.
- Explicit DSH compatibility range and localized plugin detail documents.

- Send-task dialog with new, eligible current, or linked session destinations
  and discussion/execution modes; task attachments travel with the brief.
- Toggleable conversation task panel with per-task status, board navigation,
  editing and task creation.
- Native DSH Workboard settings with inline board renaming, board creation,
  per-board archive previews and data import/export.
- Persistent board selection and standalone boards that bind a working
  directory when first used for an AI session.
- Attachment drag and drop without an attachment-count limit.

### Changed

- Architecture and release documentation live under `docs/`; npm packages
  exclude development sources, scripts and tests through an explicit file list.

- One task-content editor replaces separate title and description inputs;
  task details place the body immediately below the name.
- Discussion preserves task status; execution moves accepted To do tasks to
  Doing. AI reply completion never marks a task Done automatically.
- Archive and restore affect individual cards and preserve their session links.
- Board names replace the page title and open an anchored menu. The subtitle
  lists counts for all three states; narrow layouts preserve readable columns.
- Settings sections use dividers, compact board rows and icon-only rename
  controls. Each board's three most recent archived tasks remain visible.

### Fixed

- Board rename persistence, menu placement, duplicate status labels,
  status-coloured selection rings and card action alignment.
- Conversation-panel toggle contrast and positioning within the conversation.
- Archive heading contrast and left alignment, compact heading/description
  spacing, centred empty states and bottom-right settings notifications.

## [0.1.0] - 2026-11-03

### Added

- Left-sidebar **Task Board** panel entry with a workspace-scoped board.
- Three always-visible columns — To do / Doing / Done — with status-coloured
  headers, drag-and-drop between columns and before/after cards.
- Task fields: title, description, status, start date, due date, priority
  (low / medium / high / urgent), tags, attachments, assignee (AI / signed-in
  human account), linked execution session.
- AI tasks expose a composer-style circular send button that creates a Harness
  session, sends the task brief as the first prompt, links the session to the
  card and moves the card to Doing.
- Task ↔ session navigation: the card opens its session, and the session header
  links back to the card.
- Right-hand task detail sheet with inline image preview, an attachment
  thumbnail strip, and a preview rail for video / audio / text / other files.
- Archive a Done task together with its session; an archive dialog restores or
  deletes archived tasks.
- Draggable splitter between the board and the detail sheet, with limits that
  adapt to the window size; the chosen width is remembered in `localStorage`.
- Header data menu: export every task as JSON, or import a JSON export into the
  current project (additive, attachments and sessions excluded).
- DSH-matched surface: host icon set, `--dsw-*` theme tokens, light and dark
  themes, zh/en locales.
- Host half: atomic JSON persistence, corrupt-state quarantine, ten
  authenticated `/api/kanban.*` routes.
- Attachments are stored in the owning workspace under `.dsh/assets/kanban/`
  with no plugin-level size limit (legacy data-directory files stay readable).
- Verification: 11 host store tests, a host-route end-to-end smoke test and a
  browser-half render smoke test that needs no browser.

[Unreleased]: https://github.com/Kamigs/dsh-workboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Kamigs/dsh-workboard/releases/tag/v0.1.0
