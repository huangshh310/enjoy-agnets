# spec/m4-acp-registry

> M4 ACP 扩展与 Registry。最后更新：2026-09-08
> 产品锁：做 M2–M4；**砍** M4 PTY 兜底、M5 worktree、M6 摩擦/digest/团队 MCP。
> 可选后置：M5 会话状态灯 + 进程收尸。M6 skill-sources 可选 pull 已薄层落地（见 `skills` spec），不含摩擦/digest/团队 MCP。
> BoardUI；禁 Fake-Status-Chrome / Centered-Marketing-Hero。

## 当前真相

设置 → 智能体 第四分段 **Registry**（`#/settings/agent?tab=registry`，不上 EngineRail，不进空态主区）。左列表右详情：内置 ACP 目录 + `agentTools.detect` 状态（未装 / ready / 即将推出）。一键安装走配方 npm/brew；否则复制官方命令；文档 `openDocs`。无营销 Hero、无假「已连接」。

自定义 stdio ACP：`custom:<slug>`，字段 command / args / env / cwd（工作区根或已存在的绝对目录）。保存进 `agentTools.customAgents`；出现在本机 CLI 列表与 Composer 导轨（`showOnEngineRail`）。spawn 经 `assertCustomAllowedCommand`（目录 binaries + `acp`/`acp-agent`/`agent-acp`，禁止 bash/node/npx 等）；`shell:false`；审批不豁免。能力走 `RUNTIME_CAPABILITIES["custom-acp"]`（quota=false、login=false、HMAC）。删除确认后解绑会话 runtime，并把仍指向它的偏好 `runtimeId` 拉回 Enjoy 本地。

comingSoon → available 只按 **OpenCode → Gemini → Pi**，且必须 `canPromoteComingSoon`：catalog + `RUNTIME_CAPABILITIES.spawn` + HMAC + ACP 宿主 handshake。三家当前硬条件已过，故 available。未过的 soon 不能 `canSwitchAgent`。

IPC：`agentTools.upsertCustom` / `removeCustom` / `getCustom`。无 PTY 入口。

## 目标

用户可：浏览内置 Registry → 安装/复制命令；添加自定义 stdio ACP agent（command/args/env/cwd）并完成 **一轮带审批** 的对话。按硬条件将 `comingSoon` 升为 `available`。

## 非目标（本里程碑明确不做）

- PTY / 怪异 TUI 兜底
- `session/set_mode` 全量
- 跨 Agent MCP `delegate_to_agent`
- 寄生 Codex Desktop / SSH
- worktree、团队层摩擦信号、本地 digest、MCP 团队声明

---

## IA 大纲

### 1. Registry 视图（设置 · 智能体）

- 入口：设置 → 智能体 → 分段 **「Registry」**（`#/settings/agent?tab=registry`），**不上** EngineRail，**不**进空态主区。空态缺口只给单行 CTA，完整安装卡只在本页。
- 布局：列表 + 详情；禁营销 Hero 大图墙。
- 行：名称 · 来源（官方/目录）· 状态（未装 / ready / 已添加）· 一键「安装或复制命令」。
- 详情：简短说明、默认 `command`/`args` 预览、文档链（外开）。
- 数据：静态目录 + 探测结果；与 `agentTools.detect` 对齐。

### 2. 自定义 ACP agent

| 字段 | 合同 |
|---|---|
| `command` | 必填；经 main `assertAllowedCommand`；`shell:false` spawn |
| `args` | string[] |
| `env` | 可选键值；勿在 UI 回显密钥明文超长 |
| cwd 策略 | 工作区 root / 自定义路径（存在性校验） |
| 保存 | 入库；出现在本机 CLI 列表；`capabilities` 默认保守（quota=false 等） |
| 删除 | 确认后移除；解绑会话 runtime |

表单：BoardUI 设置卡；校验失败行内错误，禁假「已连接」绿灯。

### 3. `comingSoon` → `available` 硬条件

升序建议：**OpenCode → Gemini → Pi**（可按实测调，但必须满足）：

1. 本机 `initialize` 成功
2. `session/new`（或等价）成功
3. 一轮工具/文本往返可映射到现有 stream 事件
4. 审批路径：`session/request_permission` → `approval.required` + HMAC 可走通

UI：仅硬条件全过才移出「即将推出」；禁止手动假升。

### 4. ACP 事件保真（增强大纲）

| 事件 | UI 期望 |
|---|---|
| `available_commands_update` | 命令面板/提示更新，不造假命令 |
| diff content | 进 plan 表面 / Changes |
| 提问映射 | 进 ask-user / questions，不另开壳 |

细协议回写 `agent-cli.md`；本 spec 钉产品期望。

### 5. 与 Composer / Rail

- 新装成功 → detect 刷新 → 可进 Picker（按 `showOnEngineRail`）。
- 沙箱仍不上 Rail。
- 有历史切换仍走 M3 Handoff。

---

## 代码入口

| 块 | 路径 |
|---|---|
| Registry 列表/详情 | `settings/agent-tools/acp-registry-*.tsx` |
| 自定义 agent 表单 | `settings/agent-tools/custom-acp-agent-form.tsx` |
| 升 available 门闩 | `packages/agent-harness/src/agent-tools/coming-soon-promotion.ts` |
| 自定义 spawn | `packages/agent-harness/src/agent-tools/custom-spawn.ts` |
| 入库 | `apps/desktop/src/main/services/agent-tools-custom.ts` |
| 合约 | `packages/ipc-contract/src/custom-agent.ts` |

## 安全不变量

- 自定义 command 经 `assertAllowedCommand`；执行只在 main。
- 审批不短路；自定义 agent 无豁免。
- renderer 不 import `agent-harness`。

## 已知坑

- 自定义 command 若不走 basename 白名单，用户能把 `bash`/`npx` 写进 vault。保存与 spawn 都必须 `assertCustomAllowedCommand`。
- `custom:<slug>` 必须进 `AgentToolId` union，否则 `setSessionRuntime` / Composer persist 会拒。
- 列表不要回显 env 值；编辑走 `agentTools.getCustom`。密钥型 key 用 password 掩码。
- comingSoon 假升：只信 `canPromoteComingSoon`，不要手改 preset.available 绕过 OpenCode→Gemini→Pi。
- 空态不得嵌 Registry 列表或 `AgentCliInstall` 整卡。新会话 checklist 只给单行安装/复制；深链 `?tab=registry` 才打开本页。
- 自定义 agent 无 inspect / 额度条；不要画空条或假绿灯。
- Composer 切引擎用 `can-switch-agent.ts`（自定义必须 ready）；轨徽标就绪灯用 `engine-ready.ts` 的 `isEngineReady`。M2/M3 合入后不要把两者并成一份再丢掉自定义规则。

## 验收

1. Registry 能列出目录项并复制/触发安装命令。
2. 添加自定义 stdio ACP → ready → 一轮对话 + 审批。
3. 未满足硬条件的 soon 不能选为当前引擎。
4. 无 PTY 入口；无 Fake-Status 已连接。

## 开放问题（默认）

- Registry 源：默认 **内置 JSON**，远端后置。
- 自定义 agent 进能力矩阵一行：默认 **是**。
