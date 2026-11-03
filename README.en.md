# DSH Workboard

[![CI](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Manage tasks, review completions and capture ideas inside DeepSeek Harness (DSH). Send AI tasks to conversations for discussion or execution.

The **Workboard** sidebar entry opens a home page with every board, a yearly completion heatmap and shared idea notes. Open a board card to reach its **To do / Doing / Done** columns. Tasks and their linked DSH conversations provide shortcuts to each other.

[中文](README.md) · [GitHub repository](https://github.com/Kamigs/dsh-workboard) · [Changelog](CHANGELOG.md)

## Install

Verified with DSH `0.2.1-rc.5` in Desktop and Web profiles. The manifest declares `>=0.2.1-rc.5 <0.3.0`; other versions require separate verification.

### Install from GitHub

With the `dsh` CLI installed, add the plugin to the profile you use.

**Desktop:**

```sh
dsh plugin --profile desktop add github:Kamigs/dsh-workboard
```

**Web:**

```sh
dsh plugin --profile web add github:Kamigs/dsh-workboard
```

Restart that DSH instance, then open **Workboard** in its sidebar. Replace `desktop` or `web` if you use a custom profile name.

The source is [the main branch of Kamigs/dsh-workboard](https://github.com/Kamigs/dsh-workboard/tree/main). It includes the prebuilt `lib/client.js`, so you do not need to run this project's build command first. GitHub installs follow the public `main` branch; use a local package or linked checkout for changes that have not been published there.

See the [official DSH plugin installation guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md) for the installation mechanism.

### Install a local package

From an existing source checkout, using Node.js 22 or later and npm:

```sh
npm run pack
dsh plugin --profile desktop add ./dist/dsh-workboard-0.1.0-beta-pre.tgz
```

`npm run pack` builds, checks and packages the plugin, verifies an installation in a temporary directory, and writes a SHA-256 checksum. For Web, replace `desktop` with `web`. Restart the corresponding instance after installation.

## Start from home

- **Open a board:** home lists every workspace board and standalone board, with its working directory and unarchived task counts. Search by name or directory, then open a card.
- **Create a board:** choose **New board** to create a standalone board without a working directory. Select the directory when sending its first AI task.
- **Return home:** choose **Back** in the board details or select the sidebar entry again. The board-title menu switches boards directly. Reloads and restarts begin at home.

Wide panels place boards and ideas side by side; narrower panels stack them. Card grids adapt to the available width. Icons come directly from DSH exports, and home-page buttons, inputs, editors, tooltips and dialogs use native DSH components, following the host's light/dark theme and Chinese/English setting.

### Review completions

The heatmap always displays the latest **52 weeks**, including the current week. Resizing changes square-cell sizes and gaps; ultrawide panels add equal margins around the centered grid. Month labels stay on one row, while the heading and explanatory text stay aligned with the page content edge.

Counts use the browser's local calendar:

- Creating a task as **Done**, or moving it into **Done** from another state, records a completion event.
- The same task counts once per day. It can count again on another day.
- Recording starts when this feature is enabled. Old task timestamps do not backfill history, and archiving or deleting a task preserves existing completion records.

Hover over a cell for its date and count. Arrow keys navigate dates; `Home` selects the first day and `End` selects today.

### Capture an idea

Notes are shared across all boards. They support six colors, multiline text, search, editing and deletion.

1. Write an idea on home, choose a color and select **Add note**, or press `⌘ / Ctrl + Enter`.
2. Use a saved note's edit button to change it. Edits save automatically after **600ms** of inactivity. The footer retains the update date and shows the save status.
3. Failed saves keep the draft and offer **Retry save**. Deletion requires confirmation.

Each note supports up to 4,000 characters. When browser storage is available, unsubmitted content and pending edits are kept as local drafts across reloads.

## Manage tasks on a board

Use a column's `+` to create a task in that status. The task editor has one content field: put the summary on the first line and details below. You can also set start and due dates, priority, tags, attachments and an assignee.

- Drag cards across columns or reorder them. Status menus in the task details and linked-task panel also move cards.
- Open a card to view its body, dates, attachments and linked conversation. Drag the divider between the board and details to resize the panel; double-click to reset it. The chosen width is remembered.
- Select or drop attachments. Images have a large preview and thumbnails; video, audio, text and other files open in the right-hand preview rail.

### Send a task to AI

Assign a task to **AI**, then select its send button. Choose a new conversation, the linked conversation, or an eligible current conversation in the same workspace. A standalone board asks for a working directory on its first send.

| Send mode | Task status |
| --- | --- |
| Discuss first | Sends the task content and preserves its current status |
| Execute directly | Moves a **To do** task to **Doing** after its message is queued |

The task body and attachments go to the selected conversation together. Users confirm completion on the board.

The linked-task button in the conversation header shows every unarchived task associated with that conversation. Change status, edit a task or jump to its board there; the panel's `+` creates and links a new task.

### Archive, restore and transfer tasks

Archive a task from its details in any status. The gear opens **Settings → Workboard**, where you can browse archived tasks by board, expand more entries, restore or delete them. Restoring returns a task to its original column and preserves the conversation link. The settings board list also supports renaming and creating boards.

Task JSON exports cover all boards. An import appends new tasks to the selected target board without replacing existing tasks. Attachment files, conversation links and archived state are not restored by import; notes and completion history are excluded from task JSON. Imported Done tasks count as completions on the import date.

## Store and back up data

| Data | Default location | Details |
| --- | --- | --- |
| Boards, tasks, notes and completion events | `$DSH_HOME/kanban/state.json` | `DSH_HOME` defaults to `~/.dsh` |
| Attachment files | `<workspace>/.dsh/assets/kanban/` | Filenames include the attachment ID and original name; falls back to the plugin data directory when no working directory is available |
| Attachment index | `$DSH_HOME/kanban/attachments/index.json` | Stores metadata and workspace references |
| Unsubmitted or pending note drafts | Browser `localStorage` | Uses `dsh-workboard:note-drafts`; drafts stay in memory only when browser storage is unavailable |

A full backup includes the plugin data directory and each workspace's attachment directory. Task JSON is for task transfer, not a full backup; browser drafts do not replace saved data either.

The plugin does not impose an attachment-count or per-file size cap. Uploads are still subject to its **256 MiB request-body limit** and DSH Connection limits. Add `.dsh/` to a workspace's `.gitignore` if those local files should stay out of Git.

To change the plugin data directory, override its configuration in the corresponding profile's `cordis.patch.yml`:

```yaml
- id: kanban
  config:
    dataDir: ~/Documents/kanban
```

Task and note writes use a serial queue and atomic file replacement. Plugin endpoints use DSH Connection's authenticated channel.

## Develop locally

From the plugin source root:

```sh
npm run build
dsh plugin --profile desktop add .
```

The checkout is linked into the profile. Rebuild and refresh after browser-source changes; reload the plugin or restart the instance after Host or manifest changes.

There are no third-party npm runtime dependencies. DSH supplies React and UI components.

| Command | Purpose |
| --- | --- |
| `npm run build` | Concatenate `src/client/parts/` into `lib/client.js` |
| `npm test` | Check storage, dispatch, completions and note saves |
| `npm run test:smoke` | Check Host routes and client UI entries |
| `npm run check` | Build, verify and run all tests |
| `npm run pack` | Run all checks, package, verify an isolated installation and generate a checksum |

`lib/client.js` is the prebuilt browser file shipped with the plugin. Regenerate and commit it with source changes. Generated files in `dist/` stay out of Git.

Read more: [Contributing](CONTRIBUTING.md) · [Architecture and data contracts](docs/ARCHITECTURE.md) · [Packaging and release](docs/RELEASING.md).

## License

[MIT](LICENSE)
