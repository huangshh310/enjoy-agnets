# spec/m2-attention

> M2 跨会话 Attention：上浮队列 + Permission 置顶 + Inbox 合流。最后更新：2026-09-08
> 范围：IA + 状态机 + **可开发视觉/组件合同**。皮走 BoardUI；禁 Fake-Status-Chrome / Centered-Marketing-Hero。
> 产品锁：**本 PR 只收 M2**。之后顺序：M3 → M4。
> 整段程序明确不做：M5 git worktree、M6 摩擦/digest/团队 MCP、M4 PTY 兜底。
> 可选后置（不在本 PR）：M5 会话状态灯 + 进程收尸；M6 skill-sources 可选 pull。
> 侧栏 `waiting_review` 灯后置 M5，本 PR 不做。

## 当前真相

| 表面 | 现状 |
|---|---|
| L1 AttentionStrip | `ai-chat/attention/attention-strip.tsx` 挂在 Stage 列顶（`stage-split.tsx`）。无 active/focused 则整条 `null`。胶囊按优先级排序；当前会话 Dock 已开时收成微点。`complete` 约 10s 自消，不计入「需处理 N」。 |
| L0 PermissionDock | `ai-chat/attention/permission-dock.tsx` 夹在 Conversation 与 Composer 之间（`chat-composer-cluster.tsx`），贴 Composer 上沿。`ApprovalCard` 已离开 `ConversationContent`。无 pending 则 `null`。 |
| L2 Inbox `#/inbox` | live Attention 档案；无假种子。`openSession` 必须带 `sessionId`（可带 `workspaceId`）。阅读器只有摘要 + 跳回。`complete` 默认已读、不占红点。 |
| 状态机 | `stores/attention/`：一槽一位 `(sessionId, kind)`；`active → focused → resolved\|dismissed\|expired`。切会话停车，不 abort。点胶囊：pending/ask → `#permission-dock`；error → `#thread-error-banner`；complete → `#thread-turn-end`。 |
| 策略一瞥 | 复用 `approval-policy-*`；`allow-all` 用 `text-text-error-primary` + `bg-background-tertiary-error`。不另做第二条栏。 |
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
| 挂载 | Stage 顶：标题栏下、主内容上；Chat 与其它模块均可见 |
| 布局 | 横向胶囊队列，`gap-1.5`，可横向滚；左侧可选「需处理 N」计数（`text-caption-2-medium text-text-secondary`） |
| 胶囊 | `h-8` · `rounded-lg` · `border border-border-button-default` · `bg-background-primary-default` · `shadow-2xs` · `px-2.5` |
| 胶囊内 | runtime `SessionAgentMark` / `AgentBrandIcon` 14px · 会话名截断 · kind 短标 · 相对时间 `text-text-tertiary` |
| kind 色 | `pending_approval` / `ask_user` → `text-text-error-primary` 微点；`error` → 同；`complete` → `text-accent-600`，无红点 |
| 点击 | `focusAttention(item)`（见下） |
| 空态 | 可见项为空 → `null` |
| 当前会话 | 若已 focused 且 Dock 打开，该会话胶囊收成 6px 微点（`aria-label`「本会话·处理中」），**不要**第二套按钮 |
| 动效 | 新项 `animate-in fade-in` ≤200ms；禁脉冲假活 |

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
| 内边距 | `px-8 py-3`（与线程左右对齐） |
| 内容 | 现有 `ApprovalCard` 三表面 + ask-user；底栏 HMAC 保留 |
| plan | 写盘默认 **展开** 真实 diff；禁 30s 倒计时自动放行 |
| 决策 | 仅 `allow` / `deny` / `allow_session`（ask-user 禁 session）；id 比较，禁译文相等 |
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

### 4. `AutoApproveBar`

| 项 | 合同 |
|---|---|
| 位置 | Composer 能力条旁或审批策略入口旁；复用 `approval-policy-*`，不另做第二条栏 |
| 文案 | 当前模式一瞥（如「写入需确认 · Shell 需确认」） |
| YOLO/All | `text-text-error-primary` + `bg-background-tertiary-error` 高警示 |
| token | BoardUI only；禁 `amber-500` / `rose-500` |

### 5. 侧栏会话灯（后置 M5）

本 PR **不做**。`waiting_review` 灯与进程收尸属可选后置，不挡 M2 验收。

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

- 新：`apps/desktop/src/renderer/src/components/ai-chat/attention/`
- 状态：`apps/desktop/src/renderer/src/stores/attention/`
- 挂载：`app-shell/layout/stage-split.tsx`（Strip）、`app-shell/chat/chat-composer-cluster.tsx`（Dock）
- Inbox：`inbox/lib/open-inbox-action.ts`、`inbox/lib/filter-inbox.ts`
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

- 切会话必须停车，不得 abort 后台轮；同会话刷新不得把正在跑的 run 置 idle。
- node:test 不要 value-import `@enjoy-agents/ipc-contract` 入口；`foreground-event.ts` 不要用无扩展名再 import 本地模块。
- Inbox 假种子会冒充 live Attention，已删；空库只走空态。

## 设计定稿补充（2026-09-08）

PermissionDock **钉在 Conversation 与 Composer 之间**，sticky 于 Composer **上沿**（不是 Conversation 顶部 pinned）。
