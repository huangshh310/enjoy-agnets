# spec/mcp

> MCP Server、分级审批、隔离 App 与本地预设。最后更新：2026-09-10

## 当前真相

包：`packages/mcp`。stdio / SSE / HTTP 配置入库 `mcp_servers`。本机会话句柄走 `createMcpHandleRegistry`。新 Server 默认 `trusted=false`。写操作即使 allow 也再 ask。`sanitizeAppMessage` 限制 JSON-RPC 方法与资源 URI 白名单。CSP 常量 `MCP_APP_CSP`（`connect-src 'none'`；srcDoc 允许 `script-src 'unsafe-inline'`）。

`createMCPClient` 只在 main；`ai@7.0.84` 无该导出时 stdio / HTTP 走本机 JSON-RPC 会话：initialize 后 `tools/list`，`tools/call` 走 `mcp.call`。stdio `command` 必须是白名单裸二进制（`npx` / `npm` / `pnpm` / `yarn` / `bun` / `node` / `uvx` / `uv` / `python` / `python3`），禁止路径和 shell 元字符。写类工具名即使 allow 也再 ask；`mcp.call` 对 `ask` 直接拒，必须经 Agent ToolLoop 的 `user-approval` + `decideApproval` 后再执行（`fromApprovedAgent`）。已连接且 `trusted`（或写在 `modelVisibleTools`）的工具注入 ToolLoopAgent，名为 `mcp_<serverId>__<tool>`。`tools/list` 的 `inputSchema` 经 `jsonSchemaToZod` 交给模型（object / array / enum / anyOf / oneOf）；`$ref` 与无法识别的结构回落 `z.unknown()`，没有 schema 才回落 `z.record(unknown)`。`openApp` 的 `allowedResourceUris` 只信库内配置，不把调用方 `resourceUri` 塞进白名单。

路由 `#/mcp` 在 `AppShell` 内换轨（情境栏=已配置/市场/JSON，Stage=对应视图），不要弹出「返回应用」页。Stage 用 `contentWidth="fill"` + `hideChrome`：只保留 `McpHeader`，不要再叠 `SecondaryPageChrome`。顶栏固定，已配置空态 / 市场列表 / JSON 编辑区铺满剩余高度，不要按内容收高度底下留白。对齐原型 Slide 10 与 13 ⑧（Trust 印章与声明）。包含已配置服务 (Configured Servers)、**本地预设**（内置模板，不是远程目录）与 JSON 规格批量导入导出。卡片印章走 i18n（已信任 / 未信任），不要写死英文 TRUSTED。信任操作提供完整声明确认卡；顶部展示服务统计。支持 Ping 连通性测试、工具探索与细粒度权限控制 (Allow/Ask/Deny)、环境变量管理与沙箱 UI App 实时交互。仅 **trusted** Server 可 `mcp.openApp`。能从允许的 resource URI 读到 HTML 才返回 `srcDoc`；否则 `available=false`、`srcDoc=null`，UI 写明没有 App。`ENJOY_E2E_STUB` 才返回 demo HTML。iframe `sandbox="allow-scripts"`、无 `allow-same-origin`。`postMessage` 必须 `event.source === iframe.contentWindow`，再经 `mcp.appMessage` 在 main 消毒；`ui/log` 回显，`resources/read` 仅在已连接且 URI 白名单内走本机会话，`tools/result` 只展示已批准结果，**不会**从 iframe 自动执行写工具。发 `mcp.app` 事件。
## 不变量

- renderer 无 Node、无任意远程脚本读盘。
- 未信任 Server 的工具默认 deny。

## 代码入口

- `packages/mcp`
- `apps/desktop/src/main/services/mcp-service.ts`
- `apps/desktop/src/main/services/mcp-app.ts`
- `apps/desktop/src/renderer/src/components/mcp/mcp-page.tsx`（组装层）
- `apps/desktop/src/renderer/src/components/mcp/hooks/use-mcp-page.ts`
- `apps/desktop/src/renderer/src/components/mcp/lib/mcp-json-config.ts`
- `apps/desktop/src/renderer/src/components/mcp/mcp-app-frame.tsx`

## 已知坑

- Stage `fill` 子层是 `overflow-hidden`。已配置列表、市场网格、JSON 正文必须自带 `min-h-0 overflow-y-auto`；JSON 行号与 textarea 同一滚动容器，不要各滚各的。
- 本仓锁定的 `ai@7.0.84` 没有 `createMCPClient` 导出。连接时先动态探测该符号；没有则 stdio 走 Content-Length JSON-RPC 会话，SSE/HTTP 走 `rpcPost`（带 `mcp-session-id`）。`tools/list` 失败仍可标 connected，工具列表为空，不假装已发现工具。
- 未信任 Server 默认不把工具注入 Agent；先 Trust 或填写 `modelVisibleTools`。
- renderer 只能从 `@enjoy-agents/mcp/app-host` 取 CSP。从包主入口导入会把 `node:child_process` 打进渲染进程，Vite 直接失败。
- srcDoc iframe 的 `'self'` 对不上任何脚本文件；demo 按钮依赖 `script-src 'unsafe-inline'`。安全边界靠 sandbox + `connect-src 'none'` + main 消毒，不要再开 `allow-same-origin`。
- 未信任 Server 调用 `mcp.openApp` 直接拒。E2E 必须先 Trust 再 Open App。
- `jsonSchemaToZod` 不展开 `$ref`。复杂 MCP schema 宁可 `z.unknown()`，不要假装已经校验。
- `decideMcpCall === "ask"` 时 `callServerTool` 不得执行。renderer `mcp.call` 会抛 `requires Agent approval`；只有 ToolLoop `execute` 可带 `fromApprovedAgent`。
- stdio 命令在 `spawn` 前走 `parseStdioCommand`。不要把 `powershell` / `cmd` / 绝对路径放进白名单。
