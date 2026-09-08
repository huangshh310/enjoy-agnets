# spec/m3-engine-handoff

> M3 引擎切换与空态：空会话直切、有历史 handoff、未装态、三路微文案、空态 checklist。最后更新：2026-09-08
> 产品锁：M2 收完后做本文，再做 M4。整段程序不做：M5 git worktree、M6 摩擦/digest/团队 MCP、M4 PTY 兜底。
> 可选后置：M5 会话状态灯 + 进程收尸；M6 skill-sources 可选 pull。
> handoff 摘要注入 system/hidden + 可关「已交接」微条，**禁止**当第一条可见用户消息。
> BoardUI；禁 Fake-Status-Chrome / Centered-Marketing-Hero。

## 当前真相

| 点 | 现状 |
|---|---|
| 切引擎 | Composer `AgentPicker` / `AgentEngineRail`；`bindSessionRuntime` 已有 |
| 有历史切换 | 易静默丢 ACP 桥或假续跑 |
| 未装 | `agent-cli-install`；`comingSoon` 沉底 |
| 空态 | `ai-chat/empty-state/*` |
| 三路 | Enjoy 本地 / ACP 本机 CLI / 沙箱仅设置（见 m1） |

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
| 未决审批 | 若 `pendingApproval`：先提示「请先处理审批」或「切换将拒绝未决」——默认 **阻切**，必须先 resolved |

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
| 检测行 | 已检测到的 CLI（ready 列表，品牌标+名） |
| 缺口行 | missing：缺什么 + 安装/复制 |
| 示例任务 | 3 条短 pill，点击填入 Composer；禁「开启奇妙旅程」类文案 |
| 版式 | `max-w-xl` 靠线程栏习惯左/中偏左；`bg-background-*` BoardUI；无大 Hero 插画抢焦点 |

---

## 组件清单（给 mike）

| 组件 | 路径建议 | 职责 |
|---|---|---|
| `EngineHandoffCard` | `agent-picker/engine-handoff-card.tsx` | 有历史切换确认 |
| `planComposerSwitch` | store 或 `agent-picker/plan-composer-switch.ts` | 状态机 |
| Rail/Picker | 现有 | 空会话直切；有历史走 plan |
| empty-state checklist | `empty-state/*` | 检测/缺口/示例 |
| path 微标 | `agent-engine-rail` / 胶囊 | 两路文案 |

## 不变量

- 有用户轮切换必经 HandoffCard。
- 切换不绕过未决审批（默认阻切）。
- 沙箱不上 EngineRail。
- 无 Fake-Status 就绪灯；comingSoon 不装成 available。
- BoardUI token only。

## 验收

1. 空会话：Picker 切 Cursor 立即 bind，无卡。
2. 有两轮对话：切 Claude→Cursor 出 HandoffCard；取消后仍停在 Claude。
3. 确认后旧 ACP 已 dispose，新引擎首答能看到摘要语境。
4. 有 pendingApproval 时切换被阻或明确要求先处理。
5. 空态展示 ready/missing 列表 + 示例 pill；无居中营销 Hero。

## 非目标

- Registry / 自定义 agent（M4）
- worktree 并行（砍）
- PTY 兜底（砍）

## 设计锁（与前端钉死）

1. PermissionDock：挂在 **Composer 上沿 sticky**（Conversation 与 Composer 之间），不是 Conversation viewport 顶 pinned。
2. Handoff 摘要：系统/隐藏上下文 + UI「已交接」微条；不做可见用户附注。

## 设计定稿补充（2026-09-08）

Handoff 摘要形态：
1. 注入**系统/隐藏上下文**（新 runtime / ACP session），供模型续跑。
2. UI 仅展示可 dismiss 的「已交接」微条（from→to）。
3. **禁止**把摘要写成可见的用户首条附注。
