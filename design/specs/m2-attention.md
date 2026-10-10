# spec/m2-attention

> M2 跨会话 Attention：上浮队列 + Permission 置顶 + Inbox 合流。最后更新：2026-10-10（output-error 进待验收；未执行才 omitComplete。审查决策仍在 renderer；需处理条浮层不顶开主区）
> 范围：IA + 状态机 + **可开发视觉/组件合同**。皮走 BoardUI；禁 Fake-Status-Chrome / Centered-Marketing-Hero。
> 产品锁：M2 已落地。之后顺序：M3 → M4。
> 整段程序明确不做：M5 git worktree、M6 摩擦/digest/团队 MCP、M4 PTY 兜底。
> ACP 异常子进程收尸已落地（启动账本 SIGKILL）。M6 skill-sources 可选 pull 已另 PR 薄层落地。
> 侧栏 `waiting_review` 红点已在 `SidebarSessionRow`（Attention 槽 `pending_approval` / `ask_user` 且 active/focused）。后台 running 读 `parks`，情境栏顶「进行中」是钉住不是新 kind。这不是 M5 worktree。
> Inbox 行人话显示名是 **P2**（已接线引擎级）：[`../references/p2-agent-display-name.md`](../references/p2-agent-display-name.md)；【视觉真源】[`../previews/p2-agent-display-name.html`](../previews/p2-agent-display-name.html)。Inbox 行主标题 `{显示名或品牌} · {会话题}`，悬停 `{品牌} · 真名`。侧栏会话行主行只写会话题，引擎身份走左侧品牌标，不把供应商名当会话名。不抄小队/看板。会话覆盖本刀不做。

## 当前真相

| 表面 | 现状 |
|---|---|
| L1 AttentionStrip | `ai-chat/attention/attention-strip.tsx` 浮动居中于 Stage 顶（`stage-split.tsx`），绝对定位叠在内容上，**不**给主区加 `pt-12`，出现/消失不把工作台顶下约 32px。支持一键关闭及单项关闭。无 active/focused 则整条 `null`。胶囊按优先级排序；当前会话 Dock 已开时收成微点。主标签是界面语言的 kind（待审批 / 待回答…），`min-w-32`，会话题只进 `title`。`complete` 约 10s 自消，不计入「需处理 N」。`approval.resolved`（含 deny）只收未决槽，不当 `error`；需处理随拍板清零。新 `pending_approval` / `ask_user` 进场时 `resolveTerminalSlots` 只收同会话 complete，未处理的 error 保留，禁止「需处理」和「已完成刚刚」叠出。 |
| L0 PermissionDock | `ai-chat/attention/permission-dock.tsx` 夹在 Conversation 与 Composer 之间（`chat-composer-cluster.tsx`），贴 Composer 上沿。`ApprovalCard` 已离开 `ConversationContent`。`desktop_act` 走桌面名片（`desktop-approval-card.tsx`：缩略图 + `desktopActApprovalText` + 可选 appKey 副标题；四选一 `approval-allow` / `approval-session` / `approval-always-app` / `approval-deny` 映射 `allow` / `allow_session` / `allow_always` / `deny`，底栏「继续」才落决策），不是裸「允许桌面工具」。`needs_second_confirm` 走同一张 `desktop-approval-card.tsx` 的 warn/danger 变体（并排新旧缩略图；`approval-second-confirm-allow` / `approval-second-confirm-cancel` 仍映射 `allow` / `deny`；缺图禁用主钮；不露始终允许）。仅 `args.sensitive === false` 且有稳键时默认「本会话允许」，始终允许不再 featured。`bypassesSessionAllow` 划掉本会话/始终允许（无稳键不画始终允许）；敏感（缺字段也算）或缺 appKey 则不画这两项并默认「允许一次」；敏感警示「这是敏感应用，每次都会问你」。无 pending 则 `null`。 |
| L2 Inbox `#/inbox` | live Attention 档案 + SQLite 归档；无假种子。分栏采用 IDE 级双栏同步基线（左栏 384~416px 列表带专属快速已读/清理工具栏，右栏卡片流阅读器带状态徽标、会话ID快速复制、状态详情与「打开会话」跳转按钮；`SecondaryPageShell` 使用 `hideChrome` 杜绝多重顶栏）。行卡片包含状态 pill、未读指示点、`{显示名或品牌} · {会话题}`（P2，悬停引擎真名）、摘要/错误预览与时间。**M-C 安静 Inbox**：侧栏筛选只有 **`approval`（拍板） / `needs_review`（待验收） / `failed`（失败）**，默认 `approval`。拍板 = `pending_approval` + `ask_user`。待验收行由会话 `workflowStatus === "needs_review"` 合成，不是 Attention kind；**只有宣称收工且本轮有已执行工具（或纯聊天无工具）的 `run.end` 才标 `needs_review`**。本轮工具全是拒绝 / 未执行：回 `todo`，Attention **不** upsert `complete`（不弹「已完成」）。`run.error` / 用户取消保持 `in_progress`，走失败筛（取消文案含 abort →「已取消」），不进待验收、不进拍板角标。完成 / 运行中 / 读文件刷屏不进默认列；运行中仍只在侧栏「进行中」。轨徽标与页内数字徽标 = **拍板数**（`stripApprovalCount`），不计待验收 / 失败 / 完成 / 运行中。`openSession` 必须带 `sessionId`。阅读器只有摘要 + 跳回；失败阅读器无通过/打回。**耐久层**：`inbox_state`（migration 005）；renderer `persist-attention.ts` 写穿；实况优先、归档补位；隐藏超 30 天 list 时清理。 |
| 状态机 | `stores/attention/`：一槽一位 `(sessionId, kind)`；`active → focused → resolved\|dismissed\|expired`。切会话停车，不 abort。点胶囊：pending/ask → `#permission-dock`；error → `#thread-error-banner`；complete → `#thread-turn-end`。 |
| 侧栏进行中 | `sidebar/session-activity.ts`：当前会话跟 Composer `running`，后台跟 `parks[id].running`。等你红点优先于 drive 灯。情境栏顶「进行中」钉住最多 8 条；无则 `null`。不把 `running` / `complete` 加成 Attention kind。侧栏点会话只走 `selectPersistedSession`，**不得**因未决审批 `focusAttention` 抢回那条会话；抢导航只允许用户点 Strip / Inbox / handoff。 |
| 审批策略 | 会话内只走 Composer 底栏盾牌（`ApprovalPolicyToggle` /「编辑」）。智能体设置用共享摘要条跳 `#/settings/general` 已有权限卡，不另画上沿「写入 / Shell / Git」一瞥，也不做第二套 Allow/Deny。执行模式（探索 / 执行）是另一件事。 |
| plan diff | 写盘默认展开真实 diff；无 30s 自动放行。 |

完成标准：后台会话要审批时，前台 **≤3s** 可见入口；点击跳回并可决策。

## 原则：三层叠，不造第二套壳

```
L1 AttentionStrip（跨会话入口）— 发现 / 跳转 / 计数
L0 PermissionDock（会话内决策）— 唯一 Allow·Deny·ask-user；HMAC
L2 Inbox（耐久归档）— 摘要 + 跳回；禁止内嵌审批按钮
```

- Inbox / Toast / Modal **不得**再造 Allow/Deny。
- AttentionStrip 是薄条，不是页面、不是第二通知中心。
- 无 active 项时 Strip **整条不渲染**（禁常驻灰条 / 常绿灯）。

---

## 组件合同

### 1. `AttentionStrip`

**文件**：`ai-chat/attention/attention-strip.tsx` + `stores/attention/`

| 项 | 合同 |
|---|---|
| 挂载 | Stage 顶浮动居中：标题栏下、主内容上；Chat 与其它模块均可见。浮层不占位，主区不因条出现而加 `pt-12` |
| 布局 | 居中浮动微胶囊（`rounded-full` · `border` · `backdrop-blur-md` · `shadow-card`），内含「需处理 N」脉冲指示、胶囊流及右侧关闭按钮；点击关闭忽略当前可见项 |
| 胶囊 | `h-7` · `rounded-full` · `border border-border-button-default/70` · `bg-background-secondary-default/80` · 内嵌单项关闭 `X` |
| 胶囊内 | runtime `SessionAgentMark` 14px · 会话名截断 · kind 短标 · 相对时间 `text-text-tertiary` · 独立关闭 `X` |
| kind 色 | `pending_approval` / `ask_user` → `text-text-error-primary` 微点；`error` → 同；`complete` → `text-accent-600`，无红点 |
| 点击 | 点击内容区 `focusAttention(item)`；点击 `X` 触发 `dismissAttentionSlot` |
| 空态 | 可见项为空 → `null` |
| 当前会话 | 若已 focused 且 Dock 打开，该会话胶囊收成 6px 微点（`aria-label`「本会话·处理中」），**不要**第二套按钮 |
| 动效 | 新项 `animate-in fade-in-50 slide-in-from-top-2` ≤200ms；禁脉冲假活 |

**胶囊文案（i18n：`attention.kind.*`）**

| kind | 短标 |
|---|---|
| pending_approval | 待审批 |
| ask_user | 待回答 |
| error | 出错 |
| complete | 已完成 |

### 2. `PermissionDock`

**改**：`ApprovalCard` **移出** `ConversationContent`。

| 项 | 合同 |
|---|---|
| 挂载 | `Conversation` 与 Composer **之间** sticky：`shrink-0 border-t border-separator-border bg-background-primary-default/95 backdrop-blur-sm` |
| 内边距 | `px-5 py-1`。无真实截图不占空盒子。Dock **不**限高内滚。对话列保底 `min-h-52`（208px ≥ 200px）；有审批时 Composer 簇可让位滚动。 |
| 内容 | 现有 `ApprovalCard` 三表面 + ask-user；底栏 HMAC 保留。有审批时不画「N 个文件已改」叠轨，避免盖住「继续」。 |
| plan | 写盘 diff 默认 **收起**；禁 30s 倒计时自动放行 |
| 决策 | `allow` / `deny` / `allow_session` / `allow_always`（ask-user 禁 session/always；桌面卡才露 always）；id 比较，禁译文相等 |
| 滚动 | transcript 滚走时 Dock 仍钉在 Composer 上沿；`id="permission-dock"` 供 `scrollIntoView` |
| 无 pending | Dock 不占位（`null`） |

### 3. Inbox 合流（不嵌审批）

| 项 | 合同 |
|---|---|
| 路由 | 仍 `#/inbox` fill；不新路由 |
| live 行 | 由 Attention 事件写入；**无假种子**，空库走空态 |
| 行 UI | 现有 `inbox-row`：标题/摘要/时间；**无** Allow/Deny |
| CTA | 仅「回到会话」→ `openSession({ sessionId })` |
| action | `openSession` **必须**带 `sessionId`；禁止只 `navigate("/")` |
| 阅读器 | 摘要 + 元数据；不渲染 `ApprovalCard` |
| 轨徽标 | Inbox 轨图标只标**拍板**计数（pending_approval / ask_user）；失败 / 待验收 / complete / running 不计 |
| 导航 | `InboxCategory`：approval / needs_review / failed。行内 `category` 仍可是 agent/system，**不要**把主导航改回「智能体 / 系统」，也不要加回全部 / 运行中 / 刚完成 |

### 4. 审批策略（无上沿一瞥）

写入 / Shell / Git 在底栏盾牌菜单或 `#/settings/general` 权限卡改（智能体页只给摘要 +「管理审批策略 →」）。**不要**再画 `AutoApproveBar` 或 Composer 顶沿状态行。YOLO/All 的警示色出现在盾牌本身，以及智能体摘要条的警示态。决策仍只在 PermissionDock / 策略菜单，不在发现条里嵌全表。

### 5. 侧栏会话灯 / ACP 收尸

侧栏 `waiting_review` 灯已做。后台 running 读 `parks`，与当前会话 Composer `running` 合成；「进行中」钉住不是第四层 Attention。ACP 子进程账本：`userData/acp-children.json`，启动核对 comm 后 SIGKILL。这不是 M5 worktree。

---

## 状态机

### AttentionItem

```
kind: pending_approval | ask_user | error | complete
sessionId / workspaceId / runId?
priority: pending_approval(0) > ask_user(1) > error(2) > complete(3)
```

```
事件 ──► active ──点击──► focused ──决策/关掉──► resolved | dismissed | expired
           ▲                      │
           └──── 同 session 同类覆盖（单槽）
```

| 源 | Strip | Inbox | 红点 |
|---|---|---|---|
| `approval.required`（非 automatic） | ✓ | 未读 | ✓ |
| ask_user pending | ✓ | 未读 | ✓ |
| run.error / L4 | ✓ | 未读 | ✓ |
| run.end success | ✓ 短时(~10s 可自消) | 已读 | ✗ |

每 `(sessionId, kind)` 单槽。`waiting_review` = 该会话存在 active pending_approval | ask_user（灯后置）。

### `focusAttention(item)`

1. 模块 ≠ Chat → 进 Chat（不卸 `chat-store`）
2. `selectPersistedSession(sessionId)`（跨工作区先切 `workspaceId`）
3. pending/ask → 确保 PermissionDock 挂载 + `#permission-dock` `scrollIntoView`
4. error → 现有 `ThreadErrorBanner` / `QuotaExhaustedCard`（`#thread-error-banner`）
5. complete → 滚到 `#thread-turn-end`；槽位标 resolved

---

## Token / Anti-patterns

- 审批铬语义：`text-error-primary` / `background-tertiary-error` / `border-error-default` / `accent-*`
- 禁 Fake-Status-Chrome（空 Strip、假进度、常绿灯）
- 禁第二套壳、禁居中营销 Hero
- 禁 Inbox 内嵌审批

## 代码入口

- 新：`apps/desktop/src/renderer/src/components/ai-chat/attention/`（`focusAttention({ sessionId, … })` 唯一入口；M3 阻切也走当前会话，禁止无参滚 Dock stub）
- 状态：`apps/desktop/src/renderer/src/stores/attention/`
- 侧栏进行中：`ai-chat/sidebar/session-activity.ts`、`sidebar-active-sessions.tsx`
- 挂载：`app-shell/layout/stage-split.tsx`（Strip）、`app-shell/chat/chat-composer-cluster.tsx`（Dock）；审批策略：`approval-policy-toggle.tsx`；设置发现性：`settings/approval-discover/`
- Inbox：`inbox/lib/open-inbox-action.ts`、`inbox/lib/filter-inbox.ts`、`inbox/lib/synthesize-needs-review-inbox.ts`
- 复用：`thread/approval/*`、`thread/ask-user/`、`approval-policy-*`
- 契约：现有 HMAC / `ApprovalDecision`；不改签名模型

## 验收

1. A 前台闲聊、B 后台 pending → ≤3s Strip 出 B 胶囊
2. 点胶囊 → B + Dock 可决策；Inbox 无第二套按钮
3. 长 transcript 滚动时 Dock 仍在 Composer 上沿
4. 无 pending 时 Strip / Dock 均不占位
5. Inbox「回到会话」落到正确 `sessionId`

## 非目标

- 本 PR：M3 handoff、M4 Registry
- 整段程序：M5 git worktree、M6 摩擦/digest/团队 MCP、M4 PTY 兜底
- 可选后置：M5 会话状态灯 + 进程收尸；M6 skill-sources 可选 pull
- 系统通知（可后挂同一 Item）

## 已知坑

- 需处理条出现时主区往下跳。根因：`stage-split` 曾用 `pt-12` 给条留空。正确做法：条 `absolute` 浮层，主区不加垫，出现/消失不改布局高度。
- **隐患**：Inbox「未读」出现大量「运行中」→ 合成 running 被标成未读。正确做法：`synthesize-running-inbox.ts` 固定 `read: true`；`inboxNavCounts.unread` 只计 `!read`。running 不得加成 Attention kind。
- **隐患**：导航仍按「智能体 / 系统」或「全部 / 运行中」筛 → 旧 IA 残留。正确做法：筛 `InboxCategory` 的 approval / needs_review / failed。
- **隐患**：Inbox 轨徽标把失败 / 待验收算进去。正确做法：`stripApprovalCount` 只计拍板（pending_approval / ask_user）。
- **隐患**：一轮 `run.end` 直接标 `done`、刷 complete Inbox，或把失败/取消也一律 `needs_review`（#47 曾一刀切）；写盘被拒绝后仍弹「已完成」并进待验收。正确做法：只有 Agent 宣称收工且本轮有已执行工具（或纯聊天）的 `run.end` 进待验收；本轮工具全未执行则回待办且 `omitComplete`。写盘 `output-error`（无未执行码）可能已改盘，进待验收并列出 path。`run.error` / 用户 abort 保持 `in_progress`，走 Inbox 失败筛（取消文案含 abort →「已取消」）。取消后泵不得再发 `run.end`。只有人点「通过」才能 `done`。产品锁：[../references/m-cbd-f1-review-taxonomy.md](../references/m-cbd-f1-review-taxonomy.md)。审查 / Attention 决策仍在 renderer（迁 main 是下一刀，不在本 PR）。
- **隐患**：complete 10s TTL 未过又来一张审批，Strip 会同时亮「需处理」和「已完成」。正确做法：新审批进场先 `resolveTerminalSlots`（只收 complete）。拒绝只走 `approval.resolved`，不要把 deny 折成 `run.error` 计需处理。
- 切会话必须停车，不得 abort 后台轮；同会话刷新不得把正在跑的 run 置 idle。侧栏未决审批只加红点，禁止 `focusAttention` 把用户拽回待批会话（Strip / Inbox / handoff 才跳）。
- node:test 不要 value-import `@enjoy-agents/ipc-contract` 入口；`foreground-event.ts` 不要用无扩展名再 import 本地模块。
- Inbox 假种子会冒充 live Attention，已删；空库只走空态。
- 不要再画 Composer 上沿「写入自动 · Shell 需确认 · Git 需确认」。它和底栏盾牌是同一份策略，会多一条常驻铬；通栏色带还会把线程切断。「模式: 智能体」是执行模式，不是审批。

## 设计定稿补充（2026-09-08）

PermissionDock **钉在 Conversation 与 Composer 之间**，sticky 于 Composer **上沿**（不是 Conversation 顶部 pinned）。
