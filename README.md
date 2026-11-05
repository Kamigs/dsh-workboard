# DSH Workboard · 工作看板

[![CI](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

在 DeepSeek Harness（DSH）中管理任务、查看完成记录、记录灵感，并将 AI 任务发送到会话中讨论或执行。

左侧栏的「工作看板」打开首页，集中展示所有看板、年度完成热力图和灵感便签。点击看板卡片，进入「待办 / 进行中 / 已完成」三栏详情；任务与 DSH 会话可以互相跳转。

[English](README.en.md) · [GitHub 仓库](https://github.com/Kamigs/dsh-workboard) · [更新日志](CHANGELOG.md)

## 安装

已在 DSH `0.2.1-rc.5` 的 Desktop / Web profile 中验证。插件声明的兼容范围为 `>=0.2.1-rc.5 <0.3.0`；其他版本需另行验证。

### 从 GitHub 安装

已安装 `dsh` CLI 后，将插件加入你实际使用的 profile。

**Desktop：**

```sh
dsh plugin --profile desktop add github:Kamigs/dsh-workboard
```

**Web：**

```sh
dsh plugin --profile web add github:Kamigs/dsh-workboard
```

安装后重启对应的 DSH 实例，左侧栏即可进入「工作看板」。如果你使用了自定义 profile，请替换命令中的 `desktop` 或 `web`。

安装来源为 [Kamigs/dsh-workboard 的 main 分支](https://github.com/Kamigs/dsh-workboard/tree/main)。仓库包含预构建的 `lib/client.js`，无需先运行本项目的构建命令。GitHub 安装以公开 `main` 为准；尚未同步到 GitHub 的本地修改，可通过下面的安装包或开发目录加载。

安装机制见 [DSH 官方插件安装说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)。

### 从本地安装包安装

在已获取的源码根目录执行，需要 Node.js 22 或更高版本及 npm：

```sh
npm run pack
dsh plugin --profile desktop add ./dist/dsh-workboard-0.1.0-beta-pre.tgz
```

`npm run pack` 会构建、检查、打包，并在临时目录验证安装后的文件，同时生成 SHA-256 校验文件。Web 用户将 `desktop` 替换为 `web`，安装后重启对应实例。

## 从首页开始

- **打开看板**：首页列出所有工作区看板和独立看板，展示工作目录及各状态的未归档任务数。可按名称或目录搜索，点击卡片进入详情。
- **新建看板**：点击「新建看板」即可创建独立看板，无需先绑定工作目录。首次发送其中的 AI 任务时再选择目录。
- **返回首页**：详情页点击「返回」，或再次点击侧栏入口。看板标题菜单可直接切换看板；刷新或重启后从首页开始。

宽屏下，看板列表与灵感便签左右排列；窗口缩窄后上下排列，卡片数量随可用宽度调整。图标直接引用 DSH 导出，首页的按钮、输入框、编辑器、提示和弹窗复用 DSH UI 组件，跟随宿主的明暗主题与中英文设置。

### 查看完成记录

热力图始终显示包含本周在内的最近 **52 周**。窗口宽度只影响方格和间距；超宽屏增加两侧留白，让网格居中。月份保持同一行，标题和说明与页面内容边缘对齐。

完成记录按浏览器本地日期统计：

- 新建为「已完成」的任务，或从其他状态进入「已完成」的任务，会记录一次完成事件。
- 同一任务在同一天重复完成只计一次，不同日期可分别计数。
- 记录从启用此功能时开始，旧任务不会根据更新时间回填历史；归档或删除任务仍保留已有完成记录。

悬停方格可查看日期与完成数量，也可用方向键浏览，`Home` 跳到首日，`End` 跳到今天。

### 记录灵感

便签在所有看板间共享，提供六种颜色，支持多行输入、搜索、编辑和删除。

1. 在首页输入想法并选择颜色，点击「添加便签」，或按 `⌘ / Ctrl + Enter` 提交。
2. 点击已保存便签的编辑按钮修改内容，停止输入 **600ms** 后自动保存。页脚保留更新时间，并显示保存状态。
3. 保存失败时，草稿会保留，可点击「重试保存」。删除便签前需要确认。

每张便签最多 4000 字。浏览器存储可用时，未提交内容和待保存编辑会保存在本地草稿中，刷新后可继续处理。

## 在看板中管理任务

点击页面右上角的「新建任务」，在待办栏创建任务。编辑器使用一个「任务内容」输入框：第一行概括任务，后续补充细节；还可设置开始日期、截止日期、紧急程度、标签、附件和负责人。

- 拖动卡片可跨列移动或调整顺序，也可通过任务详情、会话关联任务面板中的状态菜单修改状态。
- 按住 `Ctrl / ⌘` 点击卡片可增减选择，`Shift` 点击可连续选择，`Ctrl / ⌘ + Shift` 点击可追加一段选择。选中的卡片可一起拖动；按 `Esc` 或点击看板空白处清除选择。
- 点击卡片打开详情，查看正文、日期、附件和关联会话。拖动看板与详情之间的分隔条调整宽度，双击复位；宽度会保留到下次打开。
- 附件支持文件选择和拖入。图片可查看大图与缩略图，视频、音频、文本等文件在右侧预览栏打开。

### 将任务发送给 AI

把负责人设为 **AI** 后，点击卡片上的发送按钮，选择新建会话、已关联会话，或同一工作区内可用的当前会话。独立看板在首次发送时选择工作目录。

| 发送方式 | 任务状态 |
| --- | --- |
| 先讨论 | 发送任务内容，保留当前状态 |
| 直接执行 | 消息入队后，将「待办」任务移到「进行中」 |

任务正文及附件会一并发送到目标会话。是否完成由用户在看板中确认。

会话右上角的关联任务按钮可查看该会话的所有未归档任务，支持修改状态、编辑和跳转到看板；面板中的 `+` 可新建并关联任务。

### 归档、恢复与导入导出

任意状态的任务都可从详情中归档。点击齿轮进入「设置 → 工作看板」，可按看板查看归档任务、展开更多记录、恢复或删除。恢复后任务回到原列，并保留会话关联。设置中的看板列表也支持改名和新建看板。

任务 JSON 导出覆盖所有看板；导入时选择目标看板，以新建任务的方式追加，不覆盖已有任务。附件文件、会话关联和归档状态不会随导入恢复，便签与完成历史也不在任务 JSON 中。导入的已完成任务计入导入当天的完成记录。

## 数据保存与备份

| 数据 | 默认位置 | 说明 |
| --- | --- | --- |
| 看板、任务、便签、完成事件 | `$DSH_HOME/kanban/state.json` | `DSH_HOME` 未设置时使用 `~/.dsh` |
| 附件文件 | `<工作区>/.dsh/assets/kanban/` | 文件名包含附件 ID 和原文件名；没有可用工作目录时回退到插件数据目录 |
| 附件索引 | `$DSH_HOME/kanban/attachments/index.json` | 保存附件元数据与工作区引用 |
| 未提交或待保存的便签草稿 | 浏览器 `localStorage` | 键为 `dsh-workboard:note-drafts`，浏览器存储不可用时只保留内存草稿 |

完整备份应包含插件数据目录和各工作区的附件目录。任务 JSON 用于任务迁移，不代替完整备份；浏览器草稿也不代替已保存数据。

插件不设置附件数量或单文件大小上限，但上传受 **256 MiB 请求体上限**及 DSH Connection 的限制影响。若不希望工作区的 `.dsh/` 进入 Git，可在该项目的 `.gitignore` 中忽略它。

如需更改插件数据目录，在对应 profile 的 `cordis.patch.yml` 中覆盖配置：

```yaml
- id: kanban
  config:
    dataDir: ~/Documents/kanban
```

任务和便签写入采用串行队列与原子文件替换。插件接口沿用 DSH Connection 的认证通道。

## 本地开发

在插件源码根目录执行：

```sh
npm run build
dsh plugin --profile desktop add .
```

本地目录以链接方式加载。修改浏览器源码后重新构建并刷新；修改 Host 代码或 manifest 后，重新加载插件或重启对应实例。

项目无第三方 npm 运行依赖，React 和 UI 组件由 DSH 宿主提供。

| 命令 | 用途 |
| --- | --- |
| `npm run build` | 将 `src/client/parts/` 拼接为 `lib/client.js` |
| `npm test` | 验证存储、任务发送、完成记录与便签保存 |
| `npm run test:smoke` | 验证 Host 路由和客户端界面入口 |
| `npm run check` | 构建、静态校验及全部测试 |
| `npm run pack` | 全部检查、打包、隔离安装验证与校验文件生成 |

`lib/client.js` 是随插件分发的预构建文件，修改源码后需重新生成并一同提交。`dist/` 为生成目录，不提交 Git。

更多信息：[贡献指南](CONTRIBUTING.md) · [架构与数据契约](docs/ARCHITECTURE.md) · [打包发布](docs/RELEASING.md)。

## 许可证

[MIT](LICENSE)
