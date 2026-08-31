# spec/ipc

> 渲染进程只打白名单；入参全部 Zod。最后更新：2026-08-31

## 当前真相

合约包：`packages/ipc-contract`。preload 把 `ipcRenderer.invoke` / `on` 收成 `window.ide`。main 在 `apps/desktop/src/main/ipc.ts` 注册 handle。

### Invoke 频道（实现已有）

| 前缀 | 频道 | 用途 |
|---|---|---|
| workspace | `open` `list` `files` `readFile` `diff` `changes` | 工作区与文件 |
| session | `list` `create` `messages` | 会话 |
| agent | `run` `abort` `decide` | 跑循环、中止、审批 |
| settings | `get` `saveSecret` `setDefaultModel` `setPreferences` `setHarness` `listProviders` `presets` `upsertProvider` `removeProvider` `activateProvider` `setActiveModel` `probeProvider` `pingProvider` | 设置与供应商 |
| automations | `list` `upsert` `remove` | 自动化 |
| models | `list` | 已配置模型目录 |
| terminal | `open` `write` `close` | pty |
| window | `minimize` `toggleMaximize` `isMaximized` `close` | 无边框窗 |

### 推送事件

| 频道 | 载荷 |
|---|---|
| `agent.event` | `StreamEvent`（见 `agent-runtime`） |
| `window.maximized-changed` | `{ isMaximized: boolean }` |

新增频道的顺序：**先改 `ipc-contract` → main handle → preload → renderer 调用**。禁止 renderer 直接 `ipcRenderer`。

## 不变量

- 未知频道不暴露。preload 是唯一桥。
- `windowFromEvent` 取不到 BrowserWindow 就抛，不要静默 no-op 掉审批 / agent.run。
- `StreamEvent` 是 discriminated union，消费端用 `type` 收窄，不要 `as any`。
- 助手复杂消息走 `parseAssistantPayload` / `serializeAssistantPayload`，与 `foldToolEvent` 同一套折叠。

## 代码入口

- schema：`packages/ipc-contract/src/index.ts`（window 在 `window.ts`，terminal 在 `terminal.ts`）
- 注册：`apps/desktop/src/main/ipc.ts`
- 桥：`apps/desktop/src/preload/index.ts`
- 渲染封装：`apps/desktop/src/renderer/src/lib/ide.ts`、`lib/window-control.ts`

## 已知坑

- 重复 `registerIpc` 会叠 handle。`ipc.ts` 用 `ipcRegistered` 守卫，卸载时 `unregisterIpc` 必须成对。
- Hash 路由与 IPC 无关，但设置页快捷键（`Ctrl+,` / Escape）在 `router.tsx`，不要做到 main 全局快捷键里抢焦点。
