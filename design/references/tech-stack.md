# Electron Agents IDE 技术栈说明书

> 位置：`design/references/tech-stack.md`。当前落地以 [`../specs/`](../specs/) 为准；本文是选型与分期背景。  
> 目标：做一个本地优先的 Agent IDE（编辑器 + 终端 + 多 Agent 循环 + 审批 + MCP）。
> 原则：渲染进程只画界面；模型调用、文件系统、终端、密钥全部在主进程。
> 文档版本：2026-08-30

---

## 1. 产品边界

本产品不是 VS Code 插件，也不是「聊天框套一层 Electron」。中心是 **Agent 循环**：读工作区、改文件、跑命令、调 MCP、在危险操作前停下来等人审批。

必须同时满足：

- 本机工作区实时可见（Monaco + 文件树 + Git）
- 流式推理与工具过程可见（Thinking / Tool Chips / Diff）
- 写文件、执行 shell 默认可审批
- 用户自带 Key（BYOK），密钥不下发到渲染进程
- 第一期可以完全没有云服务

---

## 2. 总架构

```text
Renderer（不受信）
  React 19 + Vite
  shadcn/ui + AI Elements（BoardUI tokens）
  TanStack Router / Query / Table / Virtual / Form / Pacer
  Monaco + xterm.js
  Zustand（仅 UI 状态）
        │  contextBridge + Zod 校验的 IPC
        │  事件：text.delta / tool.start / approval.required ...
        ▼
Main Process = 本机后端（可信）
  agent-runtime     Vercel AI SDK 7 ToolLoopAgent
  workspace         fs + chokidar + git
  terminal          node-pty
  mcp-host          @ai-sdk/mcp
  db                Drizzle + node:sqlite
  secrets           safeStorage / OS keychain
        │  HTTPS（BYOK 直连，或第二期云代理）
        ▼
模型供应商
  DeepSeek / OpenAI / Anthropic / OpenRouter / Ollama
```

可选第二进程：仅开发时用 Hono 挂在 `127.0.0.1`，方便 Web 端复用同一套 `agent-core`。发布版不要强制双进程。

---

## 3. 仓库与工程

| 项 | 选型 | 说明 |
|---|---|---|
| 包管理 | pnpm workspaces | 不要 npm |
| 任务编排 | Turborepo | `dev` / `build` / `typecheck` / `lint` 缓存 |
| 语言 | TypeScript strict | 全仓统一 `tsconfig` |
| 桌面壳 | Electron + electron-vite | 主进程 / preload / renderer 都能 HMR |
| 打包更新 | electron-builder + electron-updater | 或 Electron Forge makers |
| Lint/Format | ESLint + Prettier + oxlint（可选） | |
| 测试 | Vitest + Playwright | 单测 agent-core；E2E 打窗口 |

不选 Nx（对这个规模过重），不选 TanStack Start / Next.js 当桌面壳（SSR 对本地 pty 和文件无帮助）。

### 3.1 目录

```text
repo/
  apps/
    desktop/                 # Electron
      src/main/
      src/preload/
      src/renderer/
    web/                     # 可选，后期复用 UI
  packages/
    ui/                      # shadcn + Beautiful UI 封装 + Tailwind preset
    editor/                  # Monaco 封装
    terminal/                # xterm + 附件协议
    agent-core/              # 会话、工具、审批、流式（纯 TS，无 React / 无 Electron）
    providers/               # DeepSeek / OpenAI / Anthropic / Ollama 工厂
    ipc-contract/            # Zod：IPC 请求与 StreamEvent
    db/                      # Drizzle schema + 迁移
    config/                  # tsconfig / eslint / tailwind
  turbo.json
  pnpm-workspace.yaml
```

### 3.2 `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 3.3 `turbo.json`（示意）

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", "out/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] }
  }
}
```

---

## 4. 前端

### 4.1 必用

| 层 | 包 | 用途 |
|---|---|---|
| UI 框架 | React 19 | |
| 构建 | Vite（经 electron-vite） | 渲染进程 |
| 样式 | Tailwind CSS v4 | |
| 基础组件 | shadcn/ui + lucide-react | Button / Dialog / Tabs / Command / Sidebar |
| 布局 | react-resizable-panels | IDE 分栏 |
| Agent 原语 | AI Elements（elements.ai-sdk.dev） | Conversation、Message、PromptInput、Reasoning、Tool、CodeBlock |
| 编辑器 | monaco-editor | 与 VS Code 同内核 |
| 终端 | @xterm/xterm + 附件 | 与 node-pty 对接 |
| 客户端状态 | Zustand | 当前 session、面板开关、composer |
| 校验 | Zod | 与主进程共用 schema |

视觉走 BoardUI tokens。按钮、弹层、表单走 shadcn（装完 restyle）。Agent 过程表面走 AI Elements。Beautiful UI / BeUI 等只作参考源，不直接当运行时依赖。详见 `design/specs/ui.md` 与 `design/references/visual-system.md`。

### 4.2 TanStack：逐项决定

TanStack 是独立库，不是框架。Electron 渲染进程是纯客户端 SPA。

| 包 | 决定 | 用途 |
|---|---|---|
| @tanstack/react-query | 必上 | 会话列表、模型目录、MCP 状态、文件树懒加载 |
| @tanstack/react-router | 必上 | `/workspace/:id`、`/session/:id`、设置页；**Hash History** |
| @tanstack/react-table | 必上 | 工具日志、变更表、任务队列 |
| @tanstack/react-virtual | 必上 | 消息列表、文件树、超长 tool log |
| @tanstack/react-form | 建议 | 模型 / Key / MCP / 权限表单，配 Zod |
| @tanstack/react-pacer | 建议 | 搜索防抖、流式批渲染、自动保存、文件 watch 节流 |
| @tanstack/react-query-devtools | 开发必上 | |
| @tanstack/react-store | 不上 | 用 Zustand |
| @tanstack/db | 不上 | 真相在 SQLite |
| @tanstack/react-start | **禁止** | SSR，和主进程模型冲突 |
| @tanstack/ai | 观察 | 2026-08 刚进 RC，不要与 AI SDK 双栈 |

路由不要用 Browser History，file:// 与自定义协议下会踩坑。

### 4.3 渲染进程禁令

- 不在 renderer 读用户 API Key
- 不在 renderer 直接 `fs` / `child_process`
- 不把 `@ai-sdk/react` 的 `useChat`（HTTP）当主路径
- 不把 agent 循环写进 React 组件

---

## 5. Electron 安全基线

- `contextIsolation: true`
- `nodeIntegration: false`
- 禁用 `remote`
- preload 只暴露白名单 API
- 所有 IPC 入参用 Zod parse，失败即拒
- 渲染进程当不可信；审批决定可以来自 UI，执行只在 main

preload 形态：

```ts
contextBridge.exposeInMainWorld("ide", {
  agent: {
    run: (input: unknown) => ipcRenderer.invoke("agent.run", input),
    abort: (runId: string) => ipcRenderer.invoke("agent.abort", runId),
    decide: (decision: unknown) => ipcRenderer.invoke("agent.decide", decision),
    onEvent: (cb: (evt: unknown) => void) => {
      const listener = (_: unknown, evt: unknown) => cb(evt);
      ipcRenderer.on("agent.event", listener);
      return () => ipcRenderer.off("agent.event", listener);
    },
  },
});
```

---

## 6. AI SDK 与 Agent 运行时

### 6.1 选定

**Vercel AI SDK 7**（npm 包名 `ai`）。

用来做：

- 统一模型接口（换供应商只换 provider）
- `ToolLoopAgent` / `streamText` 多步工具循环
- `fullStream`：`text-delta`、`reasoning`、`tool-call`、`tool-result`
- 工具审批（写盘、shell）
- `@ai-sdk/mcp` 把 MCP 工具并入同一 `tools`
- DeepSeek 走 OpenAI 兼容端点

### 6.2 必装 AI 包

```text
ai
@ai-sdk/openai              # OpenAI，以及 DeepSeek / 硅基流动 / 自建 /v1
@ai-sdk/anthropic
@ai-sdk/google              # 可选
@ai-sdk/mcp
zod
```

可选：

```text
@openrouter/ai-sdk-provider
@ai-sdk/openai-compatible
```

### 6.3 DeepSeek 接法

```ts
import { createOpenAI } from "@ai-sdk/openai";

export const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY, // 仅主进程可读
});

// deepseek("deepseek-v4-pro")
// deepseek("deepseek-v4-flash")
```

国内中转把 `baseURL` 换成兼容网关即可，模型 ID 按网关文档透传。

### 6.4 Agent 内核放 `packages/agent-core`

```ts
import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";

const writeFile = tool({
  description: "写入工作区文件。会触发人工审批。",
  inputSchema: z.object({
    path: z.string(),
    content: z.string(),
  }),
  needsApproval: true,
  execute: async ({ path, content }, { experimental_context }) => {
    // 只在审批通过后由主进程 workspace 服务执行
  },
});

export function createCodingAgent(model: Parameters<typeof ToolLoopAgent>[0]["model"]) {
  return new ToolLoopAgent({
    model,
    instructions: SYSTEM_PROMPT,
    tools: {
      writeFile,
      readFile,
      editFile,
      grep,
      glob,
      bash,
    },
  });
}
```

流式转换：主进程消费 `fullStream`，映射为 `ipc-contract` 里的 `StreamEvent`，再 `webContents.send`。

建议事件：

```text
agent.run.start
agent.text.delta
agent.reasoning.delta
agent.tool.start
agent.tool.args.delta
agent.tool.result
agent.approval.required
agent.approval.resolved
agent.run.end
agent.run.error
```

### 6.5 不要当底座的框架

| 方案 | 原因 |
|---|---|
| TanStack AI | 刚 RC；AG-UI 与 AI SDK UIMessage 两套协议 |
| Mastra | 面向云端 Agent 服务，桌面主进程过重 |
| LangGraph / LangChain | Python 优先，TS 桌面团队成本高 |
| 各家官方 SDK 散装 | 流式与 tool 形状不统一 |
| 把 Claude Code / Codex CLI 当唯一内核 | 失去审批与 UI 协议控制；可作为后期 Harness 插件 |

AI SDK 7 的 `HarnessAgent` 可在第二期用来挂外部编码 Agent，那是插件位，不是内核。

---

## 7. 本机后端（第一期就是产品后端）

全部在 Electron main。

| 职责 | 技术 |
|---|---|
| 对外 HTTP | 默认没有。若要给 Web/扩展复用，主进程内嵌 Hono 听 `127.0.0.1` |
| 数据库 | Drizzle ORM + **`node:sqlite`** |
| 库路径 | `app.getPath("userData")/app.db` |
| 密钥 | `safeStorage.encryptString`，禁止明文 JSON |
| 文件监视 | chokidar |
| Git | simple-git 或 git 子进程 |
| 终端 | node-pty |
| MCP | @ai-sdk/mcp（stdio / HTTP 都在主进程连） |
| 任务队列 | p-queue + SQLite 表 |
| 日志 | 本机滚动日志；可选 OTel → Langfuse（默认关） |

优先 `node:sqlite` 而不是 `better-sqlite3`，避免 Electron ABI / rebuild / asar unpack。

### 7.1 建议表结构

- `workspaces`
- `sessions`
- `messages`
- `message_parts`（text / reasoning / tool / approval）
- `tool_calls`
- `approvals`
- `settings`
- `mcp_servers`
- `files_index`（path / hash / mtime）

向量检索第一期不做。若要做：sqlite-vec 或本地 embedding，不要一上来 Postgres + pgvector。

### 7.2 `packages/ipc-contract` 示例

```ts
import { z } from "zod";

export const RunAgentInput = z.object({
  sessionId: z.string(),
  workspaceId: z.string(),
  modelId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
});

export const ApprovalDecision = z.object({
  runId: z.string(),
  toolCallId: z.string(),
  decision: z.enum(["allow", "deny", "allow_session"]),
});

export const StreamEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("run.start"), runId: z.string() }),
  z.object({ type: z.literal("text.delta"), runId: z.string(), text: z.string() }),
  z.object({ type: z.literal("reasoning.delta"), runId: z.string(), text: z.string() }),
  z.object({
    type: z.literal("tool.start"),
    runId: z.string(),
    toolCallId: z.string(),
    name: z.string(),
  }),
  z.object({
    type: z.literal("approval.required"),
    runId: z.string(),
    toolCallId: z.string(),
    name: z.string(),
    args: z.unknown(),
  }),
  z.object({ type: z.literal("run.end"), runId: z.string() }),
  z.object({ type: z.literal("run.error"), runId: z.string(), message: z.string() }),
]);

export type RunAgentInput = z.infer<typeof RunAgentInput>;
export type ApprovalDecision = z.infer<typeof ApprovalDecision>;
export type StreamEvent = z.infer<typeof StreamEvent>;
```

---

## 8. 云后端（第二期，可缺省）

只在需要以下能力时才建：

- 账号 / 团队 / 座位
- 设置与会话跨设备同步
- 由你们垫付 token（代理，厂商 Key 不出云）
- 云沙箱跑危险命令
- 计费与用量

编码 Agent 主循环 **不要** 放到云上。循环必须贴着用户磁盘和终端。

| 项 | 选型 |
|---|---|
| 框架 | Hono + Node 或 Bun |
| 托管 | Fly.io / Railway / 自建 VPS |
| 数据库 | Postgres + Drizzle（Neon / RDS） |
| 认证 | Better Auth 或 Clerk；桌面用设备码 + 深链 |
| 对象存储 | 只存头像、导出包，不默认上传工作区 |
| 禁止 | 用 Next.js API 当 IDE 后端 |

BYOK 用户：模型请求本机直连，云不经手。
托管额度用户：渲染进程 → 本机 → 你们的代理 → 供应商。

---

## 9. 依赖总表

### 9.1 应用与工程

```text
electron
electron-vite
electron-builder
electron-updater
turbo
typescript
vite
react
react-dom
```

### 9.2 UI

```text
tailwindcss
@tailwindcss/vite
class-variance-authority
clsx
tailwind-merge
lucide-react          # shadcn internals; product chrome uses @remixicon/react
react-resizable-panels
zustand
```

视觉语言：BoardUI tokens（`packages/ui/styles`）。组件：shadcn/ui + AI Elements，安装后改成 BoardUI 外观。ThemeToggle / ComposerLoader 保留 BoardUI 实现。新功能先在 shadcn、AI Elements、Beautiful UI、BeUI、Rare UI、21st、Motion Primitives、vgpu、ThreeUI 里找，再 restyle。详见 `design/specs/ui.md` 与 `design/references/visual-system.md`。

### 9.3 TanStack

```text
@tanstack/react-router
@tanstack/react-query
@tanstack/react-table
@tanstack/react-virtual
@tanstack/react-form
@tanstack/react-pacer
@tanstack/react-query-devtools
```

### 9.4 编辑器与终端

```text
monaco-editor
@xterm/xterm
@xterm/addon-fit
@xterm/addon-web-links
node-pty
```

### 9.5 AI 与本机后端

```text
ai
@ai-sdk/openai
@ai-sdk/anthropic
@ai-sdk/mcp
zod
drizzle-orm
chokidar
simple-git
p-queue
```

### 9.6 测试

```text
vitest
@testing-library/react
playwright
```

### 9.7 云端（有账号再加）

```text
hono
drizzle-orm
postgres
better-auth
```

---

## 10. 内置工具清单（Agent 内核）

第一期只做稳定、可审批的最小集：

| 工具 | 审批 | 说明 |
|---|---|---|
| read_file | 否 | 限工作区 |
| list_dir | 否 | |
| glob | 否 | |
| grep | 否 | |
| edit_file | 是 | unified diff 或 search-replace |
| write_file | 是 | |
| bash | 是 | cwd 锁在工作区；超时；输出截断 |
| git_status | 否 | |
| git_diff | 否 | |
| git_log | 否 | 线性 porcelain，默认 20 条 |
| git_commit | 是 | |
| git_push | 是 | 与 commit 同一 Git 审批档 |

MCP 工具动态合并进同一 tool map。高风险 MCP 默认走审批。

---

## 11. 系统提示与技能

- 系统提示放 `agent-core`，按模式切换：Agent / Plan / Ask / Debug
- 项目技能：工作区 `.agents/skills/*/SKILL.md`（或兼容 Agent Skills 目录）
- 用户技能：`userData/skills`
- 不要把整仓源码塞进上下文；用文件索引 + 按需 read/grep

---

## 12. 观察性

- 每个 run 记：模型、token、耗时、工具次数、是否被拒
- 开发环境可开 AI SDK telemetry
- 用户可选手动打开 Langfuse；默认关闭，数据不出本机

---

## 13. 分期

### MVP

- Electron 窗口 + 分栏布局
- Monaco 打开工作区
- 本机 SQLite 会话
- DeepSeek / OpenAI 兼容 + ToolLoopAgent
- 读文件 / 搜索 / 写文件（审批）/ bash（审批）
- Beautiful UI 呈现流式与 tool chips
- 无云、无向量检索、无多 Agent 编排

### V1

- MCP
- 多模型路由与辅助模型（便宜模型做摘要/标题）
- Git 面板
- 会话搜索
- 用量统计
- 自动更新
- Prompt Bar：`@` 引用文件、`/` 命令

### V1.5

- 云账号与设置同步
- 可选 token 代理
- 子 Agent（只读探索 / 单文件修补）
- Harness 插件位（可选接 Claude Code / Codex）

### 明确后置

- 实时多端 CRDT 同步
- 云端跑主循环
- TanStack AI / TanStack DB
- 自研训练或本地大模型分发（Ollama 只做可选后端）

---

## 14. 明确不要做的选择

1. 用 Next.js / TanStack Start 包桌面
2. 在 renderer 调模型
3. Redux 管远程数据（用 Query）
4. 第一期上 Mastra / LangGraph
5. better-sqlite3 作为默认驱动
6. 把 Beautiful UI 当完整 Design System
7. 未审批就执行 write / bash
8. API Key 进渲染进程或进 Git

---

## 15. 启动顺序（建议）

1. 建 pnpm + turbo 空仓与 `packages/ipc-contract`
2. `apps/desktop` 跑通主进程 / preload / 空白 React
3. shadcn + 分栏 + 暗色主题
4. `packages/db` 建表，能写入一条 session
5. `packages/agent-core` 接 DeepSeek，命令行打通 `fullStream`
6. IPC 把 stream 推到 renderer，用 Beautiful UI 渲染
7. 接 Monaco 与工作区只读
8. 加 write / bash 审批
9. xterm + pty
10. MCP

不要并行铺 Web 端和云账号。

---

## 16. 参考链接

- TanStack：https://tanstack.com/
- Beautiful UI：https://www.beautifului.dev/
- shadcn/ui：https://ui.shadcn.com/
- Vercel AI SDK：https://ai-sdk.dev/
- AI SDK MCP：https://www.npmjs.com/package/@ai-sdk/mcp
- electron-vite：https://electron-vite.org/
- Turborepo：https://turborepo.dev/
- Drizzle：https://orm.drizzle.team/
- DeepSeek API + Hermes 接入（模型侧参考）：https://api-docs.deepseek.com/

---

## 17. 一句话

**pnpm + Turbo + Electron + React + shadcn + Beautiful UI + 精选 TanStack + Vercel AI SDK 7 + 主进程 Drizzle/SQLite。**  
云可选，Agent 循环必须留在本机。
