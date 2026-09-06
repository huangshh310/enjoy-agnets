# spec/workspace

> 工作区是 Agent 的磁盘边界。最后更新：2026-09-06

## 当前真相

打开文件夹后，main 记下 `rootPath`，写入 `workspaces` 表。所有相对路径相对该根；工具与 `readFile` / `listDir` / `diff` / `changes` 不得逃出根目录。

当前能力：

- 打开 / 列出 / 移除工作区；创建弹窗先 `workspace.pickFolder` 只选路径，点「创建项目」才 `workspace.open({ path, name })` 写入 `workspaces` 表。`workspace.remove` 只删应用档案与该项目下会话，不删磁盘文件夹。
- 会话可归档：`session.archive` 后侧栏不再显示，设置 `#/settings/archived` 可恢复或删除。工作区目录管理在 `#/settings/workspace`（旧 `#/workspaces` redirect）。
- 列目录、读文件（`workspace.readFile` 必须 jail，禁止根外绝对路径直读）
- Git 变更列表 + 单文件 diff（Review 栏作用域：上一轮 / 未提交 / 未暂存 / 已暂存 / 分支；porcelain 保留 XY）
- 线性 Git 提交列表 + 用户快捷提交 / 推送 / 复制 patch / 改动条撤销（`workspace.gitLog` / `gitCommit` / `gitPush` / `gitPatch` / `gitRestore`）
- 工作区绑定的 pty 终端（`terminal.open` / `write` / `close`）

Agent 写盘与 bash 不走 renderer：审批通过后由 workspace host / `command.ts` 在 main 执行。bash 的 cwd 锁在工作区，输出截断，Windows 下 `windowsHide: true`。

右侧栏视图（Inspector 检查器）：Context / Review / Files / Terminal / Browser。Review 栏对齐 Codex 审查工作台，提交历史是线性 log 不是拓扑图：
- 顶层控制栏：6 大审查作用域（上一轮 `last-turn`、未提交 `uncommitted`、未暂存 `unstaged`、已暂存 `staged`、已提交 `commits`、分支 `branch`）；全局 `+N -M`；分支对比副行（**真实上游** `@{upstream}` → 当前分支，上游失败显示「无上游」，禁止写死 `main`）；`...` 更多（自动换行、隐藏空白、文字级差异、折叠大文件、复制完整 patch）；展开/折叠全部差异；Ctrl+P / ⌘P 跳文件；文件树开关；「提交或推送」。
- 变更工作台：默认 **左当前文件满高 FileDiff、右文件树**（对齐 Codex）。树宽可拖（`enjoy-agents-review-tree-split`，最小 140px，默认 200px，最大 50%）。无选中自动打开第一项。提交底栏贴底：输入框右上角 sparkle 用当前模型 `ai.generate` kind=`completion` 根据 patch 填 Conventional Commit 说明（renderer 不碰密钥）；提交/推送收到芯片行，推送用 ghost，禁止再竖排两颗大按钮。「展开全部差异」才用 compact 卡片叠放（禁止 `fill`）。`FileDiff` 的 `fill` 只给单文件主区。
- 提交历史：`git log` 线性列表 + 单轨竖线。没有 parent 图，禁止用 index 伪装多色车道。没有远程 PR / CI。空仓库空态，禁止 mock 提交。
Context 双模式：仪表盘 / 原始载荷。仪表盘画 Token 视窗（用量：消息字符、工作区规则正文、已连 MCP 的 name+description、skills description、启用芯片的 snippet，按 3.8 字/token 折算；**上限**取当前模型 `contextWindow`：探测目录 > Gateway `/v1/models` > 档案手填，禁止按 modelId 静态表猜，未知则「— / 窗口未知」）、会话压缩卡片（展示压缩状态、**压缩前/后 Tokens**、节省量、事实摘要与再次压缩/清除；未压缩态不编造预计节省）、有遥测或 `thoughtSeconds` 才画的单轮耗时、挂载芯片（可临时排除）、本轮 sources/tools、模型底栏。输入框底栏状态栏配备手动压缩按钮，支持一键触发当前会话上下文压缩并即时联动看板。原始载荷走 `agent.inspectPrompt`：已压缩会话将较早历史替换为一条 `[CONVERSATION SUMMARY]`（不插虚构助手句）；有本会话泵时快照且 `capturedAt >= compactedAt` 则标「本轮实发」；压缩后快照过期则回落 preview。preview 为库内消息 `toModelMessages` + 当前模式系统提示词，不落库。

Files 视图是 **左树右预览**。树与预览之间有可拖拽分隔条（`react-resizable-panels`，热区 12px，`cursor-col-resize`）：

- 默认树宽 240px，最小 160px，最大占 Files 栏 55%
- 布局写入 `localStorage` 键 `enjoy-agents-files-tree-split`
- 顶栏文件夹按钮在路径左侧，可整栏收起树（收起后只留预览）
- 这是改宽，不是把文件拖进文件夹。文件移动 / 拖拽重组另开能力，未做。

## 不变量

- 路径必须规范化并限制在 `rootPath` 内（`..` 逃逸视为错误）。
- renderer 不直接 `fs`，不拼用户磁盘绝对路径当秘密通道。
- `git_commit` 与写文件一样默认要审批。
- 代码编辑器必须是本地视图，禁止 Monaco CDN「Loading…」空洞。

## 代码入口

- 工作区档案：`apps/desktop/src/main/services/workspace.ts`
- host（读写 / glob / grep / bash）：`workspace-host.ts`
- Git 变更 / diff / 线性 log / 提交 / 上游 / patch / 撤销：`workspace-git.ts`、`workspace-git-status.ts`、`workspace-git-log.ts`、`workspace-git-remote.ts`、`workspace-git-restore.ts`
- 命令执行：`apps/desktop/src/main/services/command.ts`
- 终端：`apps/desktop/src/main/services/terminal.ts`
- 右侧栏：`apps/desktop/src/renderer/src/components/ai-chat/right-pane/`

## 已知坑

- `packages/editor` 已在仓里，但主路径仍是 Changes / 文件 diff 卡片，不是完整 IDE 编辑器。文档不要写成「已经有完整 Monaco 工作区」。
- 文件监视、PR / 远程 / 提交拓扑图仍是后续。MCP / Knowledge / 资产导出已有路由，sidebar 必须 `navigate`，不能 no-op。
- 资产导出与知识库路径同样不得逃出 `rootPath`。
- 创建项目弹窗选文件夹必须走 `workspace.pickFolder`，不要 `workspace.open`，否则未点创建也会写入 `workspaces`。换目录时项目名称按「未手改则跟随新 basename」更新；创建时把 `projectName` 传给 `open.name`。
- Git 当前分支来自 `git branch --show-current`。上游来自 `rev-parse --abbrev-ref @{upstream}`。失败返回空串，UI 显示「未检出分支」/「无上游」，禁止回落 `main`。
- 用户点 Review 提交：`requireCommitApproval`（默认开）时弹 `ConfirmDialog` 列出改动数量与说明，再调 `workspace.gitCommit`。Agent `git_commit` 仍走 HMAC。空工作树 main 直接拒。推送走 `workspace.gitPush`，无上游即拒。
- Review 主区出现横向空条纹：把全部 changed files 展开成 `FileDiff` 卡片流，且组件用 `flex-1` + `max-h-full`。滚动列给不出确定高度，diff 行塌成发丝。默认只渲染当前文件并 `fill`；叠放时必须 `compact`，禁止 `fill`。
- 右栏 tab 用 `hidden` 保活，不卸载。审查栏若订整份 `messages`、绑全局 `Ctrl+P`/`Ctrl+Enter`、或每次渲染 `parseUnifiedDiff`，流式输出会拖死整窗。隐藏时 `active=false`：不订 messages、不听快捷键、不发 `gitLog`。`Ctrl+P` 仍是打开 Files，不要截走。分支对比才拉 `upstream...HEAD`。
- 移除项目不是删文件夹。归档不是删除；永久删除走 `session.delete` / `session.deleteArchived`。
- Context 检查器禁止 Fake-Status-Chrome：不要写死 RAG 相似度、Prompt Cache %、HMAC 空闲守卫、3200 系统 token 地板，或未压缩卡 `usedTokens * 0.6` 的预计节省。`CitedSource` 没有 score；`TelemetryMetric` 没有 cache 字段。
- 会话芯片 `takeSessionContextChips` 只取走 `enabled !== false` 的项。排除芯片必须留在队列，否则发送后无法再点亮。
- `agent.inspectPrompt` 的 last-run 快照只在 main 进程内存，按 sessionId 覆盖。重启后回落 preview，不要写成已落库。压缩会 `clearInspectPromptSnapshot`；若快照仍在但早于 `compactedAt`，也走 preview。本机 ToolLoop 的 instructions 不含 `customInstructions`。
