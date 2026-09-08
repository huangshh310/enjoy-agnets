# spec/m3-engine-handoff

> M3 引擎切换与空态：空会话直切、有历史 handoff、未装态、三路微文案、空态 checklist。最后更新：2026-09-08
> 产品锁：M2 收完后做本文，再做 M4。整段程序不做：M5 git worktree、M6 摩擦/digest/团队 MCP、M4 PTY 兜底。
> 可选后置：M5 会话状态灯 + 进程收尸；M6 skill-sources 可选 pull。
> handoff 摘要注入 system/hidden + 可关「已交接」微条，**禁止**当第一条可见用户消息。
> BoardUI；禁 Fake-Status-Chrome / Centered-Marketing-Hero。

## 当前真相

| 点 | 现状 |
|---|---|
| 切引擎 | 空会话：`planComposerSwitch` → `setRuntimeId` + `bindSessionRuntime`，无卡 |
| 有历史切换 | `EngineHandoffCard` 确认后 `disposeAcpSession` + `setHandoff`；brief 只进系统/隐藏上下文 |
| 取消 | 恢复 from：`chat.runtimeId` + Picker/Rail `tabId`；不 `bindSessionRuntime` |
| 阻切 | 取消，或「去处理审批」：恢复 from 并 `focusAttention({ sessionId, kind, navigate })` 落到当前会话 PermissionDock |
| 已交接条 | Composer 上沿微条，仅 `{from} → {to}`，可 dismiss；不展示摘要、不进用户气泡 |
| 未装 | Rail/Picker 灰态；点开 `agent-cli-install`；就绪灯只信 `status===ready` |
| 空态 | `empty-state` 工作清单：ready 单行 / missing 单 CTA / 3 条示例 pill；`max-w-xl` 顶对齐；**禁止**嵌 `AgentCliInstall` 整卡 |
| 三路 | Enjoy 本地 / ACP 本机 CLI 上轨；沙箱 `showOnEngineRail:false` |

完成标准：Claude→Cursor 且已有用户轮时，**不会**静默丢上下文或假续跑。

## IA

### 1. 空会话切引擎（直切）

条件：当前会话 **无用户轮**（或仅系统占位）。

```
选中 runtimeId
  → setRuntimeId + bindSessionRuntime(sessionId, runtimeId)
  → 不弹手递卡
  → 若 ACP：新桥；若 enjoy-local：ToolLoop
```

Rail / Picker 选中即生效；未 `ready` 见 §4。

### 2. 有用户轮切引擎 → `EngineHandoffCard`

条件：已存在 ≥1 条用户消息。

**拦截**：`planComposerSwitch(from, to)` 先进入 pending 态，**不**立刻换桥。

#### 组件 `EngineHandoffCard`

| 项 | 合同 |
|---|---|
| 形态 | Composer 上方芯片卡（非居中 Hero、非全屏 Modal）· `rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card max-w-[40rem]` |
| 标题 | 切换引擎 |
| 正文 | `{fromLabel} → {toLabel}` + 一句话：将结束当前引擎会话，并把摘要交给新引擎 |
| 摘要区 | 可编辑 textarea（默认自动摘要最近轮：目标/文件/未决审批）；`text-caption-1-regular` |
| 主钮 | 确认切换（`accent`） |
| 次钮 | 取消（恢复 from 选中态） |
| 确认后 | `disposeAcpSession(from)`（若 ACP）→ `bindSessionRuntime(to)` → 摘要注入 **系统/隐藏上下文**（不进用户气泡）；线程或 Composer 上沿出「已交接」微条（from→to，可dismiss）。**禁止**伪装成用户首条附注 |
| 未决审批 | 若 `pendingApproval`：默认 **阻切**。卡上只有取消（恢复 from）或「去处理审批」（`focusAttention` → `#permission-dock`） |

禁静默切换。禁假「已在新引擎续跑」而无 dispose。

### 3. `planComposerSwitch` 状态机

```
idle ──选 to──►
  ├─ emptySession → apply(to) → idle
  └─ hasUserTurns → handoff_pending(from,to,draftSummary)
         ├─ confirm → disposing → bind(to) → injectSummary → idle
         └─ cancel → restore(from) → idle
blocked_by_approval（有 pending）→ 仅取消或去处理 Attention
```

### 4. 未装 / 未就绪

| 态 | UI |
|---|---|
| `status===ready` 或 enjoy-local | 可选中，正常 |
| `missing` | Rail/Picker 灰态；点开 `agent-cli-install`：安装 / 复制命令 |
| `comingSoon` | 沉底分组「即将推出」；不可切；无假就绪灯 |
| 就绪灯 | **只信** `status===ready`；禁探测中常绿 Fake-Status |

### 5. 三路微文案（与 m1 一致）

| pathKind | Rail 副文案 | 出现 |
|---|---|---|
| enjoy-local | 本地 ToolLoop | Rail + 胶囊 |
| acp-host | ACP · 订阅登录 | Rail + 胶囊 |
| sandbox-harness | 实验 · 沙箱 | **仅设置**；`showOnEngineRail:false` |

### 6. 空态 checklist（禁营销 Hero）

`empty-state` 改造为 **工作清单**，左对齐卡片列表，非居中大图口号。

| 块 | 内容 |
|---|---|
| 检测行 | 已检测到的 CLI（ready 列表，品牌标+名，单行；标题用 i18n `已检测`，禁止写成「已连接」） |
| 缺口行 | missing：品牌+名+**一个**紧凑 CTA（npm/brew→「安装」，其余→「复制」）。点行展开命令，或深链 `#/settings/agent?tab=registry`。**禁止**嵌 `AgentCliInstall`（提示+安装+复制+文档整卡） |
| 示例任务 | 3 条短 pill，点击填入 Composer；禁「开启奇妙旅程」类文案 |
| 版式 | `max-w-xl` 左/中偏左；内容长时 `justify-start` 顶对齐，清单与 Composer 之间不要大块空白；`bg-background-*` BoardUI；无大 Hero 插画抢焦点 |

---

## 组件清单（给 mike）

| 组件 | 路径建议 | 职责 |
|---|---|---|
| `EngineHandoffCard` | `agent-picker/handoff/engine-handoff-card.tsx` | 有历史切换确认；阻切含去处理审批 |
| `planComposerSwitch` | `agent-picker/handoff/plan-composer-switch.ts` | 状态机 |
| `focusAttention` | `ai-chat/attention/focus-attention.ts` | **只用 M2 完整 API**（`sessionId` + `navigate`）；阻切传当前会话，落到 Dock |
| Rail/Picker | 现有 | 空会话直切；有历史走 plan；取消后 tab 回 from |
| empty-state checklist | `empty-state/checklist/*` | 检测/缺口单 CTA/示例；完整安装走设置 Registry |
| path 微标 | `agent-engine-rail` / 胶囊 | 两路文案 |

## 不变量

- 有用户轮切换必经 HandoffCard。
- 切换不绕过未决审批（默认阻切）。阻切出口只有取消或去处理 Attention。
- 取消交接必须恢复 from 选中，禁止停在 to。
- 沙箱不上 EngineRail。
- 无 Fake-Status 就绪灯；comingSoon 不装成 available。
- BoardUI token only。
- Handoff brief **禁止**写成可见用户首条或 annotated user turn。

## 已知坑

- ACP 进程身份必须含 `toolId`（`acpProcessKey`）。旧实现只用 modelId+env，Claude→Cursor 会复用旧 stdio，看起来像假续跑。
- `setSessionRuntime` **不要**顺便 dispose：每次 `agent.run` 也会写 runtime，会把刚开的桥杀掉。dispose 只在 handoff 确认 / 删会话。
- 合入 M2 后不要把 `ApprovalCard` 写回 `ConversationContent`。M3 曾把 `#permission-dock` 临时挂在 Thread 内，并写过只滚 Dock 的无参 `focusAttention` stub；现挂点是 Composer 上沿 `PermissionDock`，阻切必须走 M2 `focusAttention({ sessionId, kind, navigate })`。
- 切会话 / 新建会话必须 `resetPending()`，否则 HandoffCard 会跟着旧会话飘到新线程。会话生命周期在 `session-lifecycle.ts`，不要在 `use-agent-session` 再复制一份 `loadSession`。
- 空态 `MissingRow` 曾嵌整张 `AgentCliInstall`（提示 + 安装 + 复制 + 文档），未装 CLI 一多就把 Composer / pill 顶出视口，看起来像设置 Registry。缺口行只留品牌+名+一个 CTA；完整安装走 `#/settings/agent?tab=registry`。
- `justify-center` 在长清单时制造中间大空白。空态内容顶对齐 `justify-start`。

## 验收

1. 空会话：Picker 切 Cursor 立即 bind，无卡。
2. 有两轮对话：切 Claude→Cursor 出 HandoffCard；取消后仍停在 Claude。
3. 确认后旧 ACP 已 dispose，新引擎首答能看到摘要语境。
4. 有 pendingApproval 时切换被阻；卡上可取消或去处理审批。
5. 空态展示 ready 单行 / missing 单 CTA + 示例 pill；无居中营销 Hero、无五张高安装卡。

## 非目标

- Registry / 自定义 agent（M4）
- worktree 并行（砍）
- PTY 兜底（砍）

## 设计锁（luna / mike · 与前端钉死）

1. PermissionDock：挂在 **Composer 上沿 sticky**（Conversation 与 Composer 之间），不是 Conversation viewport 顶 pinned。审批卡不进 `ConversationContent`。
2. **Handoff 摘要只进新引擎的系统/隐藏上下文**（ACP 首轮 prompt 前缀，或 ToolLoop `system` 消息）。新 session 首答能读到 brief，**禁止**写成可见用户首条、用户气泡附注、或 annotated user turn。
3. 确认后 UI **只**出可 dismiss 的「已交接」微条，文案仅 `{from} → {to}`；微条不展示摘要正文。

## 设计定稿补充（2026-09-08）

Handoff 摘要形态：
1. 注入**系统/隐藏上下文**（新 runtime / ACP session），供模型续跑。
2. UI 仅展示可 dismiss 的「已交接」微条（from→to）。
3. **禁止**把摘要写成可见的用户首条附注。
