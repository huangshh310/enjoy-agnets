# ACP（Agent Client Protocol）对照笔记

> 位置：`design/references/acp-protocol.md`。落地以 `design/specs/agent-cli.md` 为准；本文是官方协议的宿主向摘录，不是实现说明书。  
> 整理日期：2026-09-20  
> 一手源：[Introduction](https://agentclientprotocol.com/get-started/introduction)、[Architecture](https://agentclientprotocol.com/get-started/architecture)、[Agents](https://agentclientprotocol.com/get-started/agents)、[Registry](https://agentclientprotocol.com/get-started/registry)、[Session Config Options v1](https://agentclientprotocol.com/protocol/v1/session-config-options)、[v2](https://agentclientprotocol.com/protocol/v2/session-config-options)、CDN [`registry.json`](https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json)。

---

## 1. 协议是什么

ACP 把 **IDE / 编辑器（Client）** 和 **编码智能体（Agent）** 解耦，角色类似 LSP：Agent 实现一次，任何兼容 Client 都能开流。

- **本地 Agent**：编辑器子进程，JSON-RPC over **stdio**（Enjoy 当前只走这条）。
- **远端 Agent**：HTTP / WebSocket；官方写明远程仍在推进。Enjoy **不做** 云 ACP。
- 文本默认 Markdown。工具调用、diff、审批是协议一等公民。

Enjoy 是 ACP **Client**：spawn 本机 CLI → `initialize` → `session/new` → `session/prompt`，把 `session/update` 映射成 `StreamEvent`。

---

## 2. 会话生命周期（宿主必须认）

```
initialize → session/new | session/resume → session/prompt ⇄ session/update
                                          → session/cancel | session/close
                                          → session/set_config_option
             session/list  → 选一条 → session/resume（可选 replayFrom）
             session/delete（Agent 广告 session.delete 才可调）
```

| 方法 / 通知 | 作用 | Enjoy 现状 |
|---|---|---|
| `initialize` | 协议版本、双方 capabilities | 发 v2，失败回落 v1；解析 `capabilities.session` |
| `session/new` | 开会话；**MAY** 带 `configOptions` | 已接；绑定写入 `sessions.acp_*` |
| `session/list` | 发现 Agent 侧已有会话（cwd 过滤 + 分页） | `agentTools.listAcpSessions`；Picker 导入 |
| `session/resume` | 按 ACP `sessionId` 续上；可选 `replayFrom` 回放 | 无回放 resume；失败再 new |
| `session/close` | 取消进行中工作并释放该会话资源 | dispose 先 close 再杀进程 |
| `session/delete` | 从未来 `session/list` 里拿掉 | 永久删 Enjoy 会话时若进程仍活且广告 delete |
| `session/prompt` | 一轮用户输入 | 已接，目前几乎只发 text |
| `session/update` | 流式文本 / thought / tool / plan / `config_option_update` / **`session_info_update`** | `session.title` 仅覆盖默认名 |
| `session/request_permission` | 审批 | HMAC；禁止从 `mapAcpUpdate` 再 yield |
| `session/set_config_option` | 改模式 / 模型 / **思考档** | 已接 |
| `session/cancel` | 停当前 turn，不杀进程 | Stop 已接 |

v2：Agent 若广告 `session: {}`，**必须**同时支持 `new` / `list` / `resume` / `close` / `prompt` / `cancel` / `update`。`session/list` 只发现，**不**恢复；选中后必须 `session/resume`。`session_info_update` 只改 title / updatedAt / `_meta`，不改 cwd。

`session/set_mode` 已被 Config Options 取代。Enjoy 仍不实现 `session/set_mode`。

Registry 矩阵里 Grok / Claude ACP / Qwen / Kimi / GLM 等多家已报 `session/list` + `session/resume`。当前真相仍以 [`../specs/agent-cli.md`](../specs/agent-cli.md) 为准（本阶段不做 ACP 历史回放）。

---

## 3. Session Config Options（思考档真源）

Agent 在 `session/new` / `set_config_option` 回执 / `config_option_update` 里给出选项表。Client **按广告画控件，没广告就不画**。

| `category` | 含义 | Composer 放哪 |
|---|---|---|
| `model` | 模型 | 已有引擎胶囊 / I1 芯片 |
| `model_config` | 上下文、快慢等 | 靠近模型 |
| `thought_level` | 思考 / reasoning effort | 模型旁思考档 |
| `mode` | 会话模式 | 不替代 C 端探索/执行 |

字段名：v1 常用 `id`，v2 文档有时写 `configId`。解析必须两者都认。

`thought_level` 是 **select**，档位由 **当前模型** 决定。换模型后 Agent 必须返回**完整新表**。禁止把 Claude `max` 和 Codex `ultra` 压成 Enjoy 本地五档。

官方例子（Grok Build）：`configId: reasoning_effort`，`category: thought_level`，值 `minimal | low | medium | high | xhigh`。Claude ACP 适配器同样广告 `thought_level`。

同类宿主：

- **Zed**：只渲染 Agent 广告的选项；`ThoughtLevel` 有快捷键。
- **Orca**：每家静态目录作种子（Claude `--effort`、Codex `-c model_reasoning_effort=`、Grok `--reasoning-effort`、Cursor 拼进 model id）；Gemini / OMP 空 options。
- **Enjoy 应对**：live `configOptions` 优先；Grok / Claude / Codex 可有静态种子；**禁止** `--thinking` 塞进 Cursor / Grok ACP argv（会 `unknown option` exit 1）。

---

## 4. Registry 与国产 CLI

官方 Registry（需支持认证）CDN：`https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json`。

本仓本机 CLI 表已接线或本轮上架的国产 / 国内厂商（spawn 以 catalog/preset 为准）：

| Enjoy `id` | 厂商 | Registry / 官方入口 | ACP argv |
|---|---|---|---|
| `qwen` | 阿里 Qwen Code | `qwen-code` · `@qwen-code/qwen-code` | `qwen --acp`（不加 experimental） |
| `kimi` | 月之暗面 Kimi CLI | `kimi` · GitHub Release 二进制 | `kimi acp` |
| `codebuddy` | 腾讯云 CodeBuddy | `codebuddy-code` · `@tencent-ai/codebuddy-code` | `codebuddy --acp` |
| `glm` | 智谱 GLM Agent | `glm-acp-agent` | `glm-acp-agent`（无额外参数） |
| `minimax` | MiniMax Code | `minimax-code` · `@minimax-ai/code` | `mcode acp` |
| `qoder` | 阿里 Qoder | `qoder` · `@qoder-ai/qodercli` | `qodercli --acp` |

未上 Enjoy 导轨、但 Registry 有的国内相关：iFlow（`--experimental-acp`，本仓禁 experimental 旗标）、Trae。要加必须先过 spawn 白名单 + HMAC + 一轮开流，禁止手改 `comingSoon`。

`npx` 不得当 ACP 入口（与 Pi / 自定义白名单同一条）。安装只跑 catalog 里的 `npm` / `brew`，二进制发行走复制命令。

---

## 5. Enjoy 映射（改代码时对这张表）

| 协议面 | Enjoy |
|---|---|
| stdio JSON-RPC | `packages/agent-harness/src/acp/client.ts` |
| `session/new` `configOptions` | 解析进 `session.config` 事件；思考档走 `thought_level` |
| `session/set_config_option` | `agentTools.setConfigOption`；无活会话则等下一轮 `session/new` 再设 |
| `agent_thought_chunk` | `reasoning.delta`（展示思考过程 ≠ 用户选档） |
| `session/request_permission` | HMAC 审批 |
| Fast / `--thinking` argv | 按 capability 剥掉 |
| 五档能量条 | **仅** `thinking: "effort"`（Enjoy 本地） |

实现与「当前真相」以 [`../specs/agent-cli.md`](../specs/agent-cli.md) 为准。本文过时先改 spec，再改这篇。
