# 对照 QM / Craft / Synara / Zeron：能在 Enjoy 里展示什么

> 位置：`design/references/peer-qm-craft-synara-zeron.md`。落地以 `design/specs/` 为准；本文是对照笔记，不是实现说明书。  
> 整理日期：2026-09-12  
> 方法：一手 README / 架构文档 / 官方站点 / 发行说明。GitHub API 当时 SSL 失败，正文走 jsDelivr raw 与项目文档。

Enjoy 产品锁（`product` / `m2` / `m3`）：本机优先、无云账号、无多端 CRDT、不做 M5 git worktree、不做 M6 团队 MCP、Git Review **不做** PR / CI。下面凡是撞锁的，标「不要抄」。

---

## 1. 先看结论

四家不是同一类产品：

| 项目 | 形态 | 中心抽象 | 和 Enjoy 的距离 |
|---|---|---|---|
| [yc-software/qm](https://github.com/yc-software/qm) | 公司级多人 harness（Slack + Web，自托管云） | **Scope**：人 / 频道 / 项目各有记忆、文件、钥匙串、cron、Web App、持久沙箱 | 团队云。内核课有用，壳不要抄 |
| [craft-ai-agents/craft-agents-oss](https://github.com/craft-ai-agents/craft-agents-oss) | Electron 桌面 + 可选无头 WS 服务 | **Session inbox** + Sources/Skills + Kanban Tasks | 最近的桌面同龄人 |
| [Emanuele-web04/synara](https://github.com/Emanuele-web04/synara) | 本地优先桌面控制面，驱动本机 CLI | **Task**：项目 → 线程 → provider session + worktree | 产品形状最像 Enjoy，但隔离边界是 worktree |
| [zeron.sh](https://zeron.sh/) / [zeronsh/comet](https://github.com/zeronsh/comet) | gpui 原生窗 + 本机 daemon，可选多设备 | **Engine / Viewport**：会话在机器上，窗只是视口 | 控制面课有用；多设备同步撞锁 |

**Enjoy 已经有、不要再造一套：** ACP 多引擎、HMAC 审批、Attention / PermissionDock / Inbox、写盘检查点、Git Review 七作用域、Skills 工作模块、MCP 隔离 App、Workflow 逐步 `agent.run`、M3 handoff 坞、子智能体花名册。

**值得加深、能在现有壳里看见的（按展示价值）：**

1. 会话行用户状态 + 旗标（Craft Inbox）
2. 助手气泡原生 Mermaid（Craft）
3. Inbox 收成 Activity（Synara：运行 / 审批 / 失败 / 刚完成）
4. 运行中 Changes 活刷新（Zeron live checkout diff）
5. 会话目标芯片 / 回合 Recap（Synara persistent goals）
6. Composer `@` 钉技能与 MCP（Craft `@` sources）
7. SHIFT+TAB 循环审批档（Craft permission modes）
8. 线程用户句小地图（Zeron MessageRail）

**需要改产品分期、不要假装已有：** cron 自动化、钥匙串表面、Agent 自助接 OpenAPI/MCP、Kanban/Conductor、无头 daemon。  
**明确不要抄：** Slack 组织、云 Scope、多设备 CRDT、git worktree、GitHub PR 工作台、远程改 `.env`。

---

## 2. 四家各自做什么

### QM — [README](https://github.com/yc-software/qm/blob/main/README.md) · [qm.ycombinator.com](https://qm.ycombinator.com/)

YC 开源的「军需官」：给创业公司每人 / 每房间一个隔离 agent，而不是 50 个 Hermes 副本。

一手能力：

- Scope：记忆、文件、keychain 视图、权限、crons、web apps、**持久沙箱**（装过的工具还在）
- 同一身份走 Slack 与 Web
- 组织级安全姿态：**Strict**（每次工具停等人）/ **Auto**（外源分类筛）/ **Dangerous**；另有分享姿态 Isolated / Open
- 技能按 scope 授权，git 仓库进技能包
- 后台：cron、watch、入站 webhook
- 管理面：Metrics / History / Files / Live / Errors / Audit / Skills / Crons
- 内核无头（Fastify + Postgres）；Pi / OpenCode / Codex / Claude Code 可换
- 工具面刻意很小，核心是 `execute` 跑进该 scope 的沙箱

**不要抄：** Postgres 公司部署、Slack 插件、门户 SSO、组织管理员读 transcript。Enjoy 是单机 IDE，不是团队 quartermaster。

**可借鉴（落到本机）：** 命名审批姿态、工作区级钥匙串（只列名不露密）、审计时间线加深 Observability、cron 若将来做必须走同一条 `agent.run` + HMAC。

### Craft Agents — [README](https://github.com/craft-ai-agents/craft-agents-oss/blob/main/README.md) · [v0.11.0](https://github.com/craft-ai-agents/craft-agents-oss/releases/tag/v0.11.0)

Craft.do 自己用的 Electron 桌面。Claude Agent SDK + Pi SDK。文档优先，不是编辑器 fork。

一手能力：

- Multi-session **Inbox**：Todo → In Progress → Needs Review → Done，可 flag
- Sources：MCP / 粘贴 OpenAPI / Google·Slack·Microsoft REST / 本地盘。对 agent 说「把 Linear 加成 source」
- Skills 按工作区存，对话中 `@` 引用，改完不用重启
- 权限三档：Explore（只读）/ Ask to Edit / Auto；**SHIFT+TAB** 循环
- 多文件 diff 窗、附件（图 / PDF / Office 自动转）
- Automations：标签变更、日程、工具调用触发新会话
- v0.11：**Projects**（`projects/{slug}/` + `MEMORY.md` 注入）+ **Kanban**；Tasks 独立于聊天，Conductor 把任务拆成 DAG、用真实子会话执行
- 后台子 agent **跨回合存活**
- 助手气泡原生 Mermaid SVG + 全屏预览
- 可选无头 WebSocket 服务，桌面当瘦客户端

**不要抄：** 默认远程服务器、VPS 上跑工具循环。Enjoy 循环必须留在 main。

**可借鉴：** Inbox 状态机、`@` 技能/来源、SHIFT+TAB、Mermaid、Conductor=加深现有 Workflow（子步骤已是真 `agent.run`）、后台 delegate 不要跟父回合一起死。

### Synara — [README](https://github.com/Emanuele-web04/synara/blob/main/README.md) · [docs](https://www.trysynara.com/docs)

本地优先控制面：不卖模型，驱动你已经装的 Claude Code / Codex / Cursor / Antigravity / Grok / OpenCode / Pi / Droid。

分层：Project → Thread（任务）→ Provider session。工作区工具：Changes / Terminal / Browser / Files / Git。

一手能力：

- 并行任务默认 **managed git worktree**（独立目录 + 分支）
- 换引擎 handoff：同一任务、同一环境、换 runtime
- 持久线程目标：多回合 objective、暂停/继续、达成历史
- 线程 recap、notes、side chat
- Activity：运行中 / 审批 / 失败 / 刚完成，一个收件箱
- 浏览器验证 + WebMCP；快捷键 `mod+j` 终端、`mod+d` diff、`mod+shift+b` 浏览器
- Automations：可审草稿、停条件、连续失败自动关
- Agent Gateway：一个 Synara 任务协调其它任务（不能自我提权）
- External MCP：本机 Codex/Claude 可创建/跟随 Synara 任务
- Review & delivery：diff、commit、push、**PR 工作台**

**不要抄：** worktree（M5 锁）、GitHub PR 合并台（Review spec 不做 PR/CI）、把 Enjoy 做成「只托管别人 CLI、自己没有 ToolLoop」。Enjoy Local 仍是默认内核。

**可借鉴：** Activity 是 M2 Inbox 的下一刀；线程目标/Recap 是会话元数据；handoff 对齐正在做的 M3（摘要进 hidden，不进可见用户句）；Gateway 对齐 Workflow/delegate，不要第二套编排库。

### Zeron — [zeron.sh](https://zeron.sh/) · [README](https://github.com/zeronsh/comet/blob/main/README.md) · [ARCHITECTURE.md](https://github.com/zeronsh/comet/blob/main/ARCHITECTURE.md)

「不是新 harness」：在你的机器上跑 Claude Code / Codex / Cursor / Grok / Hermes / Pi，任意设备当视口。默认本地、无账号。可选登录才多设备。UI 是 gpui（Zed 那套），不是 Electron。

一手能力：

- Engine = 后端 daemon；UI = viewport。同一二进制 headed / headless
- 侧栏：按注意力排序的会话；Spaces = (设备, 文件夹)
- 页签是**本机视口**：关页签 ≠ 归档
- 运行中 **branch diff 活更新**、每工作区 commit 历史
- 三屏同会话：桌上开、手机看、沙发上批 diff（仅同步档）
- Composer：Send / **Steer** / Stop；QuestionPanel 暂替输入框
- MessageRail：用户句小地图
- 本机 profile 与同步 profile **启动时钉死**，登录不搬已有本地会话
- 同步档：Loro CRDT + Cloudflare Durable Objects。用量条刻意不做（CRDT 不适合）

**不要抄：** 多设备同步、WorkOS 账号、对端可读 gitignored `.env`（他们自己的威胁模型写明了）。Enjoy 明确不做云账号与 CRDT。

**可借鉴：** 注意力序会话列表、运行中 Changes 不停刷、关页签≠归档、Working 指示器不顶走 Composer、Steer 已有 followupQueue 可把文案做成三钮互斥。

---

## 3. 能在 Enjoy 现有壳里展示的（建议顺序）

只列「有现成挂点、用户能看见、不撞锁」。每条写：对照谁、挂哪、不要做成什么。

### A. 会话旗标 + 工作流状态 — Craft Inbox

- **挂：** 情境栏会话行 + ⌘L。状态用户可改：进行中 / 待审 / 完成；旗标钉住。
- **已有：** 归档、Attention `waiting_review`、侧栏「进行中」钉住 running。缺的是**用户打的**状态，不是运行时灯。
- **不要：** 再造第二套 Inbox 页。Inbox 仍是 Attention 档案。

### B. 助手气泡 Mermaid — Craft v0.3

- **挂：** 线程 Markdown（现 `streamdown`）。` ```mermaid ` 画 SVG，点击进审查栏全屏。
- **已有：** 生成式 UI 白名单 `card/form/table`。Mermaid 是只读展示，不调模型。
- **不要：** CDN mermaid.js；皮必须跟 BoardUI token，Craft 的 `color-mix` 思路可抄交互。

### C. Inbox → Activity — Synara v0.6.5

- **挂：** `#/inbox` 现成左右分栏。筛：运行中 / 等你 / 失败 / 刚完成；按工作区过滤。
- **已有：** L1 Strip + L2 Inbox 归档。Activity 是同一状态机的**阅读布局**，不是新 kind。
- **不要：** 在 Inbox 里画 Allow/Deny（M2 不变量）。

### D. 运行中 Changes 活刷新 — Zeron checkout diffs

- **挂：** Inspector Review，默认收起时也不要丢订阅。Agent 写盘已 `workspace.watch`。
- **已有：** 改动条、审查 live invalidate。缺的是「后台会话也在刷、侧栏能感到 +N/−M」。
- **不要：** 无 dirty 时自动拉开审查栏（ui 已知坑）。

### E. 会话目标芯片 + Recap — Synara persistent goals

- **挂：** Composer 上沿（PermissionDock 之上）一粒目标胶囊；空闲可「生成本轮 Recap」写入会话元数据，不进模型可见用户句。
- **已有：** Todo Dock 只吃**最后一条用户消息之后**的 `todo_write`。目标是跨回合的，Todo 是本轮的。
- **不要：** 把 Recap 当第一条助手消息；与 M3 handoff 一样走 hidden/system。

### F. `@` 技能与 MCP — Craft sources

- **挂：** 现有 Composer `@` 面板（已有文件/目录）。加一组「技能 / 已连 MCP」。
- **已有：** `/` 列技能，发送只写「去 `read_file` SKILL.md」。`@` 钉芯片更可见。
- **不要：** 把 SKILL.md 正文灌进气泡。

### G. SHIFT+TAB 循环审批档 — Craft

- **挂：** 现成 `ApprovalPolicyToggle`。三档对齐 Craft：Explore≈问答/规划只读、Ask≈现默认、Auto≈关写盘/Shell/Git 审批。
- **已有：** 底栏盾牌 + `permissionMode`。缺快捷键与「姿态」命名。
- **不要：** 再画上沿「写入自动 · Shell 需确认」条（ui 已删）。

### H. 用户句小地图 — Zeron MessageRail

- **挂：** 线程左侧极窄轨，只标用户轮。窄列隐藏。
- **不要：** 假进度条、假 token%。

### I. 本机钥匙串表面 — QM keychain（单机裁剪）

- **挂：** `#/settings/providers` 或账号安全卡：列出已存密钥/CLI 登录**名**，不露值、不露后四位（现规约）。
- **已有：** `safeStorage` + 「密钥已保存」。缺的是人能扫一眼的钥匙串，不是新保险柜。

### J. Workflow Conductor 可见化 — Craft Kanban/Conductor

- **挂：** `#/workflows` 已有 DAG。把步骤画成「真子会话」而不是配方卡片：点一步打开该子 run 的线程/审批。
- **已有：** `runWorkflowAgentStep` → 同一 `agent.run`。缺的是**看见**子会话，不是新编排引擎。
- **不要：** 把 Kanban 做成第二首页；不要假并行（workflow spec：步与步仍串行）。

---

## 4. 不要在本仓做的（以及为什么）

| 外来功能 | 来源 | 为什么不做 |
|---|---|---|
| Slack / 组织 Scope / 门户 SSO | QM | 云账号、多人；`product` 第一期无云 |
| 持久云沙箱当「电脑」 | QM | Enjoy 沙箱是工作区 Seatbelt，不是每用户一台 VM |
| 多设备 CRDT / Durable Objects | Zeron | 明确不做实时多端 CRDT |
| 远程可读 `.env` | Zeron 自己的威胁模型 | 安全红线 |
| Git worktree 舰队 | Synara / Zeron / Orca | **M5 产品锁** |
| GitHub PR 评论/合并台 | Synara | Review **不做** PR / CI |
| 默认无头远程、桌面当瘦客户 | Craft / Zeron | Agent 循环必须在本机 main |
| 团队 MCP / 摩擦 digest | — | **M6 锁**（技能源可选 pull 除外） |
| 把 Enjoy Local 降成「又一个 CLI 宿主」 | Synara 形态 | ACP 是轨道，不是唯一内核 |

Cron：四家都有（QM / Craft / Synara / Hermes）。Enjoy Automations 目前只有 `manual` / `on_save`，gap-audit 写过「没有 cron，不是漏做」。若做，必须：本机调度、同一 `agent.run`、停条件、失败自动关、审批不降级。先改 `settings` spec，再写代码。

---

## 5. 和已有对照文档的关系

- 高星 CLI/ADE（Orca / Cline / OpenHands / Goose / Hermes / OpenCode）：[`gap-audit-vs-github-agents.md`](./gap-audit-vs-github-agents.md)、[`oss-agent-landscape-2026.md`](./oss-agent-landscape-2026.md)
- 本文补的是 **2026 桌面控制面** 四家：公司 harness、文档型桌面、CLI 控制面、原生多设备视口
- 重叠课一致：隔离边界要诚实、审批要可见、自动化必须真跑、换引擎要交接摘要而不是假续跑

---

## 6. 一手源

- QM README（jsDelivr `yc-software/qm@main/README.md`）；[SECURITY.md](https://github.com/yc-software/qm/blob/main/SECURITY.md)；[Y Combinator 公告](https://qm.ycombinator.com/)
- Craft README；[v0.11.0 Projects & Kanban](https://github.com/craft-ai-agents/craft-agents-oss/releases/tag/v0.11.0)；[v0.13.3 重试可见进度](https://github.com/craft-ai-agents/craft-agents-oss/releases/latest)
- Synara README；[Worktrees](https://www.trysynara.com/docs/workflows/worktrees)；[Handoffs](https://www.trysynara.com/docs/workflows/handoffs)；[Automations](https://www.trysynara.com/docs/workflows/automations)；[Agent Gateway](https://www.trysynara.com/docs/workflows/agent-gateway)
- [zeron.sh](https://zeron.sh/)；comet `README.md` / `ARCHITECTURE.md` / `docs/research/feature-inventory.md`
