# 2026 高星开源 Agent 对照：设计课与 Enjoy 加深点

> 位置：`design/references/oss-agent-landscape-2026.md`。落地以 `design/specs/` 为准；本文是对照笔记，不是实现说明书。  
> 整理日期：2026-09-10  
> 最后更新：2026-09-12  
> 2026-09-10 已按 §7 加深：`repo_outline` + 开流大纲、自动 compact、「按此执行」hidden/`executePlan`、`skill` 工具、bash 命令前缀白名单、macOS Seatbelt、`delegate kind=explore`、Trace 回放 tool/approval、MCP `inputSchema`、Design Mode 截图、`git_branch` + commit 默认不 `add -A`。落地以 specs「当前真相」为准。  
> 方法：GitHub 一手 README / 官方文档 + 本仓 spec「当前真相」与代码入口交叉核对。  
> 星数来源：[tiennm99/awesome-coding-agents](https://github.com/tiennm99/awesome-coding-agents) 日更榜（2026-09-09 03:41 UTC）。  
> 前一次缺口审计（假实现 / 空壳）见 [gap-audit-vs-github-agents.md](./gap-audit-vs-github-agents.md)。本文不重复「已经改过的撒谎点」，只谈**设计思路**与**仍浅的 seam**。

---

## 1. 结论（先看这个）

高星项目 2026 年已经分成三条产品线，不要混着抄：

| 形态 | 代表 | 他们在卖什么 |
|---|---|---|
| **终端 Agent** | OpenCode 206k、Codex 123k、Gemini CLI 107k、Pi 103k、Aider 49k | 同一内核、键盘驱动、provider 自由、Plan/Build 切换 |
| **别人编辑器里的 Agent** | Cline 68k、Continue 36k、Kilo 27k | 借 VS Code / JetBrains 的 LSP 与 diff；Plan/Act 是产品 |
| **本机控制中心 / ADE** | OpenHands Canvas 87k、Goose 桌面 54k、Cline Desktop、OpenCode Desktop β | 多引擎宿主、审批、自动化、沙箱后端 |

Enjoy 走第三条：**本地优先的 Electron Agent IDE**（ToolLoop 内核 + ACP 宿主 + 三卡片工作区）。最近的对照是 OpenHands Agent Canvas、Goose 桌面、Cline Desktop、Orca，**不是**再做一个 OpenCode TUI。

本仓内核已经能当真 Agent 用：HMAC 审批、plan 不注册写工具、ACP 多引擎、写盘检查点不污染用户分支、诚实额度。剩下的不是空壳，是 **四个 seam 深度不够**：

1. **执行隔离**仍是字符串过滤，不是 OS sandbox。  
2. **仓库地图**不存在，模型靠 glob 摸索。  
3. **Plan → Act** 有落盘，但「按此执行」把计划塞进用户气泡，不是 hidden/system。  
4. **技能 / 权限 / 压缩** 是索引+开关，不是 OpenCode 那种按需工具与模式化权限。

产品锁仍然有效：不做 M5 worktree 舰队、不做 M4 ACP PTY、不做云账号 / 团队 MCP。加深现有内核，不要新开一条产品线。

---

## 2. 星数榜（编码 Agent，2026-09-09）

| # | 仓库 | Stars | 语言 | 对本仓有用的点 | 不要照抄 |
|---|---|---:|---|---|---|
| 1 | [anomalyco/opencode](https://github.com/anomalyco/opencode) | 206k | TS | Build/Plan 主键切换；`skill` 按需加载；权限 `allow/ask/deny` + bash glob；主/子 Agent 配置；Context Source 登记表 | 第二套 TUI / Desktop UI；V2 LSP 文档自己写「还没 runtime」 |
| 2 | [anthropics/claude-code](https://github.com/anthropics/claude-code) | 145k | — | SKILL.md 生态、hooks、MCP 原教旨 | 闭源；不要把 Enjoy 做成它的皮肤 |
| 3 | [openai/codex](https://github.com/openai/codex) | 123k | Rust | OS sandbox（macOS Seatbelt / Linux bubblewrap+seccomp）；`AGENTS.md` 分层 + 32KiB 上限；自动 compact；审批策略与 sandbox 正交 | 默认绑 ChatGPT 账号 |
| 4 | [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) | 107k | TS | 大窗口 + 免费额度把「先能跑」做透 | 不是 IDE；免费档不是本仓路径 |
| 5 | [earendil-works/pi](https://github.com/earendil-works/pi) | 103k | TS | 内核 / TUI / CLI 分包；**明确不内置权限系统**，要隔离就容器化 | 不要把「无审批」学回来 |
| 6 | zed-industries/zed | 90k | Rust | 编辑器性能上限 | Enjoy 不是编辑器产品 |
| 7 | [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | 87k | TS | Canvas 与 Agent Server 分仓；Docker/VM 后端；ACP 多引擎；cron/webhook 自动化 | 默认无沙箱会警告「满盘权限」；云 Server 不是 V1 |
| 8 | [cline/cline](https://github.com/cline/cline) | 68k | TS | Plan/Act 是产品；Plan/Act 可换模型；checkpoint undo；同一 SDK 出 CLI / 扩展 / Desktop | Slack/Telegram 网关、cron 舰队 |
| 9 | warpdotdev/warp | 65k | Rust | 终端即产品 | 闭源 ADE |
| 11 | [aaif-goose/goose](https://github.com/aaif-goose/goose) | 54k | Rust | 桌面+CLI+API 同一内核；MCP 默认扩展面；ACP 接订阅登录；Linux Foundation | 做成通用个人助理会丢掉 IDE 中心 |
| 12 | [Aider-AI/aider](https://github.com/Aider-AI/aider) | 49k | Python | **Repo map**（tree-sitter + 图排序，默认 ~1k token）；改完 lint/test 回灌；git 原子提交 | 自动 `git commit` 到用户分支（Enjoy 检查点更好） |
| 13 | continuedev/continue | 36k | TS | 规则进源码控制 | 已被收购，v2 终版；不要做 Tab 补全主路径 |
| 17 | charmbracelet/crush | 28k | Go | TUI 质感 | 不是 IDE |
| 20 | onlook-dev/onlook | 27k | TS | 点选 DOM 改前端 | Enjoy 已有 Design Mode；不要做成设计工具 |

Orca（Electron ADE + worktree 舰队）仍是形态对照，但产品锁砍了 M5，不进加深队列。

---

## 3. 高星项目真正值钱的设计（按 seam）

下面用本仓 [codebase-design](https://github.com/) 的词：加深 **已有模块**，不要再铺一层浅接口。

### 3.1 权限是策略对象，不是三个布尔

**OpenCode** 把权限做成 `allow | ask | deny`，键是工具族（`edit` / `bash` / `skill` / `external_directory`），`bash` 还能 glob：`"git status *": "allow"`、`"git push": "ask"`。Plan 主键 = 同一 Agent，只是默认 `edit/bash = ask|deny`。

**Codex** 把两件事拆开：`sandbox_mode`（OS 能碰什么）× `approval_policy`（什么时候问人）。默认 `read-only` sandbox + 按需审批。

**Cline** 默认每次写盘 / 命令都问；auto-approve 是显式开关。

**Pi** 反过来写在 README：*没有内置权限系统，默认等于启动它的用户*。要隔离就 Docker / micro-VM。

**Enjoy 现在：** `requireWriteApproval` / `requireBashApproval` / `requireCommitApproval` + `allow_session`（本会话白名单工具名）+ HMAC。比 Cline 默认更紧，比 OpenCode 更粗：没有「`git status` 放行、`curl` 永远问」这种命令级策略。

### 3.2 Plan 是换工具集，不是换文案

**Cline：** Plan 不能改文件、不能跑命令；切 Act 带上整段对话；Plan/Act 可配不同模型；`/deep-planning` 落详细计划。

**OpenCode：** Tab 在 `build`（全工具）和 `plan`（edit deny，bash ask）之间切。另有只读 `explore` / `scout` 子 Agent。

**Enjoy：** `createCodingTools({ mode: "plan" })` 不注册写工具；`submit_plan` 写死 `implementation_plan.md`；Composer「按此执行」切 `agent`。这已经对了。浅处：`execute-plan-bar.tsx` 把计划 **拼进用户消息**（`executePlanPrompt + plan`），而 M3 引擎交接走 hidden/system。ACP 路径 `runModeForComposer` 强制 `agent`，规划只是 Prompt 围栏，Grok 仍可能写盘。

### 3.3 上下文是「地图 + 预算」，不是整仓

**Aider** 的 repo map：tree-sitter 抽类/函数签名，文件当图节点，PageRank 式选出最相关的一块，默认约 1k token，聊天空时放大。模型先看地图再 `read` 具体文件。官方文档：[aider.chat/docs/repomap.html](https://aider.chat/docs/repomap.html)。

**Codex** 的 `AGENTS.md`：全局 → 仓库根 → 当前目录，拼接上限 `project_doc_max_bytes`（默认 32KiB）。`/init` 扫描构建/测试命令写成短指南。压缩是自动的，`/compact` 只是手动。

**OpenCode V2** 把系统提示拆成 **Context Source 登记表**：AGENTS.md、技能名录、MCP、会话指令各是独立源；只在「即将发给模型」的安全边界对账；变了发一条 Mid-Conversation System Message，而不是重写整份 system prompt。技能正文 **不**进基线，只进 `skill({ name })` 工具。

**Enjoy：** 按需 `read` / `glob` / `grep`；常驻规则 24k；技能索引 8k（不灌 SKILL.md，这点与 OpenCode 同向）；`clipHistory` 40 条；`/compact` 手动。**没有** 仓库大纲工具，也没有接近窗口自动压缩。大仓只能靠模型自己 glob。

### 3.4 技能按需加载，全局技能不能假装 `read_file`

**OpenCode / Claude Code：** 工具描述里只列 name+description；调用 `skill` 才灌正文；全局路径由宿主读，不要求在工作区 jail 内。

**Enjoy：** `formatSkillCatalog` 注入索引，提示模型去 `read_file`。工作区内相对路径成立；**全局技能在 jail 外，模型读不到**。这是已知坑，也是相对 OpenCode 的真实缺口。

### 3.5 沙箱是 OS 边界，审批是人边界

**Codex：** macOS `sandbox-exec` Seatbelt；Linux bubblewrap+seccomp（旧路 Landlock）；默认禁网、写盘限工作区。审批失败不能抬高 sandbox。

**OpenHands：** 文档把「无沙箱」标成 Warning：*agent 对你的文件系统有完整权限*。正经路径是 Docker / VM / 远程 Agent Server。

**Enjoy：** `assertSandboxCommand` 用正则拦 `curl|wget|nc|ssh|scp|ftp`，`command.ts` 禁 shell wrapper，cwd 锁工作区。用户点 Allow 之后就是 **本机用户权限的 `execFile`**。设置里的 Vercel Sandbox / just-bash 不上 EngineRail。这不是漏按钮，是隔离模型选择；文案不要叫「沙箱」除非接上 OS 策略。

### 3.6 子 Agent 用来搬噪声，不是再开一个聊天

**Codex：** 子 Agent 并行探索/测日志，主线程只收回摘要。默认不自动 spawn。

**OpenCode：** `explore`（快、只读）、`scout`（查上游依赖）、`general`（可写、可并行）。主会话能切进子会话。

**Enjoy：** `delegate` 真跑、写盘走同一 HMAC、Thinking 树挂 `parentToolCallId`、禁止嵌套。聊天花名册已落地（Explore / General 人格、连续 ≥2 条顶层列出每一行）；同 step 并行上限 4。产品锁不做舰队面板 / worktree / 子会话表。

### 3.7 Git：提交是用户动作，检查点是 Agent Undo

**Aider** 自动 commit，用 git 当 undo。对终端用户很爽，对「审查台」产品会污染分支。

**Cline** 有 checkpoint，Act 前可回滚。

**Enjoy 已经更好：** `refs/enjoy/checkpoints/<stamp>`（临时 index + `commit-tree`，含未跟踪）不移动 HEAD；Review 第七个作用域可还原；Composer Undo All 走 `gitRestore`。缺的是产品化：每轮自动标可还原点、失败 run 一键回到写盘前，而不是再做一个 GitHub。

### 3.8 同一内核，多种表面

Cline：SDK → CLI / VS Code / JetBrains / Tauri Desktop。  
Goose：Rust 内核 → 桌面 / CLI / API。  
OpenHands：Canvas 前端仓 vs `software-agent-sdk` Agent Server 分仓。  
Pi：`pi-agent-core` / `pi-ai` / `pi-tui` / `pi-coding-agent`。

Enjoy 的 `packages/agent-core` 已经无 React / 无 Electron，这个 seam 是对的。V1 不必出 CLI；不要为了「看起来像 OpenCode」再包一层 TUI。

---

## 4. Enjoy 已经领先、不要改坏

| 选择 | 为什么对 |
|---|---|
| HMAC 审批 + 禁止 30s 倒计时放行 | Cline 也能 auto-approve；Enjoy 默认更紧 |
| `plan`/`ask` **不注册**写工具 | 比「注册了再 deny」强，模型看不见工具 |
| 写盘检查点不进用户分支 | 比 Aider 自动 commit 更适合审查台 |
| 技能只灌索引 | 与 OpenCode `skill` 工具同向；不要把 SKILL.md 正文塞进 system |
| 额度条拒绝假填充 | Claude/Codex 诚实「无公开 API」 |
| 引擎 handoff 进 hidden | 不当假用户消息 |
| renderer 不碰 Key / fs / spawn | 高星桌面项目里仍有人把循环放进 UI |
| ACP 宿主 + 静态能力表 | 未声明 = 不做；这是相对纯 TUI 的差异化 |
| 知识 hashed/lexical 不画「N%」 | 假 RAG 比没有更伤信任 |

---

## 5. 该加深的点（按杠杆，对齐产品锁）

### P0 — 仓库地图（Agent 上下文，不是 LSP）

对照：Aider repo map。OpenCode 自己的 LSP 文档也说：很多项目不如把 lint/typecheck 写进 `AGENTS.md` 让 Agent 跑命令。

**建议合同（加深 `createCodingTools` + 开流准备，不新开包）：**

1. 开跑前（或空会话第一次）生成一份 **忽略后的目录骨架 + 入口文件**（`package.json` / 路由 / `AGENTS.md`），字符预算内注入 system，类似 Aider map 的穷人版。  
2. 新工具 `repo_outline`（深度、扩展名、条数上限），减少盲目 `glob`。  
3. 接近当前模型 `contextWindow` **自动**走已有 `session.compact`（算法已在 `session-compactor.ts`，缺的是触发器）。  
4. 不要做语言服务器进 Files 预览。产品不做 VS Code fork。

代码入口：`packages/agent-core/src/tools/read-tools.ts`、`inspect-prompt-instructions.ts`、`session-compaction-service.ts`。

### P0 — Plan 执行走 hidden/system

对照：Cline 切 Act 带上下文；Enjoy M3 交接已经有 hidden 通道。

**现状：** `execute-plan-bar.tsx` → `sendComposerMessage({ content: executePlanPrompt + plan })`。

**建议：** 「按此执行」与引擎交接同一注入通道（hidden/system + 提示去读 `implementation_plan.md`），用户气泡只留一句短确认。ACP 规划芯片写明「宿主模式，引擎工具未锁」。

### P0 — bash 隔离诚实化，再决定要不要 OS sandbox

对照：Codex Seatbelt；OpenHands 对无沙箱的 Warning。

**现状：** `packages/agent-core/src/policies/sandbox.ts` 十来行正则。`python -c "import urllib..."` 或 `node -e "fetch()"` 都能绕过。

**建议分两步：**

1. 文案与检查器不要写「沙箱」；写「工作区 cwd + 禁包装器 + 可选禁网二进制」。  
2. 若做真隔离：macOS Seatbelt / Linux landlock 包一层 `runExecutable`，默认禁网（已有 `sandboxNetwork` 偏好）。不要把 Vercel Sandbox 拉上导轨。

### P1 — 原生 `skill` 工具

对照：OpenCode `skill({ name })`。

Enjoy 索引已经对；缺的是 **宿主代读** 全局 SKILL.md，这样 jail 外技能也能用。权限可先 `allow`，不必一上来做 OpenCode 的 skill glob。

### P1 — 命令级审批（加深 HMAC，不换模型）

对照：OpenCode bash glob。

在现有 `allow_session` 旁边加「本会话允许匹配该 argv 前缀」（例如 `git status`、`pnpm test`），不要只白名单工具名 `bash`。这能把「每次 git status 都弹 Dock」的摩擦压下去，同时 `git push` / `curl` 仍然问。

### P1 — 只读 explore 子 Agent

对照：OpenCode explore。

`delegate` 已有。加一个 `explore` 变体：`createCodingTools({ mode: "ask" })`、更快模型（已有 `fastModelId`）、强制摘要。主 Agent 搜大仓时调用。不要并行舰队 UI。

### P1 — Trace 接已有 StreamEvent

对照：高星项目能看见逐步工具；Enjoy 故意只画 send→TTFO→done 是为了不撒谎。

`event-buffer` 里已有完整流。Trace 详情按 `tool.*` / `approval.*` 回放（继续脱敏），不要从一条 metric 猜 RAG。`estimatedCost` 无单价就继续 0。

### P1 — MCP 把 JSON Schema 交给模型

`mcp-agent-tools.ts` 现用 `z.record(z.unknown())`。`tools/list` 的 inputSchema 应进工具定义，否则模型乱填。连上但 0 工具要在检查器写明。

### P2 — Design Mode 补截图

代码是 HTML 4k + computed CSS，**没有** `capturePage`。有 vision 的模型才把截图当附件。不做 Computer Use。

### P2 — Agent Git 再一厘米

`git_branch`（创建/切换要审批）；用户 Review 的 commit 已是「只提交已暂存」，Agent `git_commit` 的 `add -A` 与之对齐或拆成显式 `stageAll`。不做 PR。

---

## 6. 明确不要做（抄了会毁掉身份）

| 诱惑 | 来源 | 为什么不 |
|---|---|---|
| 再做一套 OpenCode / Crush TUI | 星数第一 | Enjoy 已把它当 ACP 后端 |
| git worktree 并行舰队 | Orca | 产品锁 M5 |
| 自动 commit 到用户分支 | Aider | 检查点已经是更好的 Undo |
| Tab 补全 / 多标签 LSP | Continue / Void | 不是 Agent IDE 的主路径；Void 已归档 |
| Slack/Telegram 网关、cron 舰队 | Cline / Hermes / OpenHands | 本地优先；Automation 保持 `manual` / `on_save` |
| 默认 Docker Agent Server | OpenHands | 本机 ToolLoop 是默认内核 |
| `session/set_mode`、Composer 假 slash 目录 | Orca / Cline CLI | ACP 保真产品锁 |
| 把 Workflow 画成节点编排器 | OpenHands Canvas | Todo Dock 已是主进度；三套「多步」不要再叠 |

---

## 7. 建议实现顺序（仍是加深，不是新模块）

1. **仓库大纲 + 自动 compact** — 大仓体感立刻接近 Aider/Claude Code。  
2. **Plan 执行改 hidden** — 一行产品合同，对齐已有 M3 通道。  
3. **`skill` 工具** — 解开全局技能读不到的坑。  
4. **bash 命令级白名单 + 文案去「假沙箱」** — 摩擦与诚实。  
5. **只读 explore delegate** — 复用现成子循环。  
6. **Trace 回放 tool/approval** — 复用 event-buffer。  
7. **（可选）macOS Seatbelt 包 `runExecutable`** — 真隔离；Windows 可后置。

每一步都落在已有模块后面：`agent-core` 工具、`workspace-host`、`session-compaction`、`inspect-prompt`、PermissionDock。不要为对照表新开 `packages/repo-map` 除非第二套 adapter 真的出现。

---

## 8. 交叉核对（deep-research，2026-09-10）

后台引用报告（Partial）：高星项目共用 **同一条** model → tools → observe 循环。Plan 不是第二套运行时：Cline 在同一会话硬切 Plan/Act；OpenCode Tab 切 Build/Plan 两个 primary agent；Gemini / Qwen / Codex `/plan` 是同一 ToolLoop 上的只读叠加。Aider 是 ask/code/architect 聊天模式，architect 还是双模型流水线，不要当默认内核。

沙箱与审批是正交轴。OS jail（Seatbelt / bubblewrap）包的是 **spawn 出来的 shell**，管不到进程内 `write_file`。OpenCode 文档默认多数工具 allow、没有 OS jail。Copilot 本地沙箱默认关。Claude 若 jail 起不来会警告后裸跑——不要抄，失败应拒。

上下文：Codex 式 `AGENTS.md` 全局→根→cwd 拼接 + 约 32KiB 封顶；Claude / Hermes 是「碰到路径再灌子目录」。压缩后应从磁盘 **再注入** 根指令文件。LSP 应可选，lint/typecheck 写进 AGENTS.md。

该抄：叠加 Plan、沙箱×审批正交、spawn 上的 OS jail、deny→ask→allow、Skills/MCP/子 Agent 分层、写盘检查点。  
不抄：default-allow / YOLO、jail 失败裸跑、Aider 双模型 architect、检查点丢掉子 Agent 改动、每轮塞全部嵌套指令。

对照本仓刚落地的加深：Plan 叠加、bash Seatbelt、命令前缀审批、`skill` 工具、自动 compact、检查点不进用户分支、Codex 式嵌套 `AGENTS.md`（全局→根→cwd，32KiB，碰到路径再灌子目录）、压缩后从磁盘再灌根指令——与报告一致。仍**不做** ACP `session/load`（产品锁）。

一手源见该次报告 `[S1]`–`[S23]`（Cline / OpenCode / Codex / Claude Code / Gemini CLI / Aider / Hermes / ACP agents 列表）。

---

## 9. 证据索引

| 主张 | 出处 |
|---|---|
| 星数榜 | https://github.com/tiennm99/awesome-coding-agents README 2026-09-09 |
| OpenCode Build/Plan、skill 工具、权限 glob | https://opencode.ai/docs/agents/ 、 https://opencode.ai/docs/skills/ 、仓库 README |
| OpenCode Context Source / Epoch | https://github.com/anomalyco/opencode/blob/dev/CONTEXT.md |
| OpenCode LSP「V2 还没有 runtime」 | https://opencode.ai/v2/docs/lsp/ |
| Cline Plan/Act、checkpoint、Desktop | https://github.com/cline/cline README；https://docs.cline.bot/features/plan-and-act |
| Codex sandbox × 审批、AGENTS.md 32KiB、自动 compact | https://developers.openai.com/codex/concepts/sandboxing ；https://developers.openai.com/codex/guides/agents-md/ |
| Aider repo map | https://aider.chat/docs/repomap.html |
| OpenHands Canvas / Server 分仓、无沙箱 Warning | https://github.com/OpenHands/OpenHands README |
| Goose 桌面+CLI+ACP 订阅 | https://github.com/aaif-goose/goose README |
| Pi 无内置权限 | https://github.com/earendil-works/pi README |
| Enjoy 沙箱是正则 | `packages/agent-core/src/policies/sandbox.ts` |
| Enjoy Plan 执行进用户气泡 | `execute-plan-bar.tsx` `sendComposerMessage` |
| Enjoy 技能只灌索引 | `packages/ipc-contract/src/skills-catalog.ts`；`skills` spec |
| Enjoy 检查点不进用户分支 | `workspace-git-checkpoint.ts`；`workspace` spec |
| 产品锁 | `design/specs/product.md` |
