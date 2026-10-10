# spec/mcp

> MCP Server、分级审批、隔离 App 与本地预设。最后更新：2026-10-10（超大 srcDoc 中性提示，不带字数）

## 当前真相

包：`packages/mcp`。stdio / SSE / HTTP 配置入库 `mcp_servers`。本机会话句柄走 `createMcpHandleRegistry`。新 Server 默认 `trusted=false`。写操作即使 allow 也再 ask。`sanitizeAppMessage` 限制 JSON-RPC 方法与资源 URI 白名单。CSP 常量 `MCP_APP_CSP`（`connect-src 'none'`；srcDoc 允许 `script-src 'unsafe-inline'`）。

`createMCPClient` 只在 main；`ai@7.0.84` 无该导出时 stdio / HTTP 走本机 JSON-RPC 会话：initialize 后 `tools/list`，`tools/call` 走 `mcp.call`。stdio `command` 必须是白名单裸二进制（`npx` / `npm` / `pnpm` / `yarn` / `bun` / `node` / `uvx` / `uv` / `python` / `python3`），禁止路径和 shell 元字符。stdio spawn 剥离 `NODE_OPTIONS` / `ELECTRON_RUN_AS_NODE`（含 UI `envRef` 覆盖），`cwd` 锁家目录，Windows 上 `.cmd` / `.bat` 才 `shell: true`。写类工具名与 **命令类叶子名**（`bash` / `shell` / `run_command` / `terminal` 等精确匹配，不含 `list_commands`）即使 allow 也再 ask；`mcp.call` 对 `ask` 直接拒，必须经 Agent ToolLoop 的 `user-approval` + `decideApproval` 后再执行（`fromApprovedAgent` 只给写/命令类 execute）。探索态不注册这些 MCP 工具；主 ToolLoop `toolApproval` 接 `isExploreMutatingDeny`。已连接且 `trusted`（或写在 `modelVisibleTools`）的工具注入 ToolLoopAgent，名为 `mcp_<serverId>__<tool>`。`tools/list` 的 `inputSchema` 经 `jsonSchemaToZod` 交给模型（object / array / enum / anyOf / oneOf）；`$ref` 与无法识别的结构回落 `z.unknown()`，没有 schema 才回落 `z.record(unknown)`。`openApp` 的 `allowedResourceUris` 只信库内配置，不把调用方 `resourceUri` 塞进白名单。

设置 `#/settings/extensions` 是 P0-H 发现壳：两列 MCP \| Skills，已配置数 +「添加」深链 `#/mcp` / `#/skills`，H 列只列本机 SoT 名。I2 同页精选「添加到 MCP」走现有 `mcp.upsert`（`trusted: true`，已有同行则带 `id` 更新），不新开存储、不弹第二套表单。catalog 失败只空精选区 + 重试。视觉锁 [`../previews/i2-extensions-curated.html`](../previews/i2-extensions-curated.html)。P0-S 开流注入诚实态已落地：Composer `HostInjectBar` 一行芯片 + `host.inject` 快照（`HostInjectSnapshot`），不是第二发现壳。视觉真源 [`../previews/p0-s-skills-mcp-inject.html`](../previews/p0-s-skills-mcp-inject.html)，产品锁 [`../references/p0-s-skills-mcp-inject.md`](../references/p0-s-skills-mcp-inject.md)。已启用 = 信任且服务器级未 deny；能力 `hostMcp=none` 时 `injected=[]` 并标 `unsupported`。Enjoy Local 未 Connect 的信任行记 `not-connected`，禁止空绿「已同步到助手」。

路由 `#/mcp` 在 `AppShell` 内换轨（情境栏=已配置服务/JSON 规格配置两栏，Stage=对应视图），不要弹出「返回应用」页。Stage 用 `contentWidth="fill"` + `hideChrome`：只保留 `McpHeader`，不要再叠 `SecondaryPageChrome`。顶栏固定，已配置服务空态可链回 `#/settings/extensions` 或就地注册自定义服务；JSON 编辑区铺满剩余高度。`#/mcp` 是协议运行时控制台（状态、连通性测试、工具 Allow/Ask/Deny、沙箱 App、JSON 配置）。对齐原型 Slide 10 与 13 ⑧（Trust 印章与声明）。卡片印章走 i18n（已信任 / 未信任），不要写死英文 TRUSTED。信任操作提供完整声明确认卡；顶部展示服务统计。支持 Ping 连通性测试、工具探索与细粒度权限控制 (Allow/Ask/Deny)、环境变量管理与沙箱 UI App 实时交互。服务注册编辑、工具探索权限与沙箱 App 均统一使用右侧内缩悬浮抽屉（`inset-y-3 right-3 rounded-3xl shadow-card`），与 Skills 抽屉规范一致，禁止使用居中阻断弹框。仅 **trusted** Server 可 `mcp.openApp`。能从允许的 resource URI 读到 HTML 才返回 `srcDoc`；否则 `available=false`、`srcDoc=null`，UI 写明没有 App。`ENJOY_E2E_STUB` 才返回 demo HTML。iframe `sandbox="allow-scripts"`、无 `allow-same-origin`。`postMessage` 必须 `event.source === iframe.contentWindow`，再经 `mcp.appMessage` 在 main 消毒；`ui/log` 回显，`resources/read` 仅在已连接且 URI 白名单内走本机会话，`tools/result` 只展示已批准结果，**不会**从 iframe 自动执行写工具。发 `mcp.app` 事件。Composer `@` 发现面板可列出已连 MCP（`kind: "mcp"`），选中只钉 `@mcp:名` 文本到输入框，**不是**授权、也不是 `mcp.call`。

ACP 开流（`hostMcp=acp-passthrough`）把 **已信任且服务器级未 deny** 的 `#/mcp` 行映射进 `session/new.mcpServers`。stdio 在 main 把白名单裸 bin 解析成绝对路径；SSH 工作区用远端 `command -v` 换成远端 abs，找不到就跳过，**禁止**把本机 `/opt/homebrew/bin/npx` 塞给远端 CLI。HTTP/SSE 仅当握手广告了 `mcpCapabilities`。Enjoy Local 仍走 ToolLoop `createMcpAgentTools`，不要给同一会话再把 MCP 工具注入 ToolLoop。增删 MCP / 改信任会 `disposeAllAcpSessions`，下一轮重 `session/new`。MCP Apps iframe：`#/mcp` 打开时若未 Connect 会先建本机会话；ACP 工具结果里的 HTML / `ui://` 资源映射为 `mcp.app`，在助手气泡内嵌同一隔离 iframe。`srcDoc` 超过 200000 时映射层发 `mcp.app phase:error`（不带 srcDoc）+ `generation.warning(mcp_app_srcdoc_too_large)`；助手轮工具行只留中性提示「这个应用界面太大，没法在这里打开。」，禁止字数、禁止 iframe。开发态 stub 发送 `huge mcp app` / `超大 MCP 应用`（`isE2eStub` 且未打包）可复现。Pi 静态 `hostMcp=none`，不假装透传。

## 不变量

- renderer 无 Node、无任意远程脚本读盘。
- 未信任 Server 的工具默认 deny。
- ACP 透传不得把相对 `npx` 原样塞进 `session/new`；本机解析失败或 SSH `command -v` 失败则跳过该行。

## 代码入口

- `packages/mcp`
- `apps/desktop/src/main/services/mcp-service.ts`
- `apps/desktop/src/main/services/host-extensions/`（ACP `session/new` 投影、SSH 远端 which、Grok plugin-dir、`assembleHostInject` / `reportHostMcp` / `reportLocalHostMcp`）
- 注入快照合约：`packages/ipc-contract/src/host-inject.ts`；开流事件 `host.inject`
- `apps/desktop/src/main/services/mcp-app.ts`
- 扩展精选写入：`apps/desktop/src/renderer/src/components/settings/extensions/curated/add-curated-to-sot.ts`（只 `mcp.upsert`，trusted）
- `apps/desktop/src/renderer/src/components/mcp/mcp-page.tsx`（组装层）
- `apps/desktop/src/renderer/src/components/mcp/hooks/use-mcp-page.ts`
- `apps/desktop/src/renderer/src/components/mcp/lib/mcp-json-config.ts`
- `apps/desktop/src/renderer/src/components/mcp/mcp-app-frame.tsx`

- `envRef`（`{KEY: value}` JSON 串）连接时解析并与主进程 env 合并注入 stdio spawn（曾只落库不生效）；坏 JSON 回空 env 不阻断连接。`list` / `toPublic` 只回键的占位 JSON，不回明文；upsert 时空值保留已存密钥。

## 已知坑

- **隐患**：`@` 提到 MCP 就以为已授权调用。根因：mention 只是发现层。正确做法：Local 执行仍走 ToolLoop + `decideMcpCall`；ACP 只透传已信任行，审批走 `session/request_permission`。未信任默认不注入、不透传。
- **隐患**：把「已配置」或空名单画成「已同步到助手」。根因：P0-H 发现壳数字 ≠ 本轮注入。正确做法：Composer 只画已启用 / 已注入本轮；能力 none 或 0 注入走警告或藏条，禁止空绿成功。
- **隐患**：I2 添加到 MCP 后以为本轮已注入。根因：upsert 只写入 SoT 且 `trusted=true`，不自动 Connect。正确做法：写后文案「已写入 Enjoy · 下一轮可注入」；Enjoy Local 未 Connect 仍是 `not-connected`。
- **隐患**：Stop 若 `disposeAcpSession` 会丢掉 CLI 上下文，下一轮只有最后一句用户句。正确做法：Stop 只 `session/cancel`。
- **隐患**：SSH 把本机 stdio abs 传给远端 CLI，npx 路径在远端不存在。正确做法：`lookupRemoteStdioBin` + `command -v`。
- **隐患**：ACP 会话里点 Open App 因未 Connect 读不到 HTML。正确做法：`openMcpApp` 先 `connectServerIfNeeded`。ACP 内联 HTML 走 `mcp.app.srcDoc`，不要再 spawn 第二份工具会话进 ToolLoop。
- **隐患**：`srcDoc` 超上限后用户什么都看不见。根因：`turn-mcp-apps` 对 `phase:error` 早退，renderer 也不折 `generation.warning(mcp_app_srcdoc_too_large)`。正确做法：空占位 + 警告标 `tooLarge`，工具行只留中性提示，不带字数、不挂 iframe。
- Stage `fill` 子层是 `overflow-hidden`。已配置列表、市场网格、JSON 正文必须自带 `min-h-0 overflow-y-auto`；JSON 行号与 textarea 同一滚动容器，不要各滚各的。
- 本仓锁定的 `ai@7.0.84` 没有 `createMCPClient` 导出。连接时先动态探测该符号；没有则 stdio 走换行分帧 JSON-RPC 会话（标准 MCP stdio 为 ndjson，兼容 LSP Content-Length），SSE/HTTP 走 `rpcPost`（带 `mcp-session-id`）。`tools/list` 失败仍可标 connected，工具列表为空，不假装已发现工具。
- **stdio 协议分帧与进程退出**：标准 MCP 使用换行符 `\n` 分帧（ndjson），若按 LSP `Content-Length:` 发送，主流基于官方 SDK 的 MCP 服务（如 stitch-mcp）不会返回有效响应；解析端需支持 ndjson 并自动跳过 stdout 非 JSON 诊断日志行。子进程异常退出（如缺少环境变量、Key 报错）必须由 `stderr` 收集与 `exit/close` 事件捕获，立即 reject 并抛出真实根因，不得死等 timeout。握手超时由 8s 宽限至 25s 适应 cold npx 与远程 API 代理。
- 未信任 Server 默认不把工具注入 Agent；先 Trust 或填写 `modelVisibleTools`。
- renderer 只能从 `@enjoy-agents/mcp/app-host` 取 CSP。从包主入口导入会把 `node:child_process` 打进渲染进程，Vite 直接失败。
- srcDoc iframe 的 `'self'` 对不上任何脚本文件；demo 按钮依赖 `script-src 'unsafe-inline'`。安全边界靠 sandbox + `connect-src 'none'` + main 消毒，不要再开 `allow-same-origin`。
- 未信任 Server 调用 `mcp.openApp` 直接拒。E2E 必须先 Trust 再 Open App。
- `jsonSchemaToZod` 不展开 `$ref`。复杂 MCP schema 宁可 `z.unknown()`，不要假装已经校验。
- **隐患**：MCP 叶子名是 `bash` / `shell` / `run_command` 时旧启发式不含 write 子串，`resolveToolApproval` 给 `not-applicable`，`createMcpAgentTools` 还带 `fromApprovedAgent: true`，ToolLoop 不弹卡就执行。正确做法：命令类叶子名精确匹配走 `user-approval`；探索态 deny 且不注册；`fromApprovedAgent` 只给写/命令类 execute。
- **隐患**：stdio spawn `{...process.env, ...envRef}` 把 `NODE_OPTIONS` 带进 `node`/`npx` 子进程。正确做法：与 ACP 一样剥离 `NODE_OPTIONS` / `ELECTRON_RUN_AS_NODE`；`cwd` 用家目录，禁止默认 `process.cwd()`。
- stdio 命令在 `spawn` 前走 `parseStdioCommand`。不要把 `powershell` / `cmd` / 绝对路径放进白名单。
- **官方 MCP 矢量图标与 Node ESM 测试兼容**：主界面活动轨道（Activity Rail）、情境侧栏导航、页面状态胶囊、空态插图、快速检索命令面板与 Inspector 工具策略均统一采用官方 Model Context Protocol 矢量标志（`McpIcon`），替代通用电插头图标（`RiPlugLine`）。预设大集市包含 Docker、PostgreSQL、SQLite、MySQL、Redis、GitLab、Slack、Linear、Sentry、Puppeteer、Playwright、Git、GitHub、Brave、Notion、MCP 等 20 款官方图标。Node.js 22 内置 `--experimental-strip-types` 跑单元测试时不支持 `.tsx` 文件与带相对路径的无扩展名引入，且三方依赖若含内部无扩展名导入（如 `@lobehub/icons` 的 barrel 导出）会导致 `ERR_UNSUPPORTED_DIR_IMPORT`。因此被单元测试直接或间接引入的组件（如 `mcp-brand-icons.ts`）必须为纯 `.ts` 且使用 `React.createElement` 实现，矢量 paths 需内联且带明确 `.ts` 文件扩展名。

