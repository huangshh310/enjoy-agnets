# spec/architecture

> 渲染进程不受信；主进程是本机后端。最后更新：2026-08-31

## 当前真相

```text
Renderer（不受信）
  React 19 + Vite + Hash Router
  BoardUI tokens + shadcn/ui + AI Elements
  Zustand（仅 UI）+ TanStack Query
        │  contextBridge + Zod IPC
        ▼
Main Process（可信）
  agent-runtime     packages/agent-core + AI SDK 7
  providers         packages/providers
  workspace         fs / git / 审批执行
  terminal          node-pty
  db                Drizzle 形态的 schema + node:sqlite
  secrets           safeStorage / OS keychain
        │  HTTPS（BYOK 直连）
        ▼
模型供应商
```

### 仓库

| 路径 | 职责 |
|---|---|
| `apps/desktop` | Electron 壳：main / preload / renderer |
| `packages/agent-core` | 会话提示、工具、审批、diff（无 React / 无 Electron） |
| `packages/agent-harness` | 外部编码 Agent 插件位（非内核） |
| `packages/providers` | 协议工厂：`openai` / `anthropic` / `openai-responses` |
| `packages/ipc-contract` | Zod：IPC 入参与 `StreamEvent` |
| `packages/db` | SQLite 建表（`workspaces` / `sessions` / `messages` / `settings`） |
| `packages/ui` | tokens、shadcn、AI Elements、ThemeToggle / ComposerLoader |
| `packages/editor` | Monaco 封装（接入中） |
| `packages/config` | 共享 tsconfig |

包管理：pnpm workspaces + Turborepo。语言：TypeScript strict。Node `>=22.12.0`。

### 数据

- 库文件：`app.getPath("userData")` 下的 SQLite（`node:sqlite` + WAL）。
- 表：`workspaces`、`sessions`、`messages`、`settings`。向量检索第一期不做。
- 供应商密钥：主进程 vault + `safeStorage`，renderer 只见 `hasKey` / `keyHint`。

## 不变量

- `contextIsolation: true`，`nodeIntegration: false`，禁用 remote。
- preload 只暴露白名单 `window.ide`。
- 所有 IPC 入参 Zod parse，失败即拒。
- 审批决定可以来自 UI，执行只在 main。
- 路由必须是 **Hash History**（`file://` / 自定义协议下 Browser History 会断）。

## 代码入口

- 窗口与生命周期：`apps/desktop/src/main/index.ts`
- IPC 注册：`apps/desktop/src/main/ipc.ts`
- preload：`apps/desktop/src/preload/index.ts`
- 选型长文：[../references/tech-stack.md](../references/tech-stack.md)

## 已知坑

- AI SDK 7 的 `execute()` 只注入 `toolsContext[name]`，不会把 `runtimeContext` 放进 `options.context`。工具 host 必须在建工具时闭包注入，否则审批通过后会报 `Workspace host is missing`。见 `packages/agent-core/src/tools/index.ts`。
- 不要把 `@ai-sdk/react` 的 `useChat`（HTTP）当桌面主路径。流从 main `webContents.send("agent.event")` 来。
