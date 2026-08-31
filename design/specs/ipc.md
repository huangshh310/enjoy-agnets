# spec/ipc

> 渲染进程只打白名单；入参全部 Zod。最后更新：2026-09-01

## 当前真相

合约包：`packages/ipc-contract`。preload 把 `ipcRenderer.invoke` / `on` 收成 `window.ide`。main 在 `apps/desktop/src/main/ipc.ts` 注册 handle。

### Invoke 频道（实现已有）

| 前缀 | 频道 | 用途 |
|---|---|---|
| workspace | `open` `pickFolder` `pickFile` `remove` `list` `files` `readFile` `diff` `changes` | 工作区与文件；`pickFolder` / `pickFile` 只选路径不落库；`readFile` 走 `resolveKnowledgePath`，根外绝对路径即拒；`open` 可带 `name`；`remove` 只删应用档案不删磁盘 |
| session | `list` `listArchived` `create` `messages` `rename` `archive` `unarchive` `delete` `deleteArchived` | 会话；`list` 不含已归档；`archive` 进设置页；`delete` 永久删消息 |
| agent | `run` `abort` `decide` | 跑循环、中止、审批；`run` 可带 `attachments` 资产 id |
| settings | `get` `saveSecret` `setDefaultModel` `setPreferences` `setHarness` `listProviders` `presets` `upsertProvider` `removeProvider` `activateProvider` `setActiveModel` `probeProvider` `pingProvider` | 设置与供应商 |
| automations | `list` `upsert` `remove` | 自动化 |
| models | `list` | 已配置模型目录 |
| ai | `generate` `abort` `resume` | 文本/结构化/媒体/embedding/translation；kind=`agent` 转发 `runAgent`，必须带 workspaceId；`resume` 按 kind 分流：workflow 续步，其它读 generation 快照再跑 |
| agent | `decide` | 验 HMAC；`ApprovalDecision` `.strict()`，多余 `args` 即拒；篡改 runId / toolCallId 或库内签名即拒 |
| assets | `import` `list` `read` `export` `delete` `upload` | 资产库与 provider 引用 |
| knowledge | `sources` `documents` `addSource` `index` `search` `cancel` `remove` | RAG；`documents` 可带 `sourceId`，合并库内文档与磁盘扫描 |
| workflow | `list` `get` `start` `recover` `resume` `cancel` `retry` | Durable run |
| mcp | `servers` `upsert` `remove` `connect` `disconnect` `test` `tools` `call` `setPermission` `openApp` `appMessage` | MCP；`call` 入参 `McpCallInput`；`openApp` / `appMessage` 仅 trusted，消息经 `sanitizeAppMessage` |
| realtime | `open` `sendAudio` `close` | 实验语音会话 |
| observability | `metrics` `export` `setPolicy` `replay` | 本地指标与内存 stream 回放 |
| terminal | `open` `write` `close` | pty |
| window | `minimize` `toggleMaximize` `isMaximized` `close` | 无边框窗 |

### 推送事件

| 频道 | 载荷 |
|---|---|
| `agent.event` | `StreamEvent` v1+v2（见 `ai-capabilities`）；按 `sequence` 重放 |
| `window.maximized-changed` | `{ isMaximized: boolean }` |

新增频道的顺序：**先改 `ipc-contract` → main handle → preload → renderer 调用**。禁止 renderer 直接 `ipcRenderer`。

## 不变量

- 未知频道不暴露。preload 是唯一桥。
- `windowFromEvent` 取不到 BrowserWindow 就抛，不要静默 no-op 掉审批 / agent.run。
- `StreamEvent` 是 discriminated union，消费端用 `type` 收窄，不要 `as any`。
- 助手复杂消息走 `parseAssistantPayload` / `serializeAssistantPayload`，与 `foldToolEvent` 同一套折叠。

## 代码入口

- schema：`packages/ipc-contract/src/index.ts` 只再导出；聊天 `chat.ts`、工作区 `workspace-io.ts`、设置 `settings-input.ts`、审批 `approval.ts`、会话 `session.ts`、window / terminal / AI 能力各自独立
- 注册胶水：`apps/desktop/src/main/ipc.ts`（拼 `CHANNELS`，卸载必须成对）
- 壳频道：`ipc-shell.ts`（workspace / session / agent / terminal / window）
- 设置频道：`ipc-settings.ts`；探测 `ipc-provider-probe.ts`；Automations `ipc-automations.ts`
- AI 频道：`ipc-ai.ts`
- 桥：`apps/desktop/src/preload/index.ts`
- 渲染封装：`apps/desktop/src/renderer/src/lib/ide.ts`、`lib/window-control.ts`

## 已知坑

- 重复 `registerIpc` 会叠 handle。`ipc.ts` 用 `ipcRegistered` 守卫，卸载时 `unregisterIpc` 必须成对。`session.rename` 必须进 `CHANNELS`，否则卸载会留下 handler。
- 频道名是 `agent.decide`，不要写成 `agent.decideApproval`。
- Hash 路由与 IPC 无关，但设置页快捷键（`Ctrl+,` / Escape）在 `router.tsx`，不要做到 main 全局快捷键里抢焦点。
