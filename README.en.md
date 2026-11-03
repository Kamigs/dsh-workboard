# DSH Workboard

[![CI](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A DeepSeek Harness (DSH) plugin whose sidebar entry opens a home page with a
completion heatmap, every workspace and standalone board, and shared idea notes.
Open a board card to reach three permanently visible columns
(To do / Doing / Done). Tasks carry dates, urgency, tags, attachments and an
assignee (AI or the signed-in account). AI tasks can be sent to Harness sessions
for discussion or execution. Cards and sessions link to each other.

[中文](README.md) · [Architecture](docs/ARCHITECTURE.md) · [Changelog](CHANGELOG.md) · [Packaging and release](docs/RELEASING.md)

## Features

- **Home entry**: the sidebar opens the overview, including after a reload or
  restart. Search board cards showing their directory and unarchived task
  counts, open a card to enter its three-column board, and choose **Back**
  to return home.
- **Workspace and standalone boards**: the home page lists every workspace and
  standalone board. Create a standalone board without a directory, then choose
  a working directory when
  sending its first AI task. The board title menu still switches between boards.
- **Completion heatmap**: always shows the latest 52 weeks, including the current
  week. Square cells and gaps scale with the available width; ultrawide screens
  add equal margins around the centered chart.
  Dates use the browser's local calendar; each task counts once per day.
  Recording starts when this feature is enabled; old task timestamps do not
  backfill history. Archiving or deleting a task preserves its completion events.
- **Idea notes**: shared across boards, with six colors, quick entry, search,
  editing and deletion. Card footers show the update date or save status.
  Add a new note with the button or `⌘ / Ctrl + Enter`; existing-note edits
  save after 600ms of inactivity. Failed saves retain the draft for retry.
- **Three always-visible columns** — To do (grey) / Doing (blue) / Done (green).
  An empty column shows an in-column placeholder instead of replacing the board;
  cards drag across columns and reorder before/after other cards.
- **Task editor**: one content field holds the first-line summary and details,
  alongside dates, priority, tags, attachments and assignee. New tasks inherit
  their column's status; move cards by dragging or using a status menu in the
  details or linked-task panel.
- **Attachments**: select or drop files with no attachment-count limit. Images
  and files are included with the brief when sending a task to a session.
- **Detail sheet** shows the body directly below the task name, followed by
  status, dates, tags, attachments and actions. Image
  attachments show a large preview plus a thumbnail strip of every attachment;
  video / audio / text / other files open in a right-hand preview rail.
- **Send an AI task**. Choose a new session, the linked session, or the eligible current session in the same workspace. Discussion keeps the card in its column. Executing a queued task moves it from To do to Doing. Users mark completion on the board.
- **Linked tasks**. Open the list in the conversation header to see every unarchived task linked to that session. Each card has a status dropdown, a shortcut to its board, and an edit button. The plus button creates a task linked to the current session.
- **Archive** tasks in any column from their details. Restoring a task returns
  its card to the original column with its session link intact.
- **Import / export**: the Workboard section in Settings exports every task as
  JSON and imports a JSON document into the current project (new tasks only —
  attachments, sessions and archived state are not migrated). Task JSON does
  not include notes or completion history.
- **Resizable splitter** between board and detail sheet; the chosen width is
  remembered (localStorage, across reloads), double-click resets it, and the
  maximum width adapts to the window so the three columns never collapse.
- **DSH-matched UI**: direct host icon exports and native DSH UI primitives for
  home-page buttons, inputs, inline editing, tooltips and dialogs. `--dsw-*`
  tokens, light/dark themes and zh/en copy follow the host; the six note accents
  blend with the host background and use its text colors.

## Requirements

- Tested with DeepSeek Harness `0.2.1-rc.5` in Desktop and Web profiles.
- `engines.dsh` declares `>=0.2.1-rc.5 <0.3.0`. This is a compatibility policy,
  not a claim that every version in that range has been tested. Recheck the UI
  after upgrading DSH; prereleases with other version tuples are not included.
- Node.js >= 22. No npm runtime dependencies: React and DSH UI primitives come
  from the host's browser module table.

## Install

This is a DSH **bundle plugin**: `package.json` and `cordis.patch.yml` declare
its entry. The prebuilt `lib/client.js` is committed. These commands use an
installed `dsh` CLI; use the `desktop` profile for Desktop or `web` for Web.

### From a local tarball

Run `npm run pack` in the development checkout to build, check and package it:

```sh
dsh plugin --profile desktop add ./dist/dsh-workboard-0.1.0.tgz
```

Restart that DSH instance. Web users should replace `desktop` with `web`.

### From a local checkout

Run from the plugin root:

```sh
npm run build
dsh plugin --profile desktop add .
```

The directory is linked. Rebuild and refresh after browser changes; reload the
plugin or restart the instance after Host or manifest changes.

### After public release

Publishing the GitHub repository and npm package are separate steps. Use these
commands once the corresponding source/version is public:

```sh
# The GitHub checkout must contain the built lib/client.js.
dsh plugin --profile desktop add github:Kamigs/dsh-workboard

# Only after this version is published to npm.
dsh plugin --profile desktop add dsh-workboard@0.1.0
```

The package ships prebuilt entries and has no `prepare`, `install` or
`postinstall` hook. Pin a verified commit or tag for repeatable GitHub installs.
See [Packaging and release](docs/RELEASING.md) for the maintainer workflow.

## Usage

1. Click the board icon in the left sidebar to open the home page with its heatmap, boards and idea notes.
2. Open a board card or select **New board** to create a standalone board. Switch boards in the detail header; choose **Back** or the sidebar entry to return home. Task links from conversations still open the relevant board and task directly.
3. Create a task (or use a column's `+`) and enter its summary on the first line with details below.
4. Tasks assigned to **AI** show a blue circular send button at the card's
   bottom right; choose the destination and send mode there.
5. Click a card to open its details. Select a new status to move it to that column.
6. Choose **Archive task** in the details. Open Workboard settings to see the three most recent archived tasks per board. Expand a board's remaining tasks, restore a task or delete it there.
7. Open settings from the header gear. The vertical board list provides **Edit name** on each row,
   with Enter to save and Escape to cancel. The list header also offers **New board**.
   Select a board as the import target or export tasks from all boards.
8. Write an idea on the home page, choose a color and select **Add note**.
   Use a card's footer edit button to change it; edits save automatically.
   Choose **Retry save** after a failure. Deleting a note requires confirmation.

## Data and configuration

- Tasks, boards, global notes and completion events:
  `$DSH_HOME/kanban/state.json` (`DSH_HOME` defaults to `~/.dsh`). Notes are not
  owned by a workspace.
- A completion event is written when a task is created as Done or enters Done
  from another state; the heatmap deduplicates repeated completions per task/day.
  Imported Done tasks are new tasks and count on the import date, without
  restoring their original completion dates.
- Unsubmitted notes and pending edits use the browser's
  `dsh-workboard:note-drafts` localStorage entry for recovery after a reload.
  If browser storage is unavailable, drafts remain in memory only. This cache
  does not replace a backup of saved data.
- Attachments: stored in the owning workspace at `<workspace>/.dsh/assets/kanban/`
  (file name `<attachmentId>-<original name>`); the plugin data directory keeps
  `attachments/index.json` with name/type/size and the workspace reference.
  Legacy files in the data directory are still readable. Attachments have **no
  plugin-level count or size limit** (one JSON request body is bounded at 256 MiB and DSH
  Connection applies its own `maxRequestBodyBytes`). Add `.dsh/` to the project's
  `.gitignore` if you do not want attachment files in version control.
- Writes serialize and publish atomically (temp file + `fsync` + `rename`); a
  corrupt document is quarantined as `state.json.corrupt-<timestamp>` and the
  board starts empty instead of failing.
- Optional configuration, overriding the `kanban` row in the profile's
  `cordis.patch.yml`:

  ```yaml
  - id: kanban
    config:
      dataDir: ~/Documents/kanban
  ```

- Boards, notes, completion history and attachments are stored locally. Sending an AI task passes its
  content and attachments to the model used by the target session. The HTTP surface is mounted under DSH
  Connection's authenticated `/api` channel and only answers the signed-in
  local browser.

## Development

```sh
npm run build       # concat src/client/parts -> lib/client.js
npm test            # storage, archival, dispatch, heatmap and note-save tests
npm run test:smoke  # host routes end-to-end + browser-half render smoke (no browser)
npm run check       # everything above plus static checks
npm run pack        # build, check, pack and test an isolated installation
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Layout

```
index.js                  host entry (injects connection / workspaceRegistry)
host/store.js             tasks, notes, completions, validation, persistence, attachments
host/routes.js            authenticated /api/kanban.* routes
lib/client.js             generated browser bundle (committed)
src/client/parts/*.js     browser sources, concatenated into one factory scope
scripts/                  build, static verification, host-route and render smokes
test/                     storage, archival, dispatch, home and note-save tests
locale/                   plugin display metadata (en/zh)
icon.svg, cordis.patch.yml
docs/                     Architecture and release instructions
dist/                     Verified tarball and SHA-256 (generated, gitignored)
```

The checkout contains sources and tests. The installable package contains only
runtime files, icons, locales and documentation. `host/` is executable plain
JavaScript; `lib/` contains the committed browser build output.

## Notes

- The home page, send dialog and session task menu use Harness UI primitives directly; icons reference host exports.
- Account identity is read through the optional `remote.account.getProfile`.
  Without a signed-in account the assignee falls back to plain "Human" and
  everything else keeps working.

## License

[MIT](LICENSE)
