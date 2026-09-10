# Enjoy Agents 缺口审计（对照高星 Agent 项目）

> 位置：`design/references/gap-audit-vs-github-agents.md`。落地以 `design/specs/` 为准；本文是对照证据，不是实现说明书。  
> 整理日期：2026-09-09  
> 2026-09-09 已落地：诚实 Trace、MCP App 空态、通知落库、Automation 真跑（`manual` / `on_save`）、Workflow 逐步 `agent.run`、Files Monaco 可写 + ⌘/Ctrl+S、Files 树 `workspace.move` 拖拽、PDF FlateDecode+Tj/TJ+ToUnicode（含 ObjStm CMap）+ 扫描件本机 tesseract OCR、Enjoy Local running 工具边界可续、ACP 子进程启动收尸、hashed/lexical 不画假百分比、Plan `submit_plan` 落盘 `implementation_plan.md`、node-pty+xterm、`waiting_review` 可恢复、Review 行评论 steer、ACP 命令进 ⌘L、浏览器 Design Mode、知识引用回跳、Realtime 失败不装成 open、Agent `git_status` / `git_diff` / `git_log` / `git_commit` / `git_push`、子 Agent 工具树、doctor 现场 ACP `initialize`、删掉 `contextUsed` 假百分比、个人资料走 `preferences.accountProfile`（旧 localStorage 迁一次）、窗口 stub E2E 全绿、Composer `@` / `/`。`components/studio/` 源码已废止为空模块（`#/studio` 仍 redirect）；i18n `studio.*` 还在用（窗口/规则/确认框），不能删目录文案。不做 M5 worktree / M4 ACP PTY 登录兜底 / 云 MCP / `session/set_mode`。  
> 下文 §3–§5 已按代码改成「已改 / 仍缺」；以 spec「当前真相」和本段为准。  
> 方法：当前工作树 + spec「当前真相」交叉核对；GitHub 只采一手 README / 官方文档。

---

## 1. 结论（先看这个）

Enjoy 已经不是空壳：ToolLoop、HMAC 审批、ACP 多引擎、Attention / PermissionDock、写盘检查点、诚实额度空态，这些是真的。

这四件曾经破坏信任，**代码里已经改过**（以 spec「当前真相」为准）：

1. Workflow 步骤走 `agent.run`；Automation 有 `manual` / `on_save`；通知写 `preferences` 并由 main `Notification`。
2. Trace 只画 send→TTFO→done；MCP App 读不到 HTML 就空态；hashed/lexical 不画「N% 匹配」。
3. Files 接本地 Monaco + `workspace.writeFile` + `fs.watch`；终端是 node-pty + xterm。
4. `waiting_review` 可恢复；Plan 有 `submit_plan` +「按此执行」；ACP slash 进 ⌘L。Enjoy Local Composer `@` 引用工作区文件、`/` 列出模式与已安装技能（不灌 SKILL.md）。`session/set_mode` 仍按 spec 不做。

产品锁已经砍掉 M5 git worktree / M4 PTY 登录兜底 / M6 团队 MCP。不要把 Orca 的舰队抄进来。

产品锁已经砍掉 M5 git worktree / M4 PTY / M6 团队 MCP。优化应加深现有内核，而不是把 Orca 的舰队抄进来。

---

## 2. 对照过的高星项目（一手源）

| 项目 | Stars（约） | 形态 | 对本仓有用的点 | 不要照抄 |
|---|---|---|---|---|
| [stablyai/orca](https://github.com/stablyai/orca) | 63k+ | Electron ADE，CLI 舰队 | 隔离单元是 **git worktree**；diff 批注回灌 agent；Design Mode（点 DOM → HTML/CSS/截图进 prompt）；终端是一等公民 | 产品锁已砍 M5 worktree；不要为了「看起来像 ADE」先做并行舰队 |
| [cline/cline](https://github.com/cline/cline) | 67k | VS Code 扩展 + CLI | **Plan / Act 是产品**，不是藏写工具；Plan 用 `plan_mode_respond` 只对话；Deep Planning 落盘 `implementation_plan.md`；checkpoint `/undo` | 不要把 Enjoy 的 `plan` 模式假装成 Cline Plan |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | 87k | Agent Canvas 控制中心 | 真 Automations（cron / webhook / Slack·GitHub）；Agent Server 可崩溃后续跑；默认沙箱 | 不要把 `#/workflows` 的假 DAG 叫成 Canvas |
| [aaif-goose/goose](https://github.com/aaif-goose/goose)（原 block/goose） | 54k | 桌面 + CLI + API，Rust | 同一内核三入口；MCP 是默认扩展面；ACP 用来接订阅登录 | 不要把 Enjoy 做成通用个人助理而丢掉 IDE 中心 |
| [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | 240k+ | CLI + Desktop + 消息网关 | 真 cron；技能从经验里长出来；跨会话 FTS5 记忆；子 agent 并行 | 云 VM / Telegram 网关与本仓「本地优先、不做云账号」冲突 |
| [sst/opencode](https://github.com/sst/opencode) | 100k+ | TUI 编码 agent | 本机 CLI 自己是完整循环；宿主只要 ACP 保真 | Enjoy 已把它当 ACP 后端，不要再做第二套 OpenCode UI |
| [continuedev/continue](https://github.com/continuedev/continue) | ~33k | IDE 插件 | 规则 / 技能进源码控制；补全与 agent 分轨 | Enjoy 不是 VS Code fork，不要做 Tab 补全抢主路径 |

Orca README 原话：*Run Codex, ClaudeCode, OpenCode or Pi side-by-side — each in its own worktree*。  
Cline README 原话：*In Plan mode, Cline explores… Once you're aligned, switch to Act mode… Every file edit and terminal command requires your approval*。  
OpenHands README：Automations *run on a schedule or in response to webhook events*，后端是独立 Agent Server。  
Hermes README：*Built-in cron scheduler*；*Spawn isolated subagents*；*FTS5 session search*。

---

## 3. 假实现 / 空壳（审计当时 vs 现在）

严重度：P0 会让用户觉得产品在撒谎；P1 半真；P2 死代码或诚实空态。下表按**当前工作树**改写，不要再把已改项当缺口。

### P0 — Workflow 步骤是字符串（已改）

`workflow-runner.ts` 的步骤 `run` 在有 `workspaceId` 时走 `runWorkflowAgentStep` → 同一套 `agent.run` / HMAC / host。无工作区才 `${label} skipped (no workspace)`。不是 `"Plan complete"` 字符串验收。

对照：OpenHands 的 automation 仍是独立 Agent Server；Enjoy 的 DAG 是本机逐步 ToolLoop，不是云编排。

### P0 — Automations 从不执行（已改）

- IPC 有 `automations.list` / `upsert` / `remove` / **`automations.run`**。
- 触发仍只有 `manual` / `on_save`（spec；**没有 cron**，不是漏做）。
- `on_save` 在 host `writeFile` / `editFile` 成功后 `fireOnSaveAutomations`。
- 文件树刷新走 `workspace.watch`（`fs.watch` recursive），不是 Studio 文案里的 chokidar 舰队。

### P0 — Observability Trace 树是编出来的（已改）

`trace-tree-builder.ts` 只画 send → TTFO → done。禁止 `durationMs || 1000` / `|| 850` / 假 MCP span / 写死单价。没有逐步 tool/approval 就不要画 LangSmith 树。KPI 仍吃真 `telemetry_metrics`。

### P0 — MCP「打开 App」永远 demo HTML（已改）

`mcp-app.ts`：能 `resources/read` 出 HTML 才 `srcDoc`；否则 `available: false` 空态。只有 `ENJOY_E2E_STUB` 才给 demo。

### P0 — 通知页「已自动保存」是假的（已改）

通知偏好进 `preferences`；审批 / `run.end` 由 main `Notification`。刷新不再丢。禁止再写组件内 `useState` + 「已保存」却不落盘。

### P1 — 个人资料几乎不落库（已改）

权威在 `preferences.accountProfile`（`settings.setPreferences`）。名/邮箱/头衔/封面/Blobatar 刷新后仍在；旧 `localStorage` `enjoy:account-profile` 只迁移一次。侧栏 `userName` 从快照水合。图表仍走真遥测。不是云账号。

### P1 — 知识命中「N% 匹配」把哈希当分（已改文案；检索仍是哈希兜底）

无 Key 时仍是 32 维 `hashedEmbedding`。卡片 **hashed/lexical 不画百分比**；只有 `embeddingKind === "provider"` 才 `%`。IPC `knowledge.search` 已有 `sourceIds`；引用跳 `#/knowledge?path&q&snippet&startLine`。PDF 解 FlateDecode 内容流再抽 Tj/TJ，ToUnicode CMap 映 CID；扫描件 / 无 ToUnicode 仍可能 `pdf-unreadable`。

### P1 — Git 设置 Conventional 徽章（已改成提示）

`settings-git.tsx` 右侧是 `conventionalHint`（「Review 底栏可生成说明，不是强制规范」），没有常亮「已启用」开关。sparkle 生成提交说明是真的（`ai.generate` kind=`completion`）。

### P1 — MCP「精选市场」是静态预设（文案已改）

`FEATURED_MCP_PRESETS` 仍是本地预设，一键写入 `mcp_servers` 是真的。导航是「本地预设」，不是远程目录。云/团队 MCP 产品锁不做。

### P1 — M4 `comingSoon → available` 不握手（部分已改）

静态门闩还在；doctor 会对 ACP 走现场 `initialize`（5s）。comingSoon 引擎不会假绿灯。Registry「已接线」≠ 已登录能聊。

### P1 — 终端是 spawn（已改）

`terminal.ts` 是 `node-pty`；renderer `@xterm/xterm` + FitAddon。原始按键进 PTY。这是工作区壳，不是 M4 ACP PTY 登录兜底。

### P1 — Realtime 失败就本地回环（已改状态）

无 Key / 握手失败不得装成 `status: "open"`。loop 只是本机回放，Composer 不能看起来已接通远端。

### P2 — 死代码与诚实空态（不是假，但占地）

| 项 | 证据 | 说明 |
|---|---|---|
| `#/studio` | `router.tsx` `redirect({ to: "/" })` | 源码已废止为空模块；i18n `studio.*` 仍给窗口/规则/确认框用 |
| `packages/editor` | 桌面 Files 预览已 import | 单文件 Monaco + `workspace.writeFile`，不是多标签 LSP |
| `pr-timeline-hero.tsx` | 无引用 | 死代码；不要再当 Git 面板 |
| `contextUsedFrom` | 已无引用 | Context 检查器走 `estimateContextWindowStats` |
| 团队 / 账单 | `LocalOnlyNotice` | 诚实空态，保持 |
| DeepSeek Harness 槽 | `HARNESS_ADAPTERS` `comingSoon: true` | 诚实占位；本机 CLI `dsh --profile acp` 才是真路 |
| `isLoopFinished()` | `policies/stop.ts` 注释：ai@7.0.84 恒 false | 挂着不伤，也不提供完成语义 |
| `LAUNCH_PREFS = {}` | `launch-prefs/args.ts` | 故意为空，避免给 Cursor 加假 `--fast` |

---

## 4. 逻辑未完善（半真，缺闭环）

### P0 — 没有可编辑的工作区编辑器（已改主路径）

Files 预览接本地 `WorkspaceEditor`（Monaco，不走 CDN）+ `workspace.writeFile`；⌘/Ctrl+S 与顶栏保存同一条路径。`workspace.watch` 用 `fs.watch` recursive。终端是 node-pty + xterm。

Files 树可把条目拖进目录（`workspace.move`，路径 jail，`fs.rename`）。**仍缺**：不是多标签 LSP IDE（产品不做 VS Code fork）。Windows 大目录 `fs.watch` 另有指纹轮询补漏。

### P0 — Agent 崩溃不能续（部分已改）

`waiting_review`：checkpoint + HMAC 进 `userData/approval-hmac.bin`，启动 `restoreWaitingRuns` 再挂 ActiveRun 并重发 `approval.required`。没有活 waiter 时 `executeStoredTool`。

Enjoy Local 在 ToolLoop **收束**后写入 `resumeAt=tool-boundary` + `modelMessages`；启动 `restoreRunningRuns` 接回泵。没有这份快照、ACP、E2E stub、或工具 execute 中途被杀的 `running` 仍 `cancelled`。不要把「刷新后气泡还在」当成「中途 bash 还能接着跑」。`ai.resume` 若 checkpoint 带工具边界则从 `modelMessages` 续，否则仍是同一请求重启。

### P1 — Plan 模式只是藏写工具（已改落盘）

`plan` / `ask` **不注册**写工具。`plan` 另有 `submit_plan`：写入 `implementation_plan.md`，Composer 上沿「按此执行」切到 `agent`。

`submit_plan` 已落盘工作区根 `implementation_plan.md`（固定路径）。ACP 发送强制 `agent`（`runModeForComposer`），**不传** `session/set_mode`。`workflow` / `tdd` / `code_mode` 仍在 enum，发送时 `coerceComposerMode` 收成 `agent`。Grok 常搜完写一段计划就 `run.end`（最多自动再泵 2 次 Todo）。

### P1 — Knowledge 检索范围与引用回跳（部分已改）

- IPC `knowledge.search` 已有 `sourceIds`；前端再按当前路径收窄。
- 聊天引用跳 `#/knowledge?path&q&snippet&startLine`。
- 无 Key 时仍是 32 维 `hashedEmbedding`；卡片 hashed/lexical 不画假百分比，只有 provider 向量才显示 `%`。
- PDF 会解 FlateDecode + Tj/TJ + ToUnicode CMap（含 ObjStm 里的 CMap）；扫描件在本机有 `tesseract` 时 OCR 图像流。没有引擎标 `pdf-ocr-unavailable`。无 ToUnicode 的 Identity-H / JBIG2 仍可能 `pdf-unreadable`。

### P1 — ACP 保真故意丢事件（部分已改）

`available_commands_update` → `commands.update` → ⌘L（不是 Composer 假 slash 条）。spec/agent-cli：Composer **没有** Resume / Fork / CLI 斜杠目录；**不传** `session/set_mode`；纠偏是下一轮 `session/prompt` 文本。

这是诚实产品锁，也是相对 Orca/Cline CLI 的能力缺口。

### P1 — Git 作为 Agent 工具偏窄（工具面已齐；面板不做 PR）

Agent 工具：`git_status` / `git_diff` / `git_log`（只读，plan/ask 也有）+ `git_commit` / `git_push`（Git 审批）。UI 另有 stage / restore / 线性 log / 检查点。Agent `git_log` 是 porcelain 文本，不是 Review structured `commits[]`。

**不做**：远程 PR、CI、提交拓扑图（「已提交」作用域只有单轨 SVG）。Diff 批注回灌已做（行评论 → QuotedContext + steer）。

### P1 — 浏览器不是 Computer Use（Design Mode 已改）

右栏仍是 `<webview>` + 地址栏。Design Mode 可把点选 DOM / CSS / 截图注入 prompt。不是完整 Computer Use（Agent 不能自己点页面）。

### P1 — 子 Agent 只回摘要（已改树）

`delegate` 真能跑，写盘走同一审批。子循环 `tool.start` / `tool.result` 带 `parentToolCallId`，Thinking 树挂在 delegate 下。仍回 `SubagentSummary` 给模型。不是 Hermes 式并行舰队面板。

### P2 — 媒体 / 沙箱

- 资产 IPC 8MB base64 封顶；视频回放已改 `enjoy-asset://`（对）。
- Vercel Sandbox 要 token，且不上 Composer 导轨（实验，诚实）。
- `createMCPClient` 在锁定的 `ai@7.0.84` 不存在，stdio 走自建 JSON-RPC（真，但是自研协议面）。

### P2 — 会话侧栏灯 / 进程收尸（已改）

侧栏 `waiting_review` 灯走 Attention 槽 `pending_approval` / `ask_user`。ACP 子进程写入 `userData/acp-children.json`；启动时 pid 仍在且 comm 对得上才 SIGKILL。`dispose(term)` 用 `exitCode` 升级 SIGKILL，不看 `child.killed`。

---

## 5. 需要重新设计（架构债，不是补个按钮）

### 5.1 产品身份：三个半成品叠在一起

| 身份 | 现在 | 高星对照 | 建议 |
|---|---|---|---|
| **本地 ToolLoop IDE** | 默认内核，工具/审批/检查点完整；Files 单文件 Monaco 可写 | Cline（在别人的编辑器里） | 加深 Plan 门闩与崩溃续跑；不要做成 VS Code fork |
| **ACP 多引擎宿主** | 已接 Claude/Cursor/Grok/Codex/…；slash 进 ⌘L | Orca（终端+worktree）、OpenHands Canvas | 加深事件保真与审批映射，不要再铺 Registry 营销；不传 `session/set_mode` |
| **工作室控制台** | Knowledge / Workflow / Media / MCP / Observability / Skills 在壳内换轨 | Goose 桌面、Hermes 网关 | Workflow 逐步 `agent.run`、Automation `manual`/`on_save` 已真跑；不要再把它们写成空壳 |

tech-stack 长文里的独立 `packages/terminal` / Hono 进程仍是规划。落地以 spec「当前真相」为准：Monaco 在 Files、watch 是 `fs.watch`、单会话 ToolLoop。

### 5.2 Plan 不应只是只读 ToolLoop

Cline 的模式切换会换提示词、可选换模型、并禁止执行。Enjoy 的 `plan` 只是 `createCodingTools({ mode: "plan" })` 不注册写工具。模型仍会「计划完就停」，用户没有「批准计划 → Act」的明确动作。

建议合同：

1. Plan 轮只允许读工具 + `ask_user_questions` + 一个 `submit_plan`（落库，不是 markdown 围栏碰运气）。
2. Dock 出「按此执行」→ 切 `agent` 并把计划注入 hidden/system（与 M3 handoff 同一注入通道）。
3. ACP 路径要么隐藏执行模式，要么把 `submit_plan` 映射成下一轮 prompt，不要让用户以为 Cursor 也进了 Enjoy Plan。

### 5.3 Workflow 页与 ToolLoop 抢「多步」语义

现在有三套「多步」（都真跑，语义仍叠）：

- ToolLoop + `todo_write` + 最多 2 次自动续泵（主进度：Todo Dock）
- `#/workflows` DAG 逐步 `agent.run`
- `#/settings/automations` `manual` / `on_save` → `agent.run`（无 cron）

高星项目通常只保留一套编排。Enjoy 把 Todo Dock 当主进度；Workflow / Automation 不要再假装是 OpenHands Server 或 Hermes cron。

### 5.4 隔离模型

Orca：一会话一 worktree。  
OpenHands：Docker / VM。  
Enjoy：所有会话写同一 `rootPath`，检查点是 `refs/enjoy/checkpoints/*`（不进用户分支）。

产品锁砍了 worktree。检查点是用户可理解的 Undo：Review `checkpoints` 可还原；Composer 改动条 Undo All 走 `workspace.gitRestore`（ConfirmDialog）。不要用「沙箱」文案描述 just-bash / 未配置的 Vercel。

### 5.5 Observability：真指标 + 诚实 Trace

KPI / 时序 / 模型路由吃 `telemetry_metrics`。Trace 详情只画 send→TTFO→done。不要再从一条 metric 伪造 RAG→Plan→MCP。继续堆 Gantt 只会放大假 LangSmith。

### 5.6 设置 IA：24 段 vs 10 个导航 + 死 Studio

侧栏精炼成 10 项是对的。通知 / 自动化已接真闭环。`components/studio/` 源码已空，**不要删** i18n `studio.*`（窗口/规则/确认框还在用）。Git 设置页读 `workspace.changes`（query `["changes", workspaceId]`），不是 `chat-store`。

---

## 6. 优化顺序（对齐产品锁，不抄舰队）

不做：M5 worktree 并行、M4 PTY、云账号、团队 MCP、把 Hermes 网关搬进桌面。

### 第一刀 — 停止撒谎（已落地）

1. Trace 只画有的字段；MCP Open App 诚实空态；通知页真写入。
2. Automation `manual` → `agent.run`；`on_save` 接写盘钩子。无 cron。
3. Workflow 步骤 `runWorkflowAgentStep` → `agent.run`。
4. 知识 hashed/lexical 不画「N% 匹配」。
5. `components/studio/` 源码冻结为空模块；`pr-timeline-hero` 无引用。
6. Git 设置 Conventional 改成提示，不是「已启用」徽章。

### 第二刀 — 变成名副其实的 Agent IDE（主路径已落地）

1. Files：Monaco 可写 + `workspace.writeFile` + `fs.watch` + ⌘/Ctrl+S。
2. 终端：node-pty + xterm。
3. Plan：`submit_plan` 落盘 `implementation_plan.md` + 「按此执行」。
4. 崩溃：`waiting_review` 可恢复；Enjoy Local `running` 工具边界可续。
5. Diff 批注：Review 行评论 → 下一轮 steer。

**仍缺**：多标签 LSP（产品不做 VS Code fork）。PDF 扫描件 OCR 已接本机 tesseract。Files 树拖拽移动已做。Plan 已落盘 `implementation_plan.md`。

### 第三刀 — 宿主保真（ACP 已是差异化；部分已落地）

1. `available_commands_update` 接到 ⌘L，不是 Composer 假 slash 条。
2. 浏览器 Design Mode：选中 DOM → 截图 + CSS 进 QuotedContext。
3. 侧栏 `waiting_review` 灯已做。ACP 启动账本收尸已做。
4. **不传** `session/set_mode`（本阶段产品锁）。

### 第四刀 — 知识与记忆（别叫 RAG 直到向量是真的；部分已落地）

1. IPC `sourceIds`。
2. 引用点击回跳。
3. 无 embedding 时文案是词袋 / 本地检索，有 Key 再写「向量」。
4. 跨会话记忆先用已有 SQLite + compaction 摘要，不要上 Honcho。
5. PDF 解 FlateDecode + Tj/TJ + ToUnicode（含 ObjStm）；扫描件走本机 tesseract，没有引擎不要装成已 OCR。

---

## 7. 本仓已经领先、不要改坏的

- HMAC 审批 + 禁止 30s 自动放行（Cline 也能 auto-approve，Enjoy 默认更紧）。
- 额度条拒绝假填充（Cursor/Grok/Antigravity 才画；Claude/Codex 诚实「无公开 API」）。
- 引擎 handoff 摘要进 hidden，不当假用户消息。
- 写盘检查点不污染用户分支。
- renderer 不碰 Key / fs / spawn。
- Plan/Ask **不注册**写工具（比只靠 deny 强）。

这些是对高星项目的正确减法。优化时保持。

---

## 8. 证据索引

| 主张 | 权威出处 |
|---|---|
| Workflow 逐步 Agent | `workflow-runner.ts` → `runWorkflowAgentStep` |
| Automation 真跑 | `ipc-automations.ts` `automations.run`；`automations-run.ts`；host 写盘钩子 |
| Trace 诚实 span | `trace-tree-builder.ts` send→TTFO→done |
| MCP App 空态 | `mcp-app.ts` 读不到 HTML 则 `available: false` |
| 通知落库 | `preferences` + main `Notification` |
| Files Monaco | `files-preview-editor.tsx` + `workspace.writeFile` + ⌘/Ctrl+S |
| 终端 PTY | `terminal.ts` `node-pty`；`terminal-view.tsx` xterm |
| 知识无假百分比 | `knowledge-snippet-card.tsx` `showSemanticPercent` 仅 provider |
| 文件监视 | `workspace.watch` `fs.watch` recursive |
| `waiting_review` 可恢复 | `restoreWaitingRuns` + `approval-hmac.bin`；Enjoy Local `running` 工具边界由 `restoreRunningRuns` 续，其余 `abandon-orphan-runs` |
| Plan `submit_plan` | `submit-plan.ts` 写 `implementation_plan.md` + ExecutePlanBar |
| ACP slash → ⌘L | `acp/map-events.ts` `commands.update`；不传 `session/set_mode` |
| Agent Git 工具 | `git_status` / `git_diff` / `git_log` / `git_commit` / `git_push`；host `workspace-host.ts` |
| comingSoon 静态门闩 | `coming-soon-promotion.ts`；doctor `probeAcpInitialize` |
| 32 维哈希向量 | `packages/knowledge/src/retriever/embed.ts`（诚实兜底，不是假 RAG） |
| 产品锁不 worktree | `design/specs/product.md`、`m4-acp-registry.md` |
| Orca worktree / Design Mode | https://github.com/stablyai/orca README |
| Cline Plan/Act | https://github.com/cline/cline README |
| OpenHands automations | https://github.com/OpenHands/OpenHands README |
| Hermes cron / memory | https://github.com/NousResearch/hermes-agent README |
| Goose MCP + ACP 订阅 | https://github.com/aaif-goose/goose README |
