# Enjoy × Multica 差距分析

> 位置：`design/references/multica-gap.md`。落地以 `design/specs/` 为准；本文是产品对照，不是实现说明书。  
> 产品第一稿 · 2026-09-20  
> 一手源：[Multica](https://www.multica.ai/) · [multica-ai/multica](https://github.com/multica-ai/multica) · 本仓 spec「当前真相」  
> 约束：抄**会话工单节奏**，不抄团队看板架构。假 BYOK / 沙箱上轨 / worktree 舰队 / 云账号仍砍。

---

## 1. 结论（先看这个）

**Multica 卖的是团队看板派工**（issue 当任务、agent 当队友、daemon 在多机上认领）。**Enjoy 卖的是本地优先 ACP 会话宿主**（本机 Electron、HMAC 审批、三卡片工位）。

两者都接多 CLI / ACP，但产品中心不是同一层。Enjoy 该抄的是 Multica 把「一次工作」说清楚的**节奏**（工单 → 评审门 → 安静 Inbox → 本轮账本），不是把 Chat 改成看板、也不是把 Registry 改成插件店。

已经有的面不要重建。本轮不做看板 / 小队。

---

## 2. 形态对照

| | Multica | Enjoy |
|---|---|---|
| 中心物体 | Issue / 看板列（enqueue → claim → start → complete/fail） | Session / 一轮 `agent.run` |
| 人怎么派活 | 把 agent 当 assignee，像派同事 | Composer 选引擎，发一轮，审批停在 PermissionDock |
| 执行落点 | 本机或云盒上的 **daemon**；可多机 | Electron **main**；工作区位置可以是本机或 SSH（P0-R） |
| 扩展 | 团队技能库、23+ CLI、IM 通道 | Skills / MCP 本机真源、Registry 装 ACP CLI |
| 默认协作 | 人 + agent 小队、角色、云/Helm 可自托管 | 单机本地优先；`#/settings/team` 诚实空态 |

一句话：**抄 cadence，不抄 architecture。**

---

## 3. 已经有的，不要重建

这些面在 Enjoy 已经是真源或已排进现队列。对照 Multica 时只加深 seam，禁止再开一套平行产品名。

| Enjoy 已有 | Spec / 参考 | 不要误建成 |
|---|---|---|
| 多 CLI + ACP Registry | `agent-cli` · `m4-acp-registry` | 第二套「26 家 runtime 花名册」或插件店 |
| Skills / MCP 真源 | `skills` · `mcp` · `plugin-extensions-hub.md` | 团队技能云、跨机同步市场 |
| Inbox + Attention / Dock | `m2-attention` | 第二通知中心、Inbox 内嵌 Allow/Deny |
| Usage L1–L4 | `m1-usage-and-capabilities` | 自营积分条、假套餐 |
| Sources 明细 + 浏览器预览 | `ui`（P0-G / P0-F） | 再做一张「来源」页 |
| Automations 壳 + **I4** backlog | `settings` · `emerging-agent-innovation.md` | 新品牌 Autopilot / 假 cron（执行面仍只有 `manual` / `on_save`） |
| P0-R SSH 远程工作区 | `remote` · `p0-r-remote.md` | 多机 daemon 工作区、云 harness 上轨 |

I4（cron / webhook）**还没落地**（`product` V1：I3–I7 未落地）。「已经有」指的是 **ID 与壳**，不是调度器。M-E 必须等于 I4，不要另起编号。

---

## 4. 可抄候选（M-A … M-H）

抄的是节奏与门闩，落点必须进现有壳。

| ID | 抄什么 | Multica 原意 | Enjoy 落点（建议） | 不要做成 |
|---|---|---|---|---|
| **M-A** | 会话工单 | Issue 有生命周期，不是裸 prompt | 现有 `workflowStatus` / Goal 芯片做成**可见工单**：目标 · 阶段 · 下一动作；发送即 claim | 看板列、assignee 小队 |
| **M-B** | 评审门 | 做完先 `in_review`，人说了才 done | 一轮收工后进入「等人看结果」；Keep / Undo / 打开 Review；**≠** HMAC 工具审批 | 第二套 Allow/Deny、云多租户审批 |
| **M-C** | 安静 Inbox | Inbox 默认可行动；运行中不当未读 | 默认 `unread` / 等你；running 只留侧栏「进行中」；complete 不刷红点（M2 已有一半） | 把 Inbox 做成第二会话树 |
| **M-D** | 本轮账本 | 任务执行史：步骤 + 耗时 | 与 **P0-G Sources** 合并：sheet 下半是本轮步骤账本（读 `run_steps`），不上新页 | 再造 Observability 大盘 |
| **M-E** | Automations = **I4** | Autopilot / cron standup | 只加深已有 Automations：`cron` / webhook；诚实本地 | 新「Autopilot」产品、假装 cron 已跑 |
| **M-F** | 重试 / 超时 | 失败重试保留已做工作 | 可见超时 + 用户点重试走 checkpoint（`ai.resume`）；cancelled 仍不自动复活 | 无限自动重试、静默吞错 |
| **M-G** | 聊天双按钮 | 发送与停止同时在；fire-and-forget | Composer **同时**留发送（入队 / 纠偏）与 Stop；切走不抢焦点 | 改回 XOR 之前先改工单语义（与 M-A 一刀） |
| **M-H** | 轻量挂仓 | Project resource 挂 repo / 本地目录 | 只读挂第二条本地路径当 `@` 上下文；仍一个 workspace host | worktree 舰队、多机 daemon、假本地副本 |

### M-A 会话工单

Enjoy 已有 Goal 芯片与 `todo | in_progress | needs_review | done`，但发送仍像「再聊一句」。要抄的是：**这一轮是一张工单**——目标写在会话上，状态跟人走，完成必须过 M-B，而不是再画一张看板。

### M-B 评审门

HMAC / PermissionDock 管的是**工具能不能跑**。评审门管的是**跑完能不能收工**。Composer 已有 Undo All / Keep All / Review，缺的是收工后默认停在 `needs_review`，而不是直接变 complete 并刷 Inbox。

### M-C 安静 Inbox

M2 已经：running 合成行固定已读、轨徽标只计可行动、complete 默认已读。仍吵的是默认筛 `all`、Inbox 里还能看见一排 running。安静 = 默认未读/等你；running 回到情境栏「进行中」。

### M-D 本轮账本

Observability 是诊断面。账本是**这一轮对人说了什么**：读了哪些文件、改了哪些、跑了哪些命令、各花多久。P0-G sheet 已有文件 / 技能 / MCP 出处；下一步把 `run_steps` 接进同一张 sheet，不要新开「Ledger」模块。

### M-E = I4

`emerging-agent-innovation.md` 的 I4 已是「Automations 日程 + webhook」。Multica Autopilot 对上的就是它。Zod 里的 `cron` **尚未执行**（`settings` 已知坑）。落地前 UI 不得假装会准点跑。

### M-F 重试 / 超时

超时与 `run_steps` / checkpoint 已在 `agent-runtime`。缺口是 C 端「超时了，保留进度重试」而不是再开一轮空会话。Workflow 的 `retry` 可带 `stepId`，Agent run 不要另发明一套。

### M-G 双按钮

当前合同：有草稿才发送，空草稿运行中才 Stop（互斥）。Multica 侧是发送不抢焦点、停止始终可及。与 M-A 一起改：发送 = 认领/续跑工单，Stop = 停泵回 idle（仍不可恢复 pause）。

### M-H 轻量挂仓（P2）

P0-R 已经解决「工作区在哪台机器」。M-H 只解决「这一轮还想只读另一条路径」。禁止因此复活 M5 worktree，也禁止做成 Multica 式多 daemon 工作区。

---

## 5. 明确不抄

| 不抄 | 原因 |
|---|---|
| 看板中心 UX | Enjoy 中心是会话与三卡片工位，不是 issue 列 |
| Squads / 人机小队 | 本地单机；团队页保持诚实空态 |
| 多机 daemon 工作区 | 远程 = SSH 位置（P0-R），不是舰队控制面 |
| 飞书 / 钉钉一等公民 | IM 网关与「本地优先、不做云账号」冲突；Slack 等同样后置 |
| Web / iOS 客户端 | 桌面壳是真源 |
| Helm / K8s 发行 | 不是 V1 交付面 |
| Worktree 舰队 | 产品锁已砍 M5 |
| 团队技能云 | Skills 真源在本机 `skill-sources`，可选 Git 拉取不是云库 |
| Registry 当插件店 | Registry 只装 ACP CLI；MCP / Skills 各有模块 |

---

## 6. RICE 粗排（本轮）

R/I/C/E 各 1–10，分≈ R×I×C÷E。只给**抄节奏**项打分；看板 / 小队不进本表。

| ID | 项 | ≈分 | 级 | 一句话 |
|---|---|---|---|---|
| **M-C** | 安静 Inbox | ~90 | **P0** | 默认未读/等你；running 滚出 Inbox |
| **M-B** | 评审门 | ~72 | **P0** | 收工先 `needs_review`，Keep/Undo/Review |
| **M-D** | 本轮账本 | ~60 | **P0** | **并进 Sources G**，不新开页 |
| **M-A** | 会话工单 | ~40 | **P1** | 与 M-G 同一刀：发送=认领工单 |
| **M-G** | 聊天双按钮 | ~40 | **P1** | 发送与 Stop 同时在；切走不抢焦点 |
| **M-F** | 重试 / 超时 | ~32 | **P1** | 可见超时 + checkpoint 重试 |
| **M-E** | Automations = I4 | ~35 | **P1** | **就是 I4**，不新开 ID |
| **M-H** | 轻量挂仓 | ~16 | **P2** | 只读第二条路径；不碰 worktree |

本轮顺序：

```text
P0   M-C 安静 Inbox → M-B 评审门 → M-D 账本（并 Sources G）
P1   M-A / M-G 工单+双按钮 → M-F 重试 → M-E = I4
P2   M-H 轻量挂仓
砍   看板 · 小队 · 多机 daemon · IM 一等 · Web/iOS · Helm · worktree 舰队 · 技能云 · Registry 商店
```

---

## 7. 与现队列

| 现项 | 和本文的关系 |
|---|---|
| M2 Inbox / Attention | M-C 是加深，不是新模块 |
| P0-G Sources | M-D 合并进这张 sheet |
| P0-F 预览 | 不动；评审门可链到「在浏览器打开」 |
| I4 Automations | **= M-E** |
| P0-R SSH | 远程位置已有；M-H 不是第二套远程 |
| I3 Registry 花名册 | 继续只装 CLI，不抄 Multica 插件店 |
| I5 跨引擎检索 | 独立；不要跟 Inbox 安静化捆成一刀 |
| I7 CI 失败再跑 | 与 M-F 相邻但更后；本轮只做本机 run 重试 |

冲突时以 `design/specs/*` 为准。规划写进本文但没做的，不得写进 spec「当前真相」。

---

## 8. 已知坑（对照时容易踩）

- **现象**：把 Multica 的 26 家 CLI 清单当成 Enjoy 缺口。**根因**：Enjoy Registry / 密表已经是本机 CLI 真源。**正确做法**：缺的引擎走 M4 comingSoon 门闩，不要重做花名册。
- **现象**：把 Inbox 做成「所有 run 的活动流」。**根因**：Multica 活动时间线是团队看板附属。**正确做法**：M-C；活动细节进会话与 M-D。
- **现象**：新开 Autopilot / Ledger / Board 路由。**根因**：对照文档被当成实现说明书。**正确做法**：I4 仍是 `#/settings/automations`；账本并 P0-G；不新开看板。
- **现象**：把 M-B 做成第二套工具审批。**根因**：`in_review` 和 `waiting_review` 都叫「评审」。**正确做法**：`waiting_review` = HMAC 停泵；M-B = 收工后门闩。

---

*第一稿。实现前先改对应 spec「当前真相」；本文过时可以修，但不能单独当接线依据。*
