# DSH Workboard

[![CI](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A DeepSeek Harness (DSH) plugin that adds a **Workboard** to the left sidebar.
Every Harness workspace gets its own board with three permanently visible columns
(To do / Doing / Done). Tasks carry dates, urgency, tags, attachments and an
assignee (AI or the signed-in account). An AI task can spawn a Harness session
that executes it. Cards and sessions link to each other.

[中文](README.md) · [Architecture](ARCHITECTURE.md) · [Changelog](CHANGELOG.md)

## Features

- **Sidebar entry + central board panel** registered through the Harness slot
  system, so icon, navigation and layout follow the host.
- **Workspace-scoped boards**: switching workspace switches the board; create a
  project from the board (pick a directory → DSH workspace).
- **Three always-visible columns** — To do (grey) / Doing (blue) / Done (green).
  An empty column shows an in-column placeholder instead of replacing the board;
  cards drag across columns and reorder before/after other cards.
- **Full task fields**: title, description, status, start date, due date,
  urgency (low / medium / high / urgent), tags, attachments, assignee, session.
- **Detail sheet** on the right (a deliberately different UI form from the
  columns) with fields, description, tags, attachments and actions. Image
  attachments show a large preview plus a thumbnail strip of every attachment;
  video / audio / text / other files open in a right-hand preview rail.
- **Send an AI task**. Choose a new session, the linked session, or the eligible current session in the same workspace. Discussion keeps the card in its column. Executing a queued task moves it from To do to Doing. Users mark completion on the board.
- **Linked tasks**. Open the list in the conversation header to see every unarchived task linked to that session. Each card has a status dropdown, a shortcut to its board, and an edit button. The plus button creates a task linked to the current session.
- **Archive** tasks in any column from their details. Restoring a task returns
  its card to the original column with its session link intact.
- **Import / export**: the Workboard section in Settings exports every task as
  JSON and imports a JSON document into the current project (new tasks only —
  attachments, sessions and archived state are not migrated).
- **Resizable splitter** between board and detail sheet; the chosen width is
  remembered (localStorage, across reloads), double-click resets it, and the
  maximum width adapts to the window so the three columns never collapse.
- **DSH-matched UI**: host icon set (16px `currentColor` strokes), `--dsw-*`
  design tokens, light/dark themes, zh/en copy.

## Requirements

- DeepSeek Harness `0.2.1-rc.5` (Desktop/Web profile) tested. Older/newer
  versions that lack the `sidebar.panellist` / `main` slots or the
  `connection.fetch` service simply leave the plugin inactive.
- No build tooling is needed to run it; development needs Node.js >= 22.

## Install

The browser bundle `lib/client.js` is committed, so installation runs no build
scripts.

### From GitHub (recommended)

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile <profile> add github:Kamigs/dsh-workboard
```

Restart the profile afterwards; the board icon appears in the left sidebar.

### From a local checkout (development)

```sh
git clone https://github.com/Kamigs/dsh-workboard.git
cd dsh-workboard
npm run build          # regenerate lib/client.js (optional)
```

Then install the absolute directory path from the Harness plugin manager:

```
plugin_manager action=install_bundle target=/absolute/path/to/dsh-workboard
```

A local directory is linked, so `npm run build` plus a page refresh is enough to
pick up changes.

### From npm (if published)

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile <profile> add dsh-workboard
```

## Usage

1. Click the board icon in the left sidebar.
2. Switch boards in the header, or select **New board** to create a standalone board.
3. Create a task (or use a column's `+`) and enter its summary on the first line with details below.
4. Tasks assigned to **AI** show a blue circular send button at the card's
   bottom right; choose the destination and send mode there.
5. Click a card to open its details. Select a new status to move it to that column.
6. Choose **Archive task** in the details. Open Workboard settings and expand Archived tasks to restore or delete a task.
7. Open settings from the header gear. The vertical board list provides **Edit name** on each row,
   with Enter to save and Escape to cancel. Select a board as the import target or export tasks from all boards.

## Data and configuration

- Task data: `$DSH_HOME/kanban/state.json` (`DSH_HOME` defaults to `~/.dsh`).
- Attachments: stored in the owning workspace at `<workspace>/.dsh/assets/kanban/`
  (file name `<attachmentId>-<original name>`); the plugin data directory keeps
  `attachments/index.json` with name/type/size and the workspace reference.
  Legacy files in the data directory are still readable. Attachments have **no
  plugin-level size limit** (one JSON request body is bounded at 256 MiB and DSH
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

- Everything stays on this machine; the HTTP surface is mounted under DSH
  Connection's authenticated `/api` channel and only answers the signed-in
  local browser.

## Development

```sh
npm run build       # concat src/client/parts -> lib/client.js
npm test            # host store unit tests (11)
npm run test:smoke  # host routes end-to-end + browser-half render smoke (no browser)
npm run check       # everything above plus static checks
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Layout

```
index.js                  host entry (injects connection / workspaceRegistry)
host/store.js             task model, validation, atomic persistence, attachments
host/routes.js            authenticated /api/kanban.* routes
lib/client.js             generated browser bundle (committed)
src/client/parts/*.js     browser sources, concatenated into one factory scope
scripts/                  build, static verification, host-route and render smokes
test/                     host store tests
locale/                   plugin display metadata (en/zh)
icon.svg, cordis.patch.yml
```

## Notes

- The send dialog and session task menu use the Harness UI primitives and icons directly.
- Account identity is read through the optional `remote.account.getProfile`.
  Without a signed-in account the assignee falls back to plain "Human" and
  everything else keeps working.

## License

[MIT](LICENSE)
