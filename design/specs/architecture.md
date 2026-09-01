# spec/architecture

> 渲染进程不受信；主进程是本机后端。最后更新：2026-09-02

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
| `apps/desktop` | Electron 壳：main / preload / renderer。品牌源 `public/enjoy-ui-kit`，打包图标 `build/`，运行时窗标 `resources/` |
| `packages/agent-core` | 会话提示、工具、审批、diff（无 React / 无 Electron） |
| `packages/agent-harness` | 外部编码 Agent 插件：Claude Code / Codex / Pi / OpenCode（非默认内核） |
| `packages/providers` | 协议工厂：语言 + 官方媒体（Fal / Replicate / ElevenLabs / Deepgram / Cohere / Gateway） |
| `packages/ipc-contract` | Zod：IPC 入参与 `StreamEvent` |
| `packages/db` | SQLite 迁移框架 + runs / assets / knowledge / mcp / metrics |
| `packages/knowledge` | 忽略规则、分块、本地检索 |
| `packages/assets` | 资产哈希、导出路径策略 |
| `packages/mcp` | Server 权限与 App JSON-RPC 隔离 |
| `packages/ui` | tokens、shadcn、AI Elements、ThemeToggle / ComposerLoader |
| `packages/editor` | Monaco 封装（接入中） |
| `packages/config` | 共享 tsconfig |

包管理：pnpm workspaces + Turborepo。语言：TypeScript strict。Node `>=22.12.0`。

### 数据

- 库文件：`app.getPath("userData")` 下的 SQLite（`node:sqlite` + WAL）。
- 表：基线四张 + `schema_migrations` 与 AI Runtime 表（runs、assets、knowledge_*、mcp_*、telemetry_metrics）。向量存在 SQLite，检索在本机。
- 供应商密钥：主进程 vault + `safeStorage`，renderer 只见 `hasKey` / `keyHint`。
- 资产文件：`userData/assets`。视频回放走自定义协议 `enjoy-asset://local/<id>`（`registerSchemesAsPrivileged` 必须在 `app.ready` 之前）。Realtime 只在 main 代理 WebSocket。
- Knowledge 向量与 MCP 会话、Workflow checkpoint 都只信 SQLite / main 内存，不信 renderer。

## 不变量

- `contextIsolation: true`，`nodeIntegration: false`，禁用 remote。
- preload 只暴露白名单 `window.ide`。
- 所有 IPC 入参 Zod parse，失败即拒。
- Customize 的 Rules / Skills 只读写白名单根（全局 `~/.enjoy-agents/{rules,skills}` 等 + 已登记工作区的规范子目录 / 已知文件名）。禁止 `process.cwd()`，禁止 renderer 绝对路径直接 `fs`。
- 审批决定可以来自 UI，执行只在 main。
- 路由必须是 **Hash History**（`file://` / 自定义协议下 Browser History 会断）。

## 代码入口

- 窗口与生命周期：`apps/desktop/src/main/index.ts`
- IPC 注册：`apps/desktop/src/main/ipc.ts`（胶水）+ `ipc-shell.ts` / `ipc-settings.ts` / `ipc-ai.ts`
- 密钥 vault：`apps/desktop/src/main/services/secrets-vault.ts`；档案 CRUD：`secrets.ts`
- preload：`apps/desktop/src/preload/index.ts`
- 选型长文：[../references/tech-stack.md](../references/tech-stack.md)

## 已知坑

- AI SDK 7 的 `execute()` 只注入 `toolsContext[name]`，不会把 `runtimeContext` 放进 `options.context`。工具 host 必须在建工具时闭包注入，否则审批通过后会报 `Workspace host is missing`。见 `packages/agent-core/src/tools/index.ts`。
- 不要把 `@ai-sdk/react` 的 `useChat`（HTTP）当桌面主路径。流从 main `webContents.send("agent.event")` 来。
- electron-vite 把 `@enjoy-agents/db` 别名到 `index.ts` 文件时，`@enjoy-agents/db/path-safe` 会变成 `index.ts/path-safe`。主进程别名必须精确匹配包名，子路径单独写。路径安全也可从 `@enjoy-agents/db` 主入口导入。
- 主进程 workspace 包必须进 `externalizeDepsPlugin.exclude` 并别名到 `src/index.ts`。漏掉 `assets` / `knowledge` / `mcp` 时，Electron 会直接加载源码，`from "./hash"` 无后缀会报 `ERR_MODULE_NOT_FOUND`。新包先写进 `electron.vite.config.ts` 的 `MAIN_WORKSPACE_PACKAGES`。
- Rules/Skills 的 `read`/`delete`/`reveal` 若只信 `filePath` 字符串，renderer 可指到任意盘符。必须 `assertAllowedRuleFile` / `assertAllowedSkillPackage`，工作区路径还要能对上 `workspaces.root_path`。
