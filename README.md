# DSH Workboard · 任务看板

[![CI](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Kamigs/dsh-workboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个 DeepSeek Harness（DSH）插件：在左侧栏增加「任务看板」，**每个工作区是一块独立看板**，
三栏（待办 / 进行中 / 已完成）常驻；任务带日期、紧急程度、标签、附件、指派（AI 或当前登录账号）。
AI 任务可以发到会话里讨论或执行，卡片与会话互相跳转。归档任务时，关联会话也会一起归档。

[English](README.en.md) · [架构说明](ARCHITECTURE.md) · [更新日志](CHANGELOG.md)

## 功能

- **左侧栏入口 + 中央看板面板**：沿用 DSH 的 sidebar panel / main panel 机制，图标与面板样式跟随宿主。
- **工作区即看板**：切换工作区即切换看板；可新建项目（选择目录 → 创建 DSH 工作区）。
- **三栏常驻**：待办（灰）/ 进行中（蓝）/ 已完成（绿）；空栏只显示栏内占位，不会把三栏换成整页空状态。
  卡片支持拖拽跨栏、拖到卡片前后插入排序。
- **完整任务字段**：标题、描述、状态、开始日期、截止日期、紧急程度（低/中/高/紧急）、标签、附件（存在工作区 `.dsh/assets/kanban`，不限大小）、指派、执行会话。
- **任务详情栏**：看板右侧常驻详情单（与三栏不同的 UI 形式），展示字段、描述、标签、附件、会话与操作；
  图片附件显示大图 + 全部附件缩略图，视频 / 音频 / 文本 / 其他文件在右侧预览栏打开。
- **发送任务**。点击 AI 卡片的发送箭头，选择新建会话、已关联会话或同工作区可用的当前会话。「先讨论」保留任务状态，「直接执行」在消息入队后将待办移到进行中。完成由用户在看板上确认。
- **关联任务面板**。有关联任务时，会话右上角显示列表按钮。点击可展开或收起面板，查看任务状态，选择任务可回到对应卡片。
- **归档**。任意状态的任务都可以从详情区归档。恢复后，卡片回到原列，关联会话也随之恢复。
- **数据导入导出**：标题栏右上角「数据」按钮 —— 导出全部任务为 JSON；也可把 JSON 导入到当前项目（新建任务，不覆盖已有数据；附件文件、会话与归档状态不随导出迁移）。
- **可调宽度**：看板与详情之间有垂直拖动手柄，宽度会记住（localStorage，刷新/重开面板后保持），双击复位；上限随窗口自适应，保证三栏不被挤扁。
- **与 DSH 一致**：使用 DSH 图标集（16px `currentColor` 线性图标）、`--dsw-*` 设计令牌、亮/暗主题、中英文案。

## 环境要求

- DeepSeek Harness `0.2.1-rc.5`（Desktop / Web profile）已实测；更早或更新的版本如缺少
  `sidebar.panellist` / `main` slot 或 `connection.fetch` 服务，插件会保持未激活。
- 运行不需要构建工具；只有开发时需要 Node.js >= 22。

## 安装

浏览器产物 `lib/client.js` 已随仓库提交，安装时不需要执行任何构建脚本。

### 方式一：从 GitHub 安装（推荐）

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile <profile> add github:Kamigs/dsh-workboard
```

安装完成后重启该 profile；左侧栏会出现看板图标。

### 方式二：本地目录（开发调试）

```sh
git clone https://github.com/Kamigs/dsh-workboard.git
cd dsh-workboard
npm run build          # 重新生成 lib/client.js（可选）
```

然后在 Harness 里用插件管理器安装这个目录的绝对路径：

```
plugin_manager action=install_bundle target=/absolute/path/to/dsh-workboard
```

本地目录以链接方式安装，改完源码执行 `npm run build` 后刷新页面即可。

### 方式三：npm（若已发布到 npm）

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile <profile> add dsh-workboard
```

## 使用

1. 点左侧栏的看板图标进入「任务看板」。
2. 顶部选择工作区；还没有项目时点 `+` 新建项目（选择目录，可改名）。
3. `新建任务`（或每栏头的 `+`）在「任务内容」第一行概括任务，下面补充细节，再填写状态、日期、紧急程度、标签、附件、指派。
4. 指派选 **AI** 的任务，卡片右下角出现蓝色圆形发送按钮，点击后选择目标和发送方式。
5. 点击卡片在看板右侧查看详情；图片直接预览，其他附件在右侧预览栏打开。
6. 点击详情底部的「归档任务」。从看板顶部打开「查看归档任务」，可恢复或删除任务。
7. 右上角「数据」按钮：`导出数据` 下载 JSON；`导入数据` 选择 JSON 后确认导入到当前项目。

## 数据与配置

- 任务数据：`$DSH_HOME/kanban/state.json`（`DSH_HOME` 缺省为 `~/.dsh`）。
- 附件：默认存放在**任务所属工作区**的 `<工作区>/.dsh/assets/kanban/` 下（文件名 `<附件 id>-<原名>`），
  插件数据目录里的 `attachments/index.json` 只记录名称 / 类型 / 大小与工作区引用；旧数据仍兼容读取。
  附件**没有大小限制**（请求体上限 256 MiB，DSH Connection 自身还有一层请求体限制）。
  如果不想让 `.dsh/` 进入项目版本库，记得在项目根 `.gitignore` 里忽略它。
- 写入是串行的：同目录临时文件 + `fsync` + `rename` 原子发布；损坏的状态文件会被备份为
  `state.json.corrupt-<时间戳>`，插件以空看板启动而不是启动失败。
- 可选配置：在 profile 的 `cordis.patch.yml` 覆盖 `kanban` 行的 `config.dataDir`：

  ```yaml
  - id: kanban
    config:
      dataDir: ~/Documents/kanban
  ```

- 任务与附件都只存在本机；插件的 HTTP 接口挂在 DSH Connection 的 `/api` 认证通道下，
  仅接受本机已登录的浏览器会话。

## 开发

```sh
npm run build     # 拼接 src/client/parts -> lib/client.js
npm test          # Host 存储单元测试（11 项）
npm run test:smoke  # Host 路由端到端 + 浏览器半渲染冒烟（无需浏览器）
npm run check     # 以上全部 + 静态校验
```

详见 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 项目结构

```
index.js                  Host 插件入口（注入 connection / workspaceRegistry）
host/store.js             任务模型、校验、原子持久化、附件
host/routes.js            /api/kanban.* 认证 JSON 接口
lib/client.js             构建产物：浏览器包（提交在仓库里）
src/client/parts/*.js     浏览器源码分段，按序拼进同一个 factory 作用域
scripts/                  构建、静态校验、Host 路由冒烟、浏览器半渲染冒烟
test/                     Host 存储单元测试
locale/                   插件面板展示用的中英文元数据
icon.svg, cordis.patch.yml
```

## 说明

- 发送弹窗和会话任务面板直接使用 Harness 提供的 UI 组件和图标。
- 登录账号信息通过可选的 `ctx.remote.account.getProfile` 读取；未登录或该 remote 不可用时，
  负责人自动降级为普通「人工」，不影响其它功能。

## 许可证

[MIT](LICENSE)
