# spec/workspace

> 工作区是 Agent 的磁盘边界。最后更新：2026-09-24

## 当前真相

打开文件夹后，main 记下 `rootPath`，写入 `workspaces` 表。`kind=local` 时所有相对路径相对该根；`kind=ssh` 时 jail 在 `remote_path`，host 走 SSH 适配器（见 [`remote`](./remote.md)）。工具与 `readFile` / `listDir` / `diff` / `changes` 不得逃出根。

当前能力：

- 打开 / 列出 / 移除工作区。创建弹窗第一步选本地 / 远程。本地：先 `workspace.pickFolder` 只选路径，点「创建项目」才 `workspace.open({ path, name })`。远程：选已存主机或手填 SSH 字段 + **已有**远端路径，点「连接」走 `workspace.openSsh` + `connect`，不 `mkdir`、不调本机 `pickFolder`。`workspace.remove` 只删应用档案与该项目下会话，不删磁盘文件夹。
- 会话可归档：`session.archive` 后侧栏不再显示，设置 `#/settings/archived` 可恢复或删除。工作区目录管理在 `#/settings/workspace`（旧 `#/workspaces` redirect）。
- 列目录、读文件（`workspace.readFile` 必须 jail，禁止根外绝对路径直读）
- Git 变更列表 + 单文件 diff（Review 栏作用域：上一轮 / 未提交 / 未暂存 / 已暂存 / 分支；porcelain 保留 XY）
- 线性 Git 提交列表 + 用户快捷提交 / 推送 / 复制 patch / 改动条撤销 / 按文件暂存 / **底栏切分支**（`workspace.gitLog` / `gitCommit` / `gitPush` / `gitPatch` / `gitRestore` / `gitStage` / `gitBranches` / `gitSwitch`）
- 底栏项目选择：已打开工作区列表 + 添加项目（`workspace.list` / `open` / `pickFolder`），对标 Synara ProjectPicker，不扫整个家目录
- Agent host 只读 `gitStatus` / `gitDiff` / `gitLog`（porcelain 文本，默认 20 条、上限 100，path jail）；写 `gitCommit`（默认不 `add -A`）/ `gitBranch` / `gitPush` 走 Git 审批。Agent `git_log` **不是** Review 栏 structured `commits[]`
- Agent `bash`：cwd 锁工作区、禁 shell 包装器、默认禁网二进制。macOS 再套 Seatbelt（写盘限工作区 + tmp）。不要把字符串过滤写成「沙箱已隔离」。
- 写盘检查点列表与还原（`workspace.listCheckpoints` / `previewCheckpoint` / `restoreCheckpoint`）：Review 第 7 个作用域 `checkpoints`。每轮开流记 `kind=baseline`（commit subject 带 session/run）。Enjoy Local 写盘与 ACP `file.changed` 记 `kind=turn`。列表项可带 `sessionId` / `runId` / `kind`；旧检查点没有这些字段。助手气泡下「本轮改动」按目录两级树，点开审查。用户气泡「从这里重来」只给 Enjoy Local：先还原该轮 baseline（失败则停），再截对话；不移动 HEAD。ACP 不能 rewind CLI 上下文，按钮禁用。
- 工作区绑定的 pty 终端（`terminal.open` / `write` / `resize` / `close`）：main `node-pty`，renderer `@xterm/xterm` + FitAddon。原始按键进 PTY，不按行补 `\n`。这是工作区壳，不是 M4 ACP PTY 登录兜底。
- 完成条「在浏览器打开」（`workspace.openPreview`）：工作区 `*.html` 转 `file://`，或本会话本机预览 URL，经 `shell.openExternal` 打开系统浏览器。不嵌右栏 Browser，不起 dev server。

Agent 写盘与 bash 不走 renderer：审批通过后由 workspace host / `command.ts` 在 main 执行。bash 的 cwd 锁在工作区，模型侧输出按头尾截断（见 [agent-runtime](./agent-runtime.md)），Windows 下 `windowsHide: true`。`writeFile` / `editFile` 成功后记 `refs/enjoy/checkpoints/<stamp>`（临时 `GIT_INDEX_FILE` + `commit-tree`，含未跟踪新文件），**不**改用户当前分支、不碰工作区 index、不自动 `git commit`。非仓库、或 `.git` 落在工作区外（嵌在别人的仓库里）则跳过。

右侧栏视图（Inspector 检查器）：Context / Review / Files / Terminal / Browser。Review 栏对齐 Codex 审查工作台，提交历史是线性 log 不是拓扑图：
- 顶层控制栏：7 个审查作用域（上一轮 `last-turn`、未提交 `uncommitted`、未暂存 `unstaged`、已暂存 `staged`、已提交 `commits`、分支 `branch`、检查点 `checkpoints`）；全局 `+N -M`；分支对比副行（**真实上游** `@{upstream}` → 当前分支，上游失败显示「无上游」，禁止写死 `main`）；`...` 更多（自动换行、隐藏空白、文字级差异、折叠大文件、复制完整 patch）；展开/折叠全部差异；Ctrl+P / ⌘P 跳文件；文件树开关；「提交或推送」只在改动作用域（检查点 / 提交历史不画这颗主 CTA）。`checkpoints` 只列 `refs/enjoy/checkpoints/*`，不走 diff 流。空态贴顶短文，禁止居中大图标。还原先 `previewCheckpoint` 列出快照外未跟踪文件，ConfirmDialog 写明**不移动 HEAD / 不是分支回退**，有未跟踪删除必须显式确认；真正还原用临时 `GIT_INDEX_FILE` + `checkout-index`，不改用户暂存区。成功后**留在检查点时间线**，禁止偷切「未提交」。未暂存 / 已暂存文件树可按文件 `+` 暂存 / `−` 取消暂存（`workspace.gitStage`）。Review 底栏提交默认 `stageAll: false`，只提交已暂存；无已暂存则禁用，文案「提交已暂存」。Agent `git_commit` 同样默认 staged-only，`stageAll: true` 才 `add -A`。
- 变更工作台：默认 **左当前文件满高 FileDiff、右文件树**（对齐 Codex）。树宽可拖（`enjoy-agents-review-tree-split`，最小 140px，默认 200px，最大 50%）。无选中自动打开第一项。提交底栏贴底：输入框右上角 sparkle 用当前模型 `ai.generate` kind=`completion` 根据 patch 填 Conventional Commit 说明（renderer 不碰密钥）；提交/推送收到芯片行，推送用 ghost，禁止再竖排两颗大按钮。「展开全部差异」才用 compact 卡片叠放（禁止 `fill`）。`FileDiff` 的 `fill` 只给单文件主区。
- 提交历史：`git log` 线性列表 + 单轨竖线。没有 parent 图，禁止用 index 伪装多色车道。没有远程 PR / CI。空仓库空态，禁止 mock 提交。
Context 双模式：仪表盘 / 原始载荷。仪表盘画 Token 视窗（用量：消息字符、常驻规则拼装、已连 MCP 的 name+description、技能索引（`formatSkillCatalog`，不含 SKILL.md 正文）、启用芯片的 snippet，按 3.8 字/token 折算；**上限**取当前模型 `contextWindow`：ACP `usage_update.size` > 探测目录 > Gateway `/v1/models` > 档案手填 > 厂商价目表家族（`deepseek-flash` 为 1M），价目表没有的 id 不猜，未知则「— / 窗口未知」）。Limits 卡 / SessionMeter / Context **共用** `estimateContextWindowStats`，按当前 `runtimeId` 投影：ACP / 沙箱不计 Enjoy 常驻规则；`hostMcp` / `hostSkills` 为透传或索引时计入宿主 MCP 与技能桶。禁止 720 / 260 假地板。会话压缩卡片（展示压缩状态、**压缩前/后 Tokens**、节省量、事实摘要与再次压缩/清除；未压缩态不编造预计节省）、有遥测或 `thoughtSeconds` 才画的单轮耗时、挂载芯片（可临时排除）、本轮 sources/tools、模型底栏。输入框底栏状态栏配备手动压缩按钮，支持一键触发当前会话上下文压缩并即时联动看板。原始载荷走 `agent.inspectPrompt`：已压缩会话将较早历史替换为一条 `[CONVERSATION SUMMARY]`（不插虚构助手句）；有本会话泵时快照且 `capturedAt >= compactedAt` 则标「本轮实发」；压缩后快照过期则回落 preview。preview 为库内消息 `toModelMessages` + 当前模式系统提示词，不落库。`captureOpenStreamPrompt` 只在开流**成功**后写入，失败不得留下假 last-run。

Files 视图是 **左树右预览**。树与预览之间有可拖拽分隔条（`react-resizable-panels`，热区 12px，`cursor-col-resize`）：

- 默认树宽 240px，最小 160px，最大占 Files 栏 55%
- 布局写入 `localStorage` 键 `enjoy-agents-files-tree-split`
- 顶栏文件夹按钮在路径左侧，可整栏收起树（收起后只留预览）
- 树条目可拖进文件夹（或拖到文件上 = 进该文件所在目录；空白处 = 工作区根）。`workspace.move` `{ from, toDir }`，路径 jail，`fs.rename`。目标已存在 / 进自己 / 同位置会拒。这不是多标签资源管理器，也不做跨工作区拖拽。

## 不变量

- 路径必须规范化并限制在 `rootPath` 内（`..` 逃逸视为错误）。比较、切段、显示名同时认 `/` 与 `\`。
- Git / 监视 / 终端实现必须能在 Win / macOS / Linux 工作；Windows 监视走指纹轮询，不要假装 inotify。
- renderer 不直接 `fs`，不拼用户磁盘绝对路径当秘密通道。
- `git_commit` 与写文件一样默认要审批。
- 代码编辑器必须是本地视图，禁止 Monaco CDN「Loading…」空洞。

## 代码入口

- 工作区档案：`apps/desktop/src/main/services/workspace.ts`
- host（读写 / glob / grep / bash）：`workspace-host.ts`；检查点：`workspace-git-checkpoint.ts`、`workspace-git-checkpoint-plan.ts`、`workspace-git-checkpoint-restore.ts`；Review 列表：`right-pane/views/review/checkpoints/`
- Git 变更 / diff / 线性 log / 提交 / 上游 / patch / 撤销 / 按文件暂存 / 列分支 / 切换：`workspace-git.ts`、`workspace-git-status.ts`、`workspace-git-log.ts`、`workspace-git-remote.ts`、`workspace-git-restore.ts`、`workspace-git-stage.ts`、`workspace-git-branches.ts`；Agent porcelain log：`workspace-git-agent-log.ts`
- 底栏选择器：`ai-chat/status-bar/status-project-picker.tsx`、`status-branch-picker.tsx`
- 命令执行：`apps/desktop/src/main/services/command.ts`
- 终端：`apps/desktop/src/main/services/terminal.ts`
- 文件监视：`workspace-watch.ts` + Windows 指纹 `workspace-watch-fingerprint.ts`
- 右侧栏：`apps/desktop/src/renderer/src/components/ai-chat/right-pane/`
- 系统浏览器预览：`workspace-open-preview.ts`、`composer/session-review/preview-open/`

## 已知坑

- Files 预览已接 `WorkspaceEditor`（本地 monaco，不走 CDN）+ `workspace.writeFile`。⌘/Ctrl+S 与顶栏保存同一条路径。这是单文件编辑，不是多标签 LSP IDE。`workspace.watch` 用 `fs.watch` recursive；Windows 另开指纹轮询（最多 200 条）补漏事件，不要假装 inotify。
- Files 树拖拽走 `workspace.move`（`workspace-move.ts` / `workspace-rename.ts` + `workspace-move-plan.ts`）。renderer 不 `fs.rename`。不要和 Review 改宽分隔条、也不要和 Composer 附件 drop 搞混。
- Agent `git_log`（`workspace-git-agent-log.ts`）是线性 porcelain 文本，limit 默认 20、上限 100，path jail。不要和 Review `workspace.gitLog` 的 structured `commits[]` 混用。
- PR / 远程 / 提交拓扑图仍是后续。MCP / Knowledge / 资产导出已有路由，sidebar 必须 `navigate`，不能 no-op。
- 资产导出与知识库路径同样不得逃出 `rootPath`。
- 创建项目弹窗选文件夹必须走 `workspace.pickFolder`，不要 `workspace.open`，否则未点创建也会写入 `workspaces`。换目录时项目名称按「未手改则跟随新 basename」更新；创建时把 `projectName` 传给 `open.name`。
- Git 当前分支来自 `git branch --show-current`。上游来自 `rev-parse --abbrev-ref @{upstream}`。失败返回空串，UI 显示「未检出分支」/「无上游」，禁止回落 `main`。底栏曾经写死 `Main`，现走 `gitBranches.current`。`gitSwitch` 遇未提交改动返回 `GIT_SWITCH_DIRTY`，禁止 `switch -f`。
- 会话上次发送时的分支记在 renderer（`session-cwd-branch`，可 localStorage），不迁 SQLite。切走且该会话已有用户轮时，Composer 上画横幅「发送后这条会话会跟到当前分支」+ `旧 → 新`。记录只在 `agent.run` 认领成功后更新；开流失败横幅仍在。空会话 / 非 git / 脏树拒切 不画横幅。
- `workspace.gitRestore` 按 porcelain 拆已跟踪 / 未跟踪。对不上任何 path 抛 `RESTORE_NOTHING_MATCHED`，禁止 `{ok:true, restored:0}` 后让改动条藏掉。路径 jail 走 `resolveInsideWorkspace`。
- `workspace.openPreview` 点了若走 `openBrowserUrl` 会进右栏 `<webview>`，不是系统浏览器。必须 main `shell.openExternal`。html 必须 jail + 后缀校验 + 文件存在；URL 只认环回。禁止远程、禁止自动 `vite` / dev server。探索态不禁用。由 `preview-open-invariants` 守门。
- 审查栏 `gitCommit` 成功后必须 invalidate `["changes", workspaceId]`（改动条和 Review 共用这一份）。不要写成 `workspace-changes`，那条 query 不存在，提交后改动条会继续挂着已进 HEAD 的文件。
- 用户点 Review 提交：`requireCommitApproval`（默认开）时弹 `ConfirmDialog` 列出**已暂存**数量与说明，再调 `workspace.gitCommit`（默认 `stageAll: false`，禁止再默认 `git add -A`）。Agent `git_commit` 仍走 HMAC，并可 `add -A`。空工作树 main 直接拒。推送走 `workspace.gitPush`，无上游即拒。按文件暂存走 `workspace.gitStage`，成功后 invalidate `["changes", workspaceId]`。
- Review 主区出现横向空条纹：把全部 changed files 展开成 `FileDiff` 卡片流，且组件用 `flex-1` + `max-h-full`。滚动列给不出确定高度，diff 行塌成发丝。默认只渲染当前文件并 `fill`；叠放时必须 `compact`，禁止 `fill`。
- 右栏 tab 用 `hidden` 保活，不卸载。审查栏若订整份 `messages`、绑全局 `Ctrl+P`/`Ctrl+Enter`、或每次渲染 `parseUnifiedDiff`，流式输出会拖死整窗。隐藏时 `active=false`：不订 messages、不听快捷键、不发 `gitLog`。`Ctrl+P` 仍是打开 Files，不要截走。分支对比才拉 `upstream...HEAD`。
- 移除项目不是删文件夹。归档不是删除；永久删除走 `session.delete` / `session.deleteArchived`。
- Context 检查器禁止 Fake-Status-Chrome：不要写死 RAG 相似度、Prompt Cache %、HMAC 空闲守卫、3200 系统 token 地板，或未压缩卡 `usedTokens * 0.6` 的预计节省。`CitedSource` 没有 score；`TelemetryMetric` 没有 cache 字段。
- 会话芯片 `takeSessionContextChips` 只取走 `enabled !== false` 的项。排除芯片必须留在队列，否则发送后无法再点亮。
- `agent.inspectPrompt` 的 last-run 快照只在 main 进程内存，按 sessionId 覆盖。重启后回落 preview，不要写成已落库。压缩会 `clearInspectPromptSnapshot`；若快照仍在但早于 `compactedAt`，也走 preview。Enjoy Local 的 instructions = `systemPromptFor` + `customInstructions` + AGENTS.md 链（全局 → 根 → cwd，32KiB，见 `agent-runtime`）+ 其余常驻项目规则（`pickAlwaysOnRules`，预算 24k；有链时剥掉同名 AGENTS/CLAUDE/GEMINI）+ 技能索引（`formatSkillCatalog`，预算 8k，不含 SKILL.md 正文）。已压缩则 instructions 头带重读说明。ACP 检查器不得假装走了 ToolLoop 提示词，也不得列出 Enjoy 的 `write_file` 等工具名。preview 的 runtime 必须 `resolveRuntimeId`（会话覆盖 > 偏好），禁止只读 `prefs.runtimeId`。检查器 queryKey 要带 `runtimeId`，否则切引擎后仍吃旧缓存。带 globs 且未 `alwaysApply` 的规则不注入。全局技能没有工作区相对路径，模型不能 `read_file` 出 jail。
- 写盘检查点是 `refs/enjoy/checkpoints/*`，不是用户分支上的 commit。不要 `git commit` 到当前分支当「自动保存」，也不要 OpenHands 云沙箱。`git stash create` **不含未跟踪文件**（`write_file` 新建的正好是这类），必须用临时 `GIT_INDEX_FILE` + `read-tree HEAD` + `add -A` + `write-tree` + `commit-tree`。失败不得让写盘工具抛错。
- `restoreCheckpoint` 不是 `git reset --hard`，也不 `git clean -fd`（会扫到 ignored）。校验 `^refs/enjoy/checkpoints/\\d+$`，否则 `CHECKPOINT_REF_INVALID`。记账与还原都用临时 `GIT_INDEX_FILE`：`read-tree <sha>` + `checkout-index -a -f` **不得**写用户 `.git/index`，暂存区保持还原前状态。先 `previewCheckpoint` 列出快照外已跟踪 / 未跟踪路径。`restoreCheckpoint` 未带 `confirmDeleteUntracked: true` 且有未跟踪删除时**不改盘**，返回 `{ ok:false, code:CHECKPOINT_CONFIRM_REQUIRED, untrackedToDelete }`。确认后才删「当时 git 知道、但不在快照树里」的路径（`resolveInsideWorkspace` jail）。HEAD / 当前分支不动，文案禁止写成分支回退。找不到 `.git` 或 ref 抛 `CHECKPOINT_NOT_FOUND`。成功后 UI 必须 invalidate `["changes", workspaceId]`，**留在检查点作用域**看时间线，禁止偷切「未提交」。ACP 写盘不走 host，靠 `file.changed` / `run.end` 记账（每 run 最多一条），并 invalidate `["checkpoints", workspaceId]`。
