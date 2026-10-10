# spec/architecture

> 进程边界与安全基线。最后更新：2026-10-10（014 审批 SDK + 015 cost_missing 列守卫；typecheck 不再等上游；renderer 开 no-undef）

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
  workspace         fs / git / 审批执行；SSH 时第二只 `AgentWorkspaceHost` 适配器（连接层 + 工厂，不把 SSH 散进每个 handler）
  app-update        electron-updater → GitHub Releases
  terminal          node-pty + renderer xterm
  db                手写 SQL 迁移 + repository 函数 + node:sqlite（未引入 Drizzle ORM）
  secrets           safeStorage / OS keychain（含 SSH 登录密码，按 hostId）
  computer-use      附属进程：darwin AX / win32 UIA / linux AT-SPI（换行 JSON）
        │  HTTPS（BYOK 直连）
        ▼
模型供应商
```

### 仓库

| 路径 | 职责 |
|---|---|
| `apps/desktop` | Electron 壳：main / preload / renderer。品牌源 `public/enjoy-ui-kit`，打包图标 `build/`，运行时窗标 `resources/` |
| `apps/browser-extension` | Chrome 扩展：Browser Bridge；无 npm 依赖，lockfile 必须有 `importers["apps/browser-extension"]`（空对象即可） |
| `packages/agent-core` | 会话提示、工具、审批、diff（无 React / 无 Electron） |
| `packages/agent-harness` | 外部编码 Agent 插件：Claude Code / Codex / Pi / OpenCode（非默认内核） |
| `packages/providers` | 协议工厂：语言 + 官方媒体（Fal / Replicate / ElevenLabs / Deepgram / Cohere / Gateway） |
| `packages/ipc-contract` | Zod：IPC 入参与 `StreamEvent` |
| `packages/db` | SQLite 迁移框架 + runs / assets / knowledge / mcp / metrics |
| `packages/knowledge` | 忽略规则、分块、本地检索 |
| `packages/assets` | 资产哈希、导出路径策略 |
| `packages/mcp` | Server 权限与 App JSON-RPC 隔离 |
| `packages/ui` | tokens、shadcn、AI Elements、ThemeToggle / ComposerLoader |
| `packages/editor` | Monaco 封装；Files 预览可写，不是完整 IDE |
| `packages/config` | 共享 tsconfig |

包管理：pnpm workspaces + Turborepo。语言：TypeScript strict。Node `>=22.12.0`。ESLint 未接线。

**Lint（`pnpm lint` = 仓库根一条裸 `oxlint`，不走 turbo；`turbo.json` 不再有 `lint` task）**

- `categories.correctness` 为 `error`；`plugins` 为 `["typescript", "import", "unicorn"]`。
- `react` / `react-hooks` plugin **本轮未开**：`set-state-in-effect` 58 条、`exhaustive-deps` 45 条、`refs` 25 条属架构级改造，与 CU-P1 并行做会大面积撞车。开之前先单列一轮。
- 三条 shadcn 视觉规则（`no-restyle` / `no-raw-colors` / `no-arbitrary-values`）继续只管 `className`，见 `ui` spec。
- 有意豁免（不是漏开）：`packages/ui/components/ai-elements/**` 关掉未使用参数检查（registry 原文件形态，重排会与上游更新长期冲突）；`**/*.d.ts` 关 `triple-slash-reference`（`env.d.ts` 靠它接 preload 类型）。
- **渲染进程边界由 lint 强制**：`apps/desktop/src/renderer/**` 上 `no-restricted-imports` 禁 `@enjoy-agents/agent-core` / `@enjoy-agents/agent-harness` / `@enjoy-agents/db` / `@enjoy-agents/knowledge` / `@enjoy-agents/providers` 主入口、`ai`、`electron`，以及 `node:*` / `fs` / `path` / `os` / `child_process` / `net` / `http(s)` 与 `@ai-sdk/*`。另开 `no-undef` + `env.browser`：oxlint 默认对 TS 关 no-undef，合入丢 named import 会白屏而 lint 绿。
- 该豁免的例外只有 renderer 的 `*.test.ts`：它们是 `node:test` 源码扫描器，不进 bundle，所以 override 里关掉边界规则；测试文件同样开 `no-undef`，并加 `env.node`。

**测试（`pnpm test` = `turbo run test`；typecheck / test 不再 `dependsOn: ["^typecheck"]`，避免上游红了下游根本不跑）**

- 每个工作区的 `test` 脚本只准用 glob 自动发现（`node --experimental-strip-types --test "src/**/*.test.ts"`；`packages/ui` 是 `components/**/*.test.ts`）。禁止回退成手写文件清单。desktop 额外 `--import ./src/main/services/test-hooks/register.mjs`：electron 桩 + 无后缀相对 import 补 `.ts`，好让行为测试走 `decideApproval` / `failAgentPump` 等生产路径。
- 历史教训：手写 376 项清单里留着一个已删除的 `company/billing/billing.test.ts`，`node --test` 在**收集阶段**就 exit 1，整个 desktop 套件一条都没跑，而 CI 只显示「test 失败」这一行。同批还有 20 个测试文件从未被任何脚本引用。
- 传目录参数不可用：`node --test src/main` 会把目录当模块加载并报 `MODULE_NOT_FOUND`，只有引号 glob 形态能递归收 `.ts`。
- 采集守卫在 `apps/desktop/src/main/repo-test-harness-invariants.test.ts`：每个有测试文件的工作区必须有 `test` 脚本、每个 `*.test.ts(x)` 必须被 glob 覆盖、每个 glob 必须至少匹配 1 个文件；它自己还先断言「确实看到了 ≥10 个工作区 / ≥400 个测试文件」，防止路径算错导致守卫空跑通过。

**CI（`.github/workflows/ci.yml`）**

- `check` job 是 `ubuntu-latest` / `macos-latest` / `windows-latest` 三端矩阵，`fail-fast: false`，步骤 `lint → typecheck → test → build`。
- `build` 是 `electron-vite build`（不含打包签名）；必须有，因为 workspace 包别名与无后缀导入的 `ERR_MODULE_NOT_FOUND` 只在打包期暴露。
- `contracts` job 只跑 `e2e/contracts.spec.ts`（纯 Node）。`electron-window.spec.ts` / `agent-stub.spec.ts` 要显示环境与 Electron 系统库，**CI 不假装跑通**，留本机。

### 数据

- 库文件：`app.getPath("userData")` 下的 SQLite（`node:sqlite` + WAL）。
- 表：基线四张 + `schema_migrations` 与 AI Runtime 表（runs、run_steps、message_parts、approvals、assets、provider_file_refs、knowledge_*、mcp_*、telemetry_metrics），另有 `secrets_vault`（004）、`inbox_state`（005）、`sessions` 工作流列 `flagged` / `workflow_status` / `goal` / `recap`（006）、`run_steps.child_run_id`（007）。COST-P3（013）：`runs.usage_json` 存本轮分项 token / 上报花费；`telemetry_metrics` 增 `cache_read_tokens` / `cache_write_tokens` / `reasoning_tokens` / `estimated_cost_usd` / `cost_status`（缺项 NULL，不要回填 0）。审批 SDK 列（014 / #118）：`approvals.request_args` / `sdk_approved` / `sdk_reason` / `resume_code` / `sdk_approval_id` + UNIQUE `approvals_sdk_identity`。015（#119）：`telemetry_metrics.cost_missing` 存未知原因 JSON 数组，非法枚举经合约 `.catch` 丢掉本字段。014 / 015 的 ADD 都有列存在性守卫；若本地库已经把 v14 记成旧 `cost-missing`，启动时按列补上审批 SDK 列（含 `sdk_approval_id` 与 UNIQUE 索引）和 `cost_missing`，不必重建库。向量存在 SQLite，检索在本机。
- 供应商密钥：主进程 vault + `safeStorage`（密文存 `secrets_vault` 专表，不再挤 settings KV），renderer 只见 `hasKey` / `keyHint`（掩码，从不回明文）。C 端列表只写「密钥已保存」，不要把后四位摊成列表副文案。
- 资产文件：`userData/assets`。视频回放走自定义协议 `enjoy-asset://local/<id>`（`registerSchemesAsPrivileged` 必须在 `app.ready` 之前）。Realtime 只在 main 代理 WebSocket。
- Knowledge 向量与 MCP 会话、Workflow checkpoint 都只信 SQLite / main 内存，不信 renderer。
- 本机 CLI 账号探测：main 可读 Cursor IDE `state.vscdb` 的 `cursorAuth/accessToken`、Grok `~/.grok/auth.json` 的 `key`，只用于打官方账单接口。token / key **不**进 IPC、**不**进 renderer、**不**写回文件。
- 读取者集中在 `apps/desktop/src/main/services/agent-tools-account/session-usage.ts`。白名单就是下面这五条，超出即视为新增加密凭据读取面，必须同时改本段与 `cli-usage` spec。
- Cursor：`state.vscdb` 的 `cursorAuth/accessToken`。以 `{ readOnly: true }` 打开并在 `finally` 关闭。
- Grok：`~/.grok/auth.json` 的 `key`。
- Codex：`~/.codex/auth.json` 的 `tokens.access_token`；`CODEX_HOME` 可覆盖目录。
- Claude：优先 `CLAUDE_CODE_OAUTH_TOKEN` 环境变量，其次 `~/.claude/.credentials.json` 的 `claudeAiOauth.accessToken`；`CLAUDE_CONFIG_DIR` 可覆盖目录。
- Antigravity：只读 `~/.antigravity_tools/accounts.json` 与 `accounts/<id>.json` 的公开邮箱 / `quota_groups`，不读 Google login / OAuth 文件。
- 这五条的凭据只在 main 内存里活一次，用来打对应官方 HTTPS；禁止写进 `InspectAgentToolResult`、`secrets_vault` 或任何 IPC 返回值。`AgentToolAuthAccount` 与 `InspectAgentToolResult` 的字段表就是这条约束的落点。
- 仍不读：`~/.claude.json`（与 `.credentials.json` 是两个文件）。Enjoy Local 不走 `inspect`（vault 不是登录型 CLI）。

## 不变量

- `contextIsolation: true`，`nodeIntegration: false`，禁用 remote。`sandbox: false` 与 `webviewTag: true` 是有意为之（webview 见下），改动前先评估。
- preload 只暴露白名单 `window.ide`。
- 所有 IPC 入参 Zod parse，失败即拒。
- Customize 的 Rules / Skills 只读写白名单根（全局 `~/.enjoy-agents/{rules,skills}` 等 + 已登记工作区的规范子目录 / 已知文件名）。禁止 `process.cwd()`，禁止 renderer 绝对路径直接 `fs`。
- 审批决定可以来自 UI，执行只在 main。
- 路由必须是 **Hash History**（`file://` / 自定义协议下 Browser History 会断）。
- `agentTools.inspect` / `login` / ACP 的 spawn：`cwd` = 已登记工作区（没有则家目录），禁止 `process.cwd()`；**编码 CLI / ACP 保持 `shell: false`**；命令必须过 `assertAllowedCommand`。Windows 上 `npm.cmd` / `*.bat` 安装管理器例外：只经 `spawnPathCommand`（仅脚本后缀才 `shell: true`），禁止把 ACP 二进制改成 `shell: true`。
- `spawnPathCommand` 的 `shell` 在 `...extra` **之后**写死（`packages/agent-harness/src/agent-tools/detect/probe.ts`）：调用方不能用 extra 绕过「仅 win32 + `.cmd`/`.bat`」这道闸。改这个函数顺序等于关掉不变量。
- 桌面目标是 **Windows / macOS / Linux**。实现路径、PATH 探测、spawn、安装/更新、快捷键、文件监视时必须写清三端差异；不能只在开发者本机一种系统上跑通。macOS Homebrew、Linux linuxbrew、Windows `npm.cmd` + `Program Files/nodejs` 不是同一条 PATH。不支持的平台要降级成复制命令，禁止假一键。

## 代码入口

- 窗口与生命周期：`apps/desktop/src/main/index.ts`。`requestSingleInstanceLock` 在 `whenReady` 之前；失败者 `app.exit(0)`，不启动 automations 调度 / 回看 / 补跑，退出钩子不碰共享库。`second-instance` 聚焦已有窗，未 ready 不新建（macOS Dock 仍走 `activate`）。
- IPC 注册：`apps/desktop/src/main/ipc.ts`（胶水）+ `ipc-session.ts` / `ipc-shell.ts` / `ipc-settings.ts` / `ipc-ai.ts`
- 密钥 vault：`apps/desktop/src/main/services/secrets-vault.ts`；档案 CRUD：`secrets.ts`
- preload：`apps/desktop/src/preload/index.ts`
- 跨平台 PATH / spawn：`packages/agent-harness/src/agent-tools/detect/probe.ts`（`pathDirs` / `lookupOnPath` / `spawnPathCommand`）
- Computer Use 执行器：`apps/desktop/native/computer-use/`，main 经 `executor-command.ts` 查找；打包进 `resources/bin/<platform>-<arch>/`。darwin helper 在有 `CSC_NAME` / `CU_CODESIGN_IDENTITY` 时由 `stage-computer-use.cjs` codesign；`desktop_doctor` 验即将 spawn 的路径与签名，未签名不得报绿。执行器可点其它应用，必须由用户打开设置开关并审批 `desktop_act`。辅助功能授给 **Enjoy Computer Use helper**，不是 renderer，也不是只授给 Electron 宿主。
- 选型长文：[../references/tech-stack.md](../references/tech-stack.md)
- 设计系统 lint：仓库根 `.oxlintrc.json`；命令 `pnpm lint`

## 已知坑

- [open] `no-inline-styles` / `no-unknown-classes` / `require-static-classes` 仍未打开：玻璃皮肤指针、mascot 与动态 className 会刷屏。2026-10 已开的是 `correctness` 加 `typescript` / `import` / `unicorn`；renderer 另开 `no-undef` + `env.browser`（oxlint 默认对 TS 关 no-undef，合入丢 import 会白屏而 lint 绿）。`react` / `react-hooks`（约 131 条：`set-state-in-effect` 58、`exhaustive-deps` 45、`refs` 25）是架构级改造，留给单独一轮，别和功能 PR 混在一起。
- `@shadcn/lint` 抱怨项目 `cn`：本仓 `cn` 是 0.2.6，linter 语法要 ≥0.3.2，于是它改用自带 `cn` 0.3.2。lint 校验的 className 合并语义因此与 app 运行时不一致——升 `cn` 之前，三条视觉规则的结论只当参考。详见 `ui` spec。
- [guard:.oxlintrc.json renderer override] 渲染进程打 `@enjoy-agents/agent-core` 主入口会把 `node:` 打进 bundle：现在 `no-restricted-imports` 直接报错，不再只靠约定。
- **隐患**：desktop `node:test` 行为测试若静态相对 import 生产模块（`approval-hmac` / `decide-approval` / `fail-agent-pump` / `run-usage` / `consume-run`），守卫会因这些文件 value-import `@enjoy-agents/db` / 合约入口而红。正确做法：纯函数抽到无桶入口的叶子（如 `run-usage-accumulate.ts`）再测，或测试里 `await import(...)` 动态加载；ACP 桶仍只能动态 import，`--experimental-strip-types` 会把 `private readonly` 参数属性剥成非法语法。泵 finally 的缺用量测试必须经过 `consumeRun`，不要只调 `finalizePumpUsage`。
- **隐患**：#119 早期把 `cost_missing` 写成 v14。本地库若跑过那一刀，`schema_migrations` 已有 version=14，#118 的 `approval-sdk-response` 会被跳过。正确做法：v14 与 015 都走 `addColumnIfMissing` / `ensureApprovalSdkColumns`；只要 v14 已记账（无论 name），`repairClaimedV14` 补 `cost_missing` 和审批 SDK 列（含 `sdk_approval_id` + UNIQUE `approvals_sdk_identity`）。两边都幂等，不必重建库。

- Workflow 子 agent：`persistChildRun` 在步骤 `running` checkpoint 之后把 `child_run_id` 写入当前 `run_steps` 行，`getWorkflow` 投影 `childRunId`。`cancelWorkflow` 先看内存 `childRuns`，没有再读库。崩溃发生在 persist running 与 `onChildRun` 之间仍可能漏绑。
- `settings` KV 表曾是 JSON 垃圾场：vault / harness 密钥 / automations / overrides / runtimes / 压缩状态全塞一张表。2026-09 收敛：vault 与 harness 密钥迁到 `secrets_vault` 专表（惰性迁移旧键）；automations / overrides / session.runtimes 读取统一走 Zod 校验（坏条目丢弃）；压缩状态读侧已有 `SessionCompaction.parse`。仍在 settings 里的 JSON 是小对象（preferences 等），可接受。

- AI SDK 7 的 `execute()` 只注入 `toolsContext[name]`，不会把 `runtimeContext` 放进 `options.context`。工具 host 必须在建工具时闭包注入，否则审批通过后会报 `Workspace host is missing`。见 `packages/agent-core/src/tools/index.ts`。
- 不要把 `@ai-sdk/react` 的 `useChat`（HTTP）当桌面主路径。流从 main `webContents.send("agent.event")` 来。
- electron-vite 把 `@enjoy-agents/db` 别名到 `index.ts` 文件时，`@enjoy-agents/db/path-safe` 会变成 `index.ts/path-safe`。主进程别名必须精确匹配包名，子路径单独写（含 `@enjoy-agents/agent-core/compaction`）。路径安全也可从 `@enjoy-agents/db` 主入口导入。渲染进程禁止打 `@enjoy-agents/agent-core` 主入口（会带进 `node:`）。renderer 的 `@enjoy-agents/ipc-contract` 同样必须 `^…$`：字符串前缀会把 `@enjoy-agents/ipc-contract/runtime-capabilities` 拼成 `index.ts/runtime-capabilities`，Vite overlay 红屏。
- 主进程 workspace 包必须进 `externalizeDepsPlugin.exclude` 并别名到 `src/index.ts`。漏掉 `assets` / `knowledge` / `mcp` 时，Electron 会直接加载源码，`from "./hash"` 无后缀会报 `ERR_MODULE_NOT_FOUND`。新包先写进 `electron.vite.config.ts` 的 `MAIN_WORKSPACE_PACKAGES`。
- macos-latest 上 `pnpm build`（electron-vite 打 main）默认堆会 OOM；`pnpm test` 过了才暴露。CI `check` 的 build 步加 `NODE_OPTIONS=--max-old-space-size=8192`，不要为过 CI 砍产物。
- Rules/Skills 的 `read`/`delete`/`reveal` 若只信 `filePath` 字符串，renderer 可指到任意盘符。必须 `assertAllowedRuleFile` / `assertAllowedSkillPackage`，工作区路径还要能对上 `workspaces.root_path`。
- 右栏浏览器用 `<webview>`，窗口必须 `webviewTag: true`。guest 走 `partition persist:enjoy-preview`，禁止 nodeIntegration。main `will-attach-webview` 强制这些偏好、剥掉 guest preload，且只放行 http(s) `src`。只加载 `parseHttpUrl` 通过的 http(s)。Windows 上 webview 是独立 HWND，父级 CSS 圆角可能切不掉。
- 技能来源：renderer 不读 `~/.enjoy-agents/skill-sources/` JSON。git clone / pull 只在 main，且 `shell: false`。部署目的地仅 `customize-roots` 白名单（`globalSkillRoots` ∪ 已登记工作区 `workspaceSkillRoots`）。SSH / `git@` / `clawhub:` 一律 `UNSUPPORTED_SOURCE`，不要半套协议。
- `path-safe` / Customize 白名单单测不能在 Linux 上用 `C:/...`：POSIX 下不是绝对路径，`join`/`resolve` 会拼进 runner cwd。POSIX 用 `/proj/...`，Windows 用盘符。工作区显示名回退最后一段时要同时切 `/` 与 `\`。
- **隐患**：MCP stdio / 自定义 ACP / 供应商 `customHeaders` 曾把明文密钥经 IPC 回 renderer。正确做法：`toPublic` 只回键的占位；编辑态空值保留已存；连接与开流仍只在 main 读明文。MCP spawn 必须剥离 `NODE_OPTIONS` / `ELECTRON_RUN_AS_NODE`。
- **隐患**：在 macOS 终端里 `spawn("npm")` 能跑，Windows Electron 里 `npm.cmd` 无 `shell` 会直接失败；Linux 没有 `/opt/homebrew`。正确做法：PATH 用 `lookupOnPath` / `pathDirs()`（补 linuxbrew、nodejs、Roaming npm、`~/.grok/bin`、`~/.factory/bin`）；安装与探最新版走 `spawnPathCommand`；MCP stdio 同款 Windows `.cmd` / `.bat` 才 `shell: true`；brew 配方在 Windows 降为 copy。
- CLI 用量探测会读本机已登录会话（Cursor `state.vscdb`、Grok `auth.json` 的 `key`）。这些密钥只在 main 内存里用一次打官方 HTTPS，禁止写进 `InspectAgentToolResult` 或 vault。Dashboard / billing 失败就空条 + `—`，不要回落 CLI `about`/`status` 里的猜数字段。
- Agent `bash` 的「沙箱」不是容器。字符串过滤 + cwd jail + macOS Seatbelt。设置文案必须写明，禁止假装 Docker / Vercel Sandbox。
- `window.open` 只对 `http:` / `https:` 走 `shell.openExternal`，一律 `{ action: "deny" }`。
- `flushActiveRuns` 与泵的 `parkForApproval` 都顶层静态 import `persistWaitingRun`。
- SQLite：`PRAGMA busy_timeout = 5000` + `core-indexes` 迁移（sessions/messages/message_parts/runs）。
- **隐患**：`turbo` 的 `typecheck.dependsOn: ["^typecheck"]` 会让 desktop 等 ipc-contract。上游一红，下游 `formatToolName` 未定义这种 renderer 错根本不跑；CI 的 `pnpm typecheck` 接着失败，`pnpm test` 也被跳过。渲染层源文件在 `tsconfig.web.json` 里（只排除 `*.test.ts`），tsc 能抓，但要等它跑到。正确做法：typecheck / test 不要 `^typecheck`；renderer 开 `no-undef`，让 lint（typecheck 之前）先拦未定义标识符。
- 泵 / 审批 / 检查点测试不要用 `sleep` 或「队列空了」当 idle。排队自启用 `DrainableQueue.drain()`；`agent.run` 必带 `commandId`，收据在 `holdAgentRun` 之后、`persistUserTurn` 之前写入。
