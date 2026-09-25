# Enjoy Agents — Agent 工作手册

本地优先的 Agent IDE（Electron + React 19 + BoardUI tokens + Vercel AI SDK 7）。

**本文件是入口，不是百科。** 领域契约在 `design/specs/`。长文在 `design/references/`。先对上 spec 再改代码；改完若行为或认知变了，必须回写文档。

完整目录与分类：[`design/README.md`](./design/README.md)。

---

## 1. 每次任务怎么走

1. 用下表锁定 **一个 spec ID**，只打开正在改的那份。跨领域再开第二份。不要每次任务把整张地图读完，也不要在修 typo 前先读 `product` / `visual-system`。
2. 只读任务：按 spec 的「代码入口」跳进仓库，结论以代码为准；若代码与 spec 打架，先记到「已知坑」。
3. 实现 / 修 bug：改代码的**同一次改动**里更新 spec（至少「当前真相」或「已知坑」）。新隐患用 **隐患** 标记；已不存在的行为从「当前真相」删掉，不要叠一层「曾经」。
4. 结束前自问：有没有新坑、新频道、新路由没写进文档？过时句子删了没有？
5. 实现会碰路径、spawn、安装、快捷键、文件监视时，必须同时想 **Windows / macOS / Linux**（见 `architecture` 不变量）。禁止按本机一种系统写死。

不要把 `design/references/*` 当成实现说明书。那是选型与视觉全书；落地与否以 spec 的「当前真相」为准。

---

## 2. Spec 地图

| 你在做… | 先读 |
|---|---|
| 产品范围、分期、能不能做云 | [`design/specs/product.md`](./design/specs/product.md) |
| 进程边界、包职责、SQLite、安全 | [`design/specs/architecture.md`](./design/specs/architecture.md) |
| 布局、token、组件从哪装 | [`design/specs/ui.md`](./design/specs/ui.md) → 细节 [`design/references/visual-system.md`](./design/references/visual-system.md) |
| Agent 循环、工具、审批、流式 | [`design/specs/agent-runtime.md`](./design/specs/agent-runtime.md) |
| Enjoy Local 操作本机其它应用 | [`design/specs/computer-use.md`](./design/specs/computer-use.md) → Codex 对照 [`design/references/computer-use-codex-parity.md`](./design/references/computer-use-codex-parity.md) |
| 本机 CLI（Cursor / Claude / Codex / Antigravity ACP） | [`design/specs/agent-cli.md`](./design/specs/agent-cli.md) |
| ACP 协议、思考档、Registry 国产 CLI | [`design/specs/agent-cli.md`](./design/specs/agent-cli.md) → 协议摘录 [`design/references/acp-protocol.md`](./design/references/acp-protocol.md) |
| 供应商、协议、Key、探测 | [`design/specs/providers.md`](./design/specs/providers.md) |
| 加 / 改 IPC 频道或事件 | [`design/specs/ipc.md`](./design/specs/ipc.md) |
| 工作区、文件、Git、终端 | [`design/specs/workspace.md`](./design/specs/workspace.md) |
| SSH 远程工作区 | [`design/specs/remote.md`](./design/specs/remote.md) |
| 无边框窗口、标题栏、最小化 | [`design/specs/window.md`](./design/specs/window.md) |
| 应用 logo、任务栏 / 打包图标 | [`design/specs/brand.md`](./design/specs/brand.md) |
| 设置 / Automations / Customize / Shift+Tab 审批循环 | [`design/specs/settings.md`](./design/specs/settings.md) |
| 技能页 / 技能源 / 集市 | [`design/specs/skills.md`](./design/specs/skills.md) |
| Usage L1–L4 / 能力矩阵 / 三路命名 | [`design/specs/m1-usage-and-capabilities.md`](./design/specs/m1-usage-and-capabilities.md) |
| 跨会话 Attention / 审批停靠 / Inbox 档案 | [`design/specs/m2-attention.md`](./design/specs/m2-attention.md) |
| 换引擎 handoff（M2 之后；同引擎换模见 I1，不是 handoff） | [`design/specs/m3-engine-handoff.md`](./design/specs/m3-engine-handoff.md) |
| ACP Registry（M3 之后） | [`design/specs/m4-acp-registry.md`](./design/specs/m4-acp-registry.md) |
| 自动更新、GitHub Release | [`design/specs/updates.md`](./design/specs/updates.md) |
| AI Runtime / StreamEvent v2 | [`design/specs/ai-capabilities.md`](./design/specs/ai-capabilities.md) |
| Knowledge / RAG | [`design/specs/knowledge.md`](./design/specs/knowledge.md) |
| 资产库 / 媒体 | [`design/specs/media.md`](./design/specs/media.md) |
| Workflow / 子 Agent | [`design/specs/workflow.md`](./design/specs/workflow.md) |
| MCP | [`design/specs/mcp.md`](./design/specs/mcp.md) |
| Telemetry / 本机记录 UI | [`design/specs/observability.md`](./design/specs/observability.md) |
| 本机 CLI transcript 扫描实现 | [`design/specs/cli-usage.md`](./design/specs/cli-usage.md)（UI 仍以 observability 为准） |
| 界面中英文、默认中文 | [`design/specs/i18n.md`](./design/specs/i18n.md) |
| AI SDK 7 有没有某能力 | [`design/references/vercel-ai-sdk-7-feature-matrix.md`](./design/references/vercel-ai-sdk-7-feature-matrix.md) |
| 为什么选这套栈 | [`design/references/tech-stack.md`](./design/references/tech-stack.md) |

新领域：先在 `design/README.md` 表里加一行 + 新建 `design/specs/<id>.md`（沿用「当前真相 / 不变量 / 代码入口 / 已知坑」），再写代码。

---

## 3. 何时必须更新文档

下列任一发生，**不允许只改代码**：

| 触发 | 写哪里 |
|---|---|
| 修 bug / 排障，根因以后还会再踩 | 对应 spec 的 **已知坑**（现象 → 根因 → 正确做法） |
| 用户可见行为变了（布局、路由、审批、空态） | **当前真相**；必要时改 `ui` / `settings` / `window` |
| 新增或改名 IPC、StreamEvent、preload API | `ipc` spec + `packages/ipc-contract` |
| 新工具、新审批、新 Agent 模式 | `agent-runtime` |
| 新供应商协议或 Key 行为 | `providers` |
| 发现 spec 与代码不一致 | 先确认哪边对，再改错的那边；两边都过时就一起改 |
| 规划写进了文档但其实没做 | 把「当前真相」改回现状，愿景留在 `product` 分期 |
| 新增包、新进程、新安全假设 | `architecture` |

更新时改 spec 顶部的 `最后更新` 日期。不要在根目录再堆长文；长文只进 `design/references/`。

---

## 4. 工程红线（打破先停）

- 渲染进程：**不**调模型、**不**读明文 API Key、**不**直接 `fs` / `child_process` / `ipcRenderer`。
- Agent 循环只在 main；UI 只订阅 `agent.event`。
- IPC 入参 Zod parse，失败即拒。新频道顺序：contract → main → preload → renderer。
- `write_file` / `edit_file` / `bash` / `git_commit` 默认审批，执行只在 main。
- 路由用 Hash History。设置是路由不是 modal。
- UI：BoardUI 语义 token + 复合字号；控件先 shadcn / AI Elements 再 restyle。品牌标用 Lobe Icons。
- 密钥进 `safeStorage`，不进 Git，不进 renderer。
- 桌面是三端：路径分隔、PATH、spawn、安装配方、快捷键（⌘ vs Ctrl）、文件监视都要过 Win / macOS / Linux。一种系统上的 Homebrew / `npm` 裸 spawn 不能当成全平台。

细节与禁令清单：`architecture`、`product`、`ui`。

---

## 5. 仓库怎么走

```text
apps/desktop/          Electron：main / preload / renderer
packages/agent-core    工具、审批、提示、diff（无 React）
packages/providers     协议工厂
packages/ipc-contract  Zod 合约
packages/ui            tokens + shadcn + AI Elements
packages/db            node:sqlite 表
packages/agent-harness 外部 Agent 插件位（非默认内核）
design/specs           当前契约
design/references      背景长文
```

常用命令（仓库根）：

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
```

发版（契约 `design/specs/updates.md`；version 来自 `apps/desktop/package.json`，失败不涨号）：

```bash
./scripts/release-tag.sh          # 首次推当前 version 的 v* tag
./scripts/release-tag.sh --retry  # CI 失败：同一 tag 移到 HEAD 再推
```

UI 安装控件（在 `packages/ui` 或 `apps/desktop`）：

```bash
pnpm dlx shadcn@latest add <name>
pnpm dlx shadcn@latest add @ai-elements/<name>
```

装完必须按 `ui` spec restyle，禁止原样上架默认皮。

---

## 6. 分层与文件（本仓约定）

- 单文件尽量 < 300 行，函数 < 50 行；接近 250 行或身兼多职先拆再改。
- 类型与常量不要堆在组件里：`*.types.ts`、`constants.ts`。
- 通用纯函数进 `lib/` / `utils/`；可复用 UI 状态进 `hooks/`。
- 标识符、命令、日志保持英文；注释与文档用简体中文。
- 注释写在：文件顶（职责）、关键函数、不直观边界、已知坑对应的代码处。

---

## 7. 文档自检（宣称完成前）

- [ ] 打开过本次涉及的 spec
- [ ] 代码与「当前真相」一致
- [ ] 新坑写进了「已知坑」
- [ ] 若加了 IPC / 路由 / 工具 / 供应商，对应 spec 与 contract 已改
- [ ] 没有把未实现功能写成已经落地
- [ ] 若碰路径 / spawn / 安装 / 快捷键 / 监视：Win、macOS、Linux 都想过，spec 写了平台差异
