# spec/m3-engine-handoff

> M3 **只**管换引擎与空态：空会话直切、有历史 handoff、未装态、三路微文案、空态 checklist。最后更新：2026-09-20
> 同引擎中途换模型是 **I1**，不是本里程碑的 handoff。产品锁 [`../references/i1-mid-model-switch.md`](../references/i1-mid-model-switch.md)。视觉真源（设计锁，不宣称应用 1:1）：[`../previews/i1-mid-model-switch.html`](../previews/i1-mid-model-switch.html)。
> 产品锁：M2 收完后做本文，再做 M4。整段程序不做：M5 git worktree、M6 摩擦/digest/团队 MCP、M4 PTY 兜底。
> M5 会话状态灯与 ACP 进程收尸已落地。M6 skill-sources 可选 pull 已薄层落地（见 `skills` spec），不含摩擦/digest/团队 MCP。
> handoff 摘要注入 system/hidden + 可关「已交接」微条，**禁止**当第一条可见用户消息。
> BoardUI；禁 Fake-Status-Chrome / Centered-Marketing-Hero。

## 当前真相

| 点 | 现状 |
|---|---|
| 切引擎 | 空会话：`planComposerSwitch` → `setRuntimeId` + `bindSessionRuntime`，无卡 |
| 同引擎换模（I1，**不是** M3） | 同 `runtimeId` 换 `modelId` **不是** handoff，不进 `EngineHandoffCard`。入口是 Composer 顶栏模型芯片，只列当前引擎 advertised / 档案模型，不夹导轨。有用户轮只写 `sessionModels[sessionId]`；空会话可同时写偏好默认。新会话不继承上一会话中途模型。Enjoy Local 下一轮用新模型、不断桥。ACP 可 dispose **子进程**再 spawn `--model`，这是桥实现，**Enjoy session id 不变**，**不是**重开 Enjoy 会话。C 端成功：角标「已切换」、微条「已切换到 {model}」、脚注「同一助手，不换引擎」。`capabilities.models===none` 禁用芯片 +「此引擎不支持中途换模型」；`requestModelSwitch` / `persistSessionModel` 对 none 直接 failed 并回滚 store，禁止写覆盖。未登录 / 名单空诚实失败 + 重试，禁止空成功。禁止「已切换引擎」/「已交接」/「换模会重开会话」/「本机助手会话会重开」/ 当用户气泡 / handoff brief / 中途 `agentTools.upsert`。视觉锁 [`../previews/i1-mid-model-switch.html`](../previews/i1-mid-model-switch.html) |
| 有历史切换 | Composer 同宽确认坞（摘要默认折叠）；确认后 `disposeAcpSession` + `setHandoff`；brief 只进系统/隐藏上下文。`peekSessionHandoff` 开流前注入，`openCodingStream` 成功后才 `take`。pending 时胶囊改「确认切换 · 目标」，禁止再开 Picker。文件只取上一轮工具路径，不塞 `workspace.changes` |
| 取消 | 恢复 from：`chat.runtimeId` + Picker/Rail `tabId`；不 `bindSessionRuntime` |
| 阻切 | 取消，或「去处理审批」：恢复 from 并 `focusAttention({ sessionId, kind, navigate })` 落到当前会话 PermissionDock |
| 已交接条 | 仅确认成功后出现；可 dismiss；文案 `{from} → {to}`。**确认卡打开时不画微条**；取消 / 未确认不留微条。卡与微条互斥。确认时 `markHandoffCut`：切点之前的气泡降透明度，交界画「上一引擎记录 · 新引擎只收到摘要」 |
| inspect / brief | `captureOpenStreamPrompt` 与 `takeSessionHandoff` 都跟开流**成功**；`ACP_AUTH_REQUIRED` / 缺密钥不得留下假 last-run，也不得提前 `take` |
| 未装 | Rail/Picker 灰态；点开 `agent-cli-install`（无装饰粉边；主钮一键安装、次钮复制、文档为链接）；就绪灯只信 `engineReadiness === ready`（`loggedIn==null` 是 inspecting，不是绿灯） |
| 空态 | 开始面：问候 `text-title-1-bold`（工作区名 accent）+ 一条元数据胶囊（「N 项」/ 叠标已就绪 / 未安装，展开下拉）+ Composer + 下方命令 pills；Composer **不进** empty-state；藏审查条 / UsagePill 警报 / 技能源同步条 |
| 三路 | Picker 顶部分组：「本地」= Enjoy Local（下层供应商→模型）；「本机助手 / CLI」= 已装与未装都上轨，未装点开一键安装。OMP 左栏列可登录供应商，实心登录打开浏览器。沙箱 `showOnEngineRail:false` |

完成标准：Claude→Cursor 且已有用户轮时，**不会**静默丢上下文或假续跑。

### 与 I1 正交（换模 ≠ handoff）

| | M3 引擎 handoff | I1 同引擎换模 |
|---|---|---|
| 切什么 | `runtimeId` | 同 `runtimeId` 的 `modelId` |
| Enjoy 会话 | 同一 `sessionId`；有历史才确认交接 | 同一 `sessionId`，**不**新开、**不**重开 |
| 入口 | Rail / Picker / 设为主引擎 | Composer 模型芯片 |
| C 端成功 | 「已交接 {from} → {to}」 | 「已切换」「已切换到 {model}」「同一助手，不换引擎」 |
| 禁止 | 静默切引擎、假续跑 | 「已切换引擎」「已交接」「换模会重开会话」、handoff 卡 |

ACP 子进程 dispose 再 spawn `--model` **不是** Enjoy 会话重开，也不是 M3。产品锁 [`../references/i1-mid-model-switch.md`](../references/i1-mid-model-switch.md)。

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
| 形态 | Composer **同宽确认坞**（非线程大卡、非居中 Hero、非全屏 Modal）· `w-full rounded-xl border border-border-button-default bg-background-secondary-default/95 px-3 py-2`。摘要默认折叠，点「编辑摘要」才展开 |
| 标题 | 切换引擎 |
| 正文 | `{fromLabel} → {toLabel}` + 一句话：将结束当前引擎会话，并把摘要交给新引擎 |
| 摘要区 | 可编辑 textarea（默认折叠；自动摘要最近轮：目标/上一轮文件/未决审批）；`text-caption-1-regular` |
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
| `engineReadiness==="ready"` | 可 bind、可发送、绿灯 |
| Enjoy Local 且无密钥 | 可切到本地；胶囊「密钥」；发送留在 Chat |
| `needs_login` / `inspecting` / `authorizing` / `login_failed` | 可点开面板，不可 bind / 发送；标「登录」/「检测」/「授权」/「失败」 |
| `missing` | Rail/Picker 灰态；点开 `agent-cli-install`：安装 / 复制 / 重新扫描 |
| `comingSoon` | 沉底分组「即将推出」；不可切；无假就绪灯 |
| 就绪灯 | **只信** `engineReadiness==="ready"`；`loggedIn===null` 禁止当 ready |

### 5. 三路微文案（C 端禁止协议/路径微标）

| pathKind | Rail / 胶囊 | 出现 |
|---|---|---|
| enjoy-local | 品牌 + 引擎 + 模型 + 就绪灯 | 「本地」分组；下层才是供应商 |
| acp-host | 品牌 + 引擎 + 模型 + 就绪灯；未装/需登录可作就绪语义 | 「本机助手 / CLI」；DeepSeek / OMP 也走这里 |
| sandbox-harness | 不上轨 | **仅设置**；`showOnEngineRail:false` |

C 端 `AgentEngineRail` / `AgentPicker` 胶囊与导轨项**禁止**常驻协议/路径微标：`ACP · 订阅登录`、`本地 ToolLoop`、`ACP Stdio` 及同类徽章。只画品牌、引擎名、模型、就绪灯（有额度才挂 `UsagePill`）。协议/登录只进设置分段、能力矩阵、配置边界与文档。供应商名只留在 Enjoy Local 弹层左栏或胶囊 `title`，不当第三段。胶囊优先完整引擎名，模型可省略号；悬停看全名。交接卡文件列表只收**上一轮**工具路径，默认收成「N 个文件」；禁止把整个 `workspace.changes` 算进去。pending 时 Agent 胶囊锁住，不准再叠 Picker。

### 6. 空态 checklist（禁营销 Hero）

`empty-state` 改造为 **工作清单**，左对齐卡片列表，非居中大图口号。

| 块 | 内容 |
|---|---|
| 检测行 | 元数据条里「已就绪 N 个」+ 叠标；点开下拉才列全名。空列表才写 `已检测`。禁止写成「已连接」 |
| 缺口行 | 元数据条里「未安装 N 个」，点开下拉。行内：品牌+名+**一个**紧凑 CTA。**禁止**默认展开挡住 Composer，禁止嵌 `AgentCliInstall` |
| 示例任务 | 3 条描边 pill，挂在 Composer **下方**；禁「开启奇妙旅程」类文案 |
| 版式 | 空会话开始面：`Header → 垂直居中（问候 + 引擎一行 + Composer + pills）`。问候 `text-title-1`，不是会话名。清单 `h-auto`；**禁止**清单卡 `flex-1` `my-auto`。**禁止** Composer 进 empty-state。`bg-background-*` BoardUI；无口号 Hero、无光晕 Logo、无三等分功能卡 |

---

## 组件清单（给 mike）

| 组件 | 路径建议 | 职责 |
|---|---|---|
| `EngineHandoffCard` | `agent-picker/handoff/engine-handoff-card.tsx` | 有历史切换确认；阻切含去处理审批 |
| `planComposerSwitch` | `agent-picker/handoff/plan-composer-switch.ts` | 状态机 |
| `focusAttention` | `ai-chat/attention/focus-attention.ts` | **只用 M2 完整 API**（`sessionId` + `navigate`）；阻切传当前会话，落到 Dock |
| Rail/Picker | 现有 | 空会话直切；有历史走 plan；取消后 tab 回 from |
| empty-state checklist | `empty-state/checklist/*` | 检测/缺口单 CTA/示例；完整安装走设置 Registry |
| 引擎铬 | `agent-engine-rail` / 胶囊 | 品牌 + 名 + 模型 + 就绪灯；禁止协议/路径微标 |

## 不变量

- 有用户轮**切引擎**必经 HandoffCard。同引擎换模（I1）不走本卡、不重开 Enjoy 会话。
- **切引擎**不绕过未决审批（默认阻切）。阻切出口只有取消或去处理 Attention。
- 取消交接必须恢复 from 选中，禁止停在 to。
- 沙箱不上 EngineRail。
- 无 Fake-Status 就绪灯；comingSoon 不装成 available。
- BoardUI token only。
- Handoff brief **禁止**写成可见用户首条或 annotated user turn。

## 已知坑

- I1 同引擎换模若走 `requestEngineSwitch` 会进 handoff。必须 `requestModelSwitch` → `persistSessionModel`。ACP 可 `disposeSession` 再带 `--model` 开流，这是桥实现，**Enjoy session id 不变**；C 端禁止「已切换引擎」「已交接」「换模会重开会话」「本机助手会话会重开」。`models===none` 必须禁用芯片；入口与 persist 对 none 回 failed 并回滚，禁止空表成功。
- 设置「设为主引擎」若直接 `persistRuntimeId`，会绕过 `planComposerSwitch` / dispose / brief，有用户轮时假续跑。必须走 `requestEngineSwitch`；pending / blocked 再回 Chat 出坞。确认 IPC 失败必须 `setError(HANDOFF_CONFIRM_FAILED)`，坞留在 `handoff_pending`，不要静默。
- `beginAgentRun` 禁止一上来 `takeSessionHandoff`。第一发 `ACP_AUTH_REQUIRED` / 缺密钥 / spawn 失败后 brief 必须还在；登录后再发仍带 `[Engine handoff — hidden context]`，且不是用户气泡。`openCodingStream` 失败同样不得 `captureOpenStreamPrompt`。
- 交接后旧气泡若仍按当前引擎铬渲染，会像假续跑。必须按 `sessionHandoffCuts` 降级，并在旧→新交界（或全是旧气泡时列表末尾）画分界。
- ACP 进程身份必须含 `toolId`（`acpProcessKey`）。旧实现只用 modelId+env，Claude→Cursor 会复用旧 stdio，看起来像假续跑。
- `setSessionRuntime` **不要**顺便 dispose：每次 `agent.run` 也会写 runtime，会把刚开的桥杀掉。dispose 只在 handoff 确认 / 同引擎换模 / 删会话。
- 合入 M2 后不要把 `ApprovalCard` 写回 `ConversationContent`。M3 曾把 `#permission-dock` 临时挂在 Thread 内，并写过只滚 Dock 的无参 `focusAttention` stub；现挂点是 Composer 上沿 `PermissionDock`，阻切必须走 M2 `focusAttention({ sessionId, kind, navigate })`。
- 切会话 / 新建会话必须 `resetPending()`，否则 HandoffCard 会跟着旧会话飘到新线程。会话生命周期在 `session-lifecycle.ts`，不要在 `use-agent-session` 再复制一份 `loadSession`。
- 空态 `MissingRow` 曾嵌整张 `AgentCliInstall`（提示 + 安装 + 复制 + 文档），未装 CLI 一多就把 Composer / pill 顶出视口，**看起来像**设置 Registry，但路由仍是 Chat。修法：问候下只留一行折叠 + 有就绪时缺口默认折叠。**禁止**把「像 Registry」修成删掉「已检测 / 未安装」两段，也禁止把 `AcpRegistryPage` 挂进空态，禁止再画安装目录卡。
- 空会话开始面要把 Composer 放在问候和 pills **中间**（对标 v0 式开始面）。Composer 仍不准写进 `AiChatEmptyState`；编排在 `empty-session-start.tsx`。有消息时 Composer 继续钉底。
- 开始面可以垂直居中；**禁止**在 empty-state / 清单卡根上写 `flex-1` / `my-auto`。禁止口号、光晕 Logo、三等分 Learn/Code/Write 卡冒充开始面。
- 空会话不要挂 SessionReviewBar（22 文件三钮）和「写入自动 · Shell…」策略行；改动只留标题旁「N 项」芯片进 Inspector。芯片和审查条不能同时出现。
- 空会话 `UsagePill` 若先判 ≥85% 再判 quiet，额度高时仍会警报。必须先 `quiet`。
- 有历史切引擎若保留上一轮 `banner`，确认卡会和「已交接」微条叠在一起。进入 pending / 取消必须清 banner；渲染层再用 `handoffSurfaces` 互斥。
- 交接卡若把 `chat.changes` 整库塞进文件列表，会出现「99 个文件」。只收上一轮工具 path。
- pending 时若还能打开 390px Picker，会和确认坞叠两层。`canOpenAgentPicker` 非 idle 必须关 Picker；胶囊改显示目标引擎。
- 确认坞不要写成 `max-w-[40rem]` 左对齐大卡，会像插在线程里的消息。必须和 Composer 同宽。
- Rail 若把 Enjoy Local 与 DeepSeek / OMP 排进同一无标签行，C 端会把 CLI 引擎看成 BYOK 供应商。必须「本地」与「本机助手 / CLI」硬分组，卡片副标题只写就绪态。
- 合 M6 时不要把 `SkillSourcePullStrip` 加回空会话。技能源更新只在 Skills 顶栏与 Agent 默认项；空态不变量必须继续禁止该条。

## 验收

1. 空会话：Picker 切 Cursor 立即 bind，无卡。
2. 有两轮对话：切 Claude→Cursor 出 HandoffCard；取消后仍停在 Claude。
3. 确认后旧 ACP 已 dispose，新引擎首答能看到摘要语境。
4. 有 pendingApproval 时切换被阻；卡上可取消或去处理审批。
5. 空态开始面：问候 + Composer + 下方 pill；ready 单行 / missing 单 CTA 折在问候下；Composer 不进 empty-state；无口号 Hero、无五张高安装卡、无技能源同步条。
6. Picker 顶部分组「本地」与「本机助手 / CLI」；DeepSeek / OMP 在 CLI 组。胶囊/导轨项无协议路径微标。
7. 胶囊只有 `引擎 · 模型` + 就绪灯（有额度才 UsagePill）；悬停可见全名 / 供应商。
8. 确认卡打开时无「已交接」微条；确认后只留微条；取消后两者皆无。
9. 设置「设为主引擎」有用户轮时出同一确认坞，取消仍停 from。
10. 已装未登录：导轨「登录」、发送被拦、错误主钮打开 Picker，不跳 Providers。
11. 同引擎换模（I1）：无 HandoffCard、无「已交接」、无「换模会重开会话」；Enjoy session id 不变。

## 非目标

- 把同引擎换模写成 handoff / 「换模会重开会话」（那是 I1，见上表）
- Registry / 自定义 agent（M4）
- worktree 并行（砍）
- PTY 兜底（砍）

## 设计锁（luna / mike · 与前端钉死）

1. PermissionDock：挂在 **Composer 上沿 sticky**（Conversation 与 Composer 之间），不是 Conversation viewport 顶 pinned。审批卡不进 `ConversationContent`。
2. **Handoff 摘要只进新引擎的系统/隐藏上下文**（ACP 首轮 prompt 前缀，或 ToolLoop `system` 消息）。新 session 首答能读到 brief，**禁止**写成可见用户首条、用户气泡附注、或 annotated user turn。
3. 确认后 UI **只**出可 dismiss 的「已交接」微条，文案仅 `{from} → {to}`；微条不展示摘要正文。确认卡打开期间禁止同时画微条。

## 设计定稿补充（2026-09-08）

Handoff 摘要形态：
1. 注入**系统/隐藏上下文**（新 runtime / ACP session），供模型续跑。
2. UI 仅展示可 dismiss 的「已交接」微条（from→to）。
3. **禁止**把摘要写成可见的用户首条附注。
