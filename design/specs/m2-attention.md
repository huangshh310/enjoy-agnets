# spec/m2-attention

> M2 跨会话 Attention：上浮队列 + Permission 置顶 + Inbox 合流。最后更新：2026-09-08
> 范围：IA + 状态机 + **可开发视觉/组件合同**。皮走 BoardUI；禁 Fake-Status-Chrome / Centered-Marketing-Hero。
> 产品锁：做 M2–M4；本文不含 M5 worktree / M6。

## 当前真相

| 表面 | 现状 | 问题 |
|---|---|---|
| 审批三表面 | `thread/approval/`：command / plan / questions；提问 `thread/ask-user/` | 卡在 `ConversationContent` 末尾，长线程埋底 |
| `pendingApproval` | `chat-store` 单槽，跟当前会话 | 后台会话要审批时前台无入口 |
| Inbox `#/inbox` | 种子时间线；`openSession`→`/` | 无 live Attention；不带 `sessionId` |
| 策略一瞥 | `approval-policy-menu.tsx` | 无常驻 AutoApproveBar |

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

**文件建议**：`ai-chat/attention/attention-strip.tsx` + `attention-store`（或 `chat-store.attentionItems`）

| 项 | 合同 |
|---|---|
| 挂载 | Stage 顶：标题栏下、主内容上；Chat 与其它模块均可见 |
| 布局 | 横向胶囊队列，`gap-1.5`，可横向滚；左侧可选「需处理 N」计数（`text-caption-2-medium text-text-secondary`） |
| 胶囊 | `h-8` · `rounded-lg` · `border border-border-button-default` · `bg-background-primary-default` · `shadow-2xs` · `px-2.5` |
| 胶囊内 | runtime `AgentBrandIcon` 14px · 会话名截断 · kind 短标 · 相对时间 `text-text-tertiary` |
| kind 色 | `pending_approval` / `ask_user` → `text-text-error-primary` 微点；`error` → 同；`complete` → `text-accent-600`，无红点 |
| 点击 | `focusAttention(item)`（见下） |
| 空态 | `items.length===0` → `null` |
| 当前会话 | 若已 focused 且 Dock 打开，该会话胶囊可收成 6px 微点或「本会话·处理中」，**不要**第二套按钮 |
| 动效 | 新项 `animate-in fade-in` ≤200ms；禁脉冲假活 |

**胶囊文案（i18n 键建议）**

| kind | 短标 |
|---|---|
| pending_approval | 待审批 |
| ask_user | 待回答 |
| error | 出错 |
| complete | 已完成 |

### 2. `PermissionDock`

**改**：`ai-chat-thread.tsx` — `ApprovalCard` **移出** `ConversationContent`。

| 项 | 合同 |
|---|---|
| 挂载 | `Conversation` 与 Composer **之间** sticky：`shrink-0 border-t border-separator-border bg-background-primary-default/95 backdrop-blur-sm` |
| 内边距 | `px-8 py-3`（与线程左右对齐） |
| 内容 | 现有 `ApprovalCard` 三表面 + ask-user；底栏 HMAC 保留 |
| plan | 写盘默认 **展开** 真实 diff；禁 30s 倒计时自动放行 |
| 决策 | 仅 `allow` / `deny` / `allow_session`（ask-user 禁 session）；id 比较，禁译文相等 |
| 滚动 | transcript 滚走时 Dock 仍钉在 Composer 上沿 |
| 无 pending | Dock 不占位（`null`） |

### 3. Inbox 合流（不嵌审批）

| 项 | 合同 |
|---|---|
| 路由 | 仍 `#/inbox` fill；不新路由 |
| live 行 | 由 Attention 事件写入；种子可保留作空库演示，有 live 后种子降级 |
| 行 UI | 现有 `inbox-row`：标题/摘要/时间；**无** Allow/Deny |
| CTA | 仅「回到会话」→ `openSession({ sessionId })` |
| action | 扩展载荷：`openSession` **必须**带 `sessionId`；禁止只 `navigate("/")` |
| 阅读器 | 摘要 + 元数据；不渲染 `ApprovalCard` |

### 4. `AutoApproveBar`

| 项 | 合同 |
|---|---|
| 位置 | Composer 能力条旁或审批策略入口旁；复用 `approval-policy-*` |
| 文案 | 当前模式一瞥（如「写入需确认 · Shell 需确认」） |
| YOLO/All | `text-text-error-primary` + `bg-background-tertiary-error` 高警示 |
| token | BoardUI only；禁 `amber-500` / `rose-500` |

### 5. 侧栏会话灯（M2 内可做）

| 态 | 表现 |
|---|---|
| running | 现有 `LoadingStateGlyph` drive |
| waiting_review | `size-1.5 rounded-full bg-text-error-primary` |
| idle | 无灯 |
| 点击 waiting | 同 `focusAttention` |

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

每 `(sessionId, kind)` 单槽。`waiting_review` = 该会话存在 active pending_approval | ask_user。

### `focusAttention(item)`

1. 模块 ≠ Chat → 进 Chat（不卸 `chat-store`）
2. `selectSession(sessionId)`
3. pending/ask → 确保 PermissionDock 挂载 + `scrollIntoView`
4. error → 现有 `ThreadErrorBanner` / `QuotaExhaustedCard`
5. complete → 滚到该轮助手 turn

---

## Token / Anti-patterns

- 审批铬语义：`text-error-primary` / `background-tertiary-error` / `border-error-default` / `accent-*`
- 禁 Fake-Status-Chrome（空 Strip、假进度、常绿灯）
- 禁第二套壳、禁居中营销 Hero
- 禁 Inbox 内嵌审批

## 代码锚点

- 新：`ai-chat/attention/`
- 改：`ai-chat-thread.tsx`、`inbox/lib/open-inbox-action.ts`、`inbox.types.ts`
- 复用：`thread/approval/*`、`thread/ask-user/`、`approval-policy-*`
- 契约：现有 HMAC / `ApprovalDecision`；不改签名模型

## 验收

1. A 前台闲聊、B 后台 pending → ≤3s Strip 出 B 胶囊
2. 点胶囊 → B + Dock 可决策；Inbox 无第二套按钮
3. 长 transcript 滚动时 Dock 仍在 Composer 上沿
4. 无 pending 时 Strip / Dock 均不占位
5. Inbox「回到会话」落到正确 `sessionId`

## 非目标

- M3 handoff、M4 Registry、M5 worktree、系统通知（可后挂同一 Item）
