# 打包与发布 DSH Workboard

本项目采用 DeepSeek 官方的 **Bundle 插件**格式，发布单位是 npm 包或由
`npm pack` / `pnpm pack` 生成的 `.tgz`。GitHub 仓库保留预构建的浏览器入口，
供用户直接从 Git 安装。创建安装包与公开发布是两个步骤；`npm run pack` 只在本地打包和验证。

## 官方依据与项目约定

核对日期：2026-11-03。使用官方仓库的文档，而非第三方插件市场规则。

| 官方契约 | 本项目落点 |
| --- | --- |
| npm 包声明 `dsh.bundle.patch`，patch 按包名加载 | `package.json`、`cordis.patch.yml`、`index.js` |
| Bundle 不声明 profile；profile 由用户的 DSH 管理 | 包内没有 `dsh.profile` 或用户 profile 文件 |
| 通过 `engines.dsh` 声明支持范围 | `>=0.2.1-rc.5 <0.3.0`；实测版本为 `0.2.1-rc.5` |
| Web 半声明 `dsh.client` 并导出预构建的 `./client` | `lib/client.js`，模块 id 与包名一致 |
| `locale/<language>.json` 的 `meta.detail` 指向包内 Markdown | 中文 `README.md`，英文 `README.en.md` |
| 安装到 profile 后验证组合配置 | `dsh --profile <name> --dump-config` |

来源：

- [官方：打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)
- [官方：Client 模块声明与加载](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/client-modules.zh.md)
- [官方：插件详细介绍文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/util/plugin-detail/README.zh.md#document-order)
- [官方：插件索引与发现](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-market/README.zh.md)

官方没有要求第三方 JavaScript 插件复制 DSH 的 monorepo 布局，或必须改用
TypeScript。这里的 `docs/`、`scripts/`、`test/`、`dist/` 分工是本项目的维护约定。
Host 只导入 Node 内置模块和相对文件，因此没有需声明为 peer 的 DSH Node 包；
React 和 UI 原语由宿主浏览器模块表提供，不在安装包里复制一份。

## 目录与发布内容

```text
dsh-workboard/             # 公开仓库建议名称；现有本地 checkout 仍名为 kanban
├── package.json           # 包名、版本、导出、files 和 dsh manifest
├── cordis.patch.yml       # 按 dsh-workboard 包名挂载 Host
├── index.js               # Host 入口
├── host/                  # 无需编译的 Host JavaScript
├── src/client/parts/      # 浏览器开发源码，不进安装包
├── lib/client.js          # 浏览器构建产物，提交 Git 且进入安装包
├── icon.svg
├── locale/                # zh/en 元数据与详细介绍入口
├── docs/                  # 架构与发布说明
├── scripts/               # 构建与验证，不进安装包
├── test/                  # 自动化测试，不进安装包
├── .github/workflows/     # CI，不进安装包
├── README.md, README.en.md
├── CONTRIBUTING.md, CHANGELOG.md, LICENSE
└── dist/                  # 本地 .tgz 与 .sha256，不提交 Git
```

`package.json.files` 明确列出 Host 文件、浏览器产物、图标、本地化和文档。
用户状态、附件、会话、环境变量文件及测试产物不属于插件发布目录。
现有桌面 profile 以链接指向开发目录，整理时保留该目录路径及运行入口。

## 生成并验证安装包

在插件根目录执行，要求 Node.js >= 22 和 npm。当前项目没有第三方依赖，
无需先执行 `npm install`：

```sh
npm run pack
```

执行顺序为：

1. `npm run pack` 先执行 `prepack`，运行完整的 `npm run check`：构建、静态校验、单元测试及两类冒烟检查。
2. 将允许发布的文件打成 `dist/dsh-workboard-0.1.0-beta-pre.tgz`。
3. 在临时消费项目里离线安装这个 `.tgz`，禁用安装生命周期脚本。
4. 对安装后的文件再次校验 manifest、入口导出、本地化、全部 Host 路由和浏览器界面入口。
5. 生成同名 `.tgz.sha256`，删除临时消费项目。

版本来自 `package.json`，版本变更后输出文件名会随之变化。`dist/` 不进入 Git。
`npm pack` 和 `pnpm pack` 也能生成标准安装包并触发 `prepack`；要执行安装后检查和
生成校验文件，使用上面的 `npm run pack`。

检查生成文件：

```sh
tar -tzf dist/dsh-workboard-0.1.0-beta-pre.tgz
cd dist
shasum -a 256 -c dsh-workboard-0.1.0-beta-pre.tgz.sha256
```

## 在 DSH 中验收

使用已安装的 DSH CLI，把安装包加入用于验收的 profile：

```sh
dsh plugin --profile workboard-release-check add ./dist/dsh-workboard-0.1.0-beta-pre.tgz
dsh --profile workboard-release-check --dump-config
```

组合配置中应出现 `dsh-workboard` 层及 `id: kanban` / `name: dsh-workboard` 行。
新建的 CLI profile 默认基于 base，完整界面验收还需要 Web 或 Desktop 组合。
在专用 Web/Desktop profile 安装后，检查工作看板、设置、任务创建与编辑、附件、
状态移动、归档恢复、会话关联及发送流程。静态检查和假宿主冒烟不等于真实模型回复验收。
重新执行收费模型测试前，应确认本次测试的授权范围。

## 公开发布

### GitHub

1. 确认仓库地址、所有者、版本和变更记录。当前元数据指向 `Kamigs/dsh-workboard`；
   元数据本身不表示该仓库已经创建或公开。
2. 运行 `npm run pack`；检查 `git diff --exit-code lib/client.js`，确认构建产物已提交。
3. 将验证后的提交发布到公开仓库。保持包根目录直接位于仓库根，提交 `lib/client.js`。
4. 创建与版本对应的 tag / GitHub Release，附件上传 `.tgz` 与 `.tgz.sha256`。
   安装文档可以给出固定 tag 或完整 commit 的 Git 来源。

仓库已有预构建的 JavaScript，不需要 `prepare`。如果未来改为只分发需要编译的源码，
必须按官方说明提供自包含 `prepare`，并说明 pnpm 的构建授权要求。

### npm（可选渠道）

先确认 npm 包名可用、账号具备发布权限、版本尚未使用，并将已完成的变更归入相应版本。
再发布已经验证的安装包。当前预发布版本使用 `beta-pre` 分发标签：

```sh
npm publish ./dist/dsh-workboard-0.1.0-beta-pre.tgz --tag beta-pre --access public
```

该命令会公开上传包，不能用来代替本地打包检查。已有版本不能覆盖。
发布后用精确版本在干净 profile 中安装验证，再更新安装说明。

### 插件发现

DSH 的「发现」读取用户配置的插件索引。发布 GitHub 或 npm 包并不自动代表进入
官方内置列表；是否加入某个社区索引，遵循该索引自己的收录流程。
