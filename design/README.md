# design/ — Spec 目录

本目录是 Enjoy Agents 的**设计契约**。代码可以演进，但变更必须先对照这里，再同步回去。

| 层 | 路径 | 角色 |
|---|---|---|
| **Spec（当前真相）** | `design/specs/*.md` | 按领域拆开的短契约。实现、修 bug、改行为时先读对应 spec。 |
| **Reference（背景）** | `design/references/*` | 长文、选型备忘、视觉全书。过时可以修，但不能单独当实现依据。 |
| **入口** | 仓库根 `AGENTS.md` | Agent 工作手册：读哪份 spec、何时必须改文档。 |
| **设计规约** | 仓库根 `DESIGN.md` | Agent 权威设计系统规约（Token 词表、Bento 布局、8 大命名 Anti-patterns）。 |

---

## Spec 分类

| ID | 文件 | 管什么 | 主要代码 |
|---|---|---|---|
| `product` | [specs/product.md](./specs/product.md) | 产品边界、分期、明确不做 | 仓库级决策 |
| `architecture` | [specs/architecture.md](./specs/architecture.md) | 进程模型、包职责、安全基线 | `apps/desktop/src/main`、`packages/*` |
| `ui` | [specs/ui.md](./specs/ui.md) | 三卡片布局、token、组件来源 | `apps/desktop/.../ai-chat`、`packages/ui` |
| `agent-runtime` | [specs/agent-runtime.md](./specs/agent-runtime.md) | Agent 循环、工具、审批、模式 | `packages/agent-core`、`main/services/agent-runner.ts` |
| `agent-cli` | [specs/agent-cli.md](./specs/agent-cli.md) | 本机 CLI 工具箱、ACP、探测 | `packages/agent-harness/src/agent-tools`、`acp/` |
| `providers` | [specs/providers.md](./specs/providers.md) | 协议工厂、vault、探测 | `packages/providers`、`main/services/secrets.ts` |
| `ipc` | [specs/ipc.md](./specs/ipc.md) | Zod 合约、频道、流事件 | `packages/ipc-contract`、`main/ipc.ts`、`preload` |
| `workspace` | [specs/workspace.md](./specs/workspace.md) | 工作区、文件、Git、终端 | `main/services/workspace.ts`、`terminal.ts` |
| `remote` | [specs/remote.md](./specs/remote.md) | SSH 远程工作区（位置不是引擎） | `main/services/ssh/`、`workspace-host-factory.ts` |
| `window` | [specs/window.md](./specs/window.md) | 无边框窗口、标题栏、窗口 IPC | `main/index.ts`、`components/layout` |
| `brand` | [specs/brand.md](./specs/brand.md) | 应用 logo、任务栏 / 打包图标 | `enjoy-ui-kit`、`AppMark`、`build/icon.*` |
| `settings` | [specs/settings.md](./specs/settings.md) | 设置 / Automations / Customize 路由 | `router.tsx`、`components/settings` |
| `ai-capabilities` | [specs/ai-capabilities.md](./specs/ai-capabilities.md) | AiRuntime、StreamEvent v2、UIMessage | `agent-core/runtime`、`ipc-contract` |
| `knowledge` | [specs/knowledge.md](./specs/knowledge.md) | 来源、索引、本地检索 | `packages/knowledge` |
| `media` | [specs/media.md](./specs/media.md) | 资产库、导出审批、Realtime | `packages/assets` |
| `workflow` | [specs/workflow.md](./specs/workflow.md) | Durable run、checkpoint | `agent-core/agents/workflow` |
| `mcp` | [specs/mcp.md](./specs/mcp.md) | Server、权限、隔离 App | `packages/mcp` |
| `observability` | [specs/observability.md](./specs/observability.md) | 本地指标、脱敏、OTEL | `telemetry-service` |
| `cli-usage` | [specs/cli-usage.md](./specs/cli-usage.md) | 本机 CLI transcript 扫描（12 源）；UI 合同仍以 `m1-usage` + `observability` 为准 | `cli-transcript-usage/`、`observability/components/cli-usage/` |
| `i18n` | [specs/i18n.md](./specs/i18n.md) | 中英界面语言，默认中文 | `renderer/src/i18n`、`packages/ui/i18n` |
| `skills` | [specs/skills.md](./specs/skills.md) | 技能生态、Agent 专属整备舱、Bento 集市与同步投影 | `components/skills`、`main/services/skills-service.ts` |
| `updates` | [specs/updates.md](./specs/updates.md) | 自动更新、发行说明、GitHub Releases | `main/services/app-update.ts`、`components/app-update/` |
| `m1-usage` | [specs/m1-usage-and-capabilities.md](./specs/m1-usage-and-capabilities.md) | 三路命名、Usage L1–L4、能力矩阵、配置边界 | `runtime-capabilities.ts`、`ai-chat/usage/`、`settings/agent-tools/` |
| `m2-attention` | [specs/m2-attention.md](./specs/m2-attention.md) | AttentionStrip、PermissionDock、Inbox 档案 | `stores/attention/`、`ai-chat/attention/`、`inbox/` |
| `m3-handoff` | [specs/m3-engine-handoff.md](./specs/m3-engine-handoff.md) | 换引擎 handoff、空态 checklist | `agent-picker`、`empty-state` |
| `m4-registry` | [specs/m4-acp-registry.md](./specs/m4-acp-registry.md) | ACP Registry、自定义 agent、comingSoon 升级 | `agent-tools`、ACP spawn |
找不到对应 ID 时：先在本表加一行和空 spec，再写代码。不要把新领域塞进无关 spec。

---

## Reference

| 文件 | 内容 |
|---|---|
| [references/visual-system.md](./references/visual-system.md) | 原 `DESIGN.md`：色彩、字体、组件皮肤、Providers 交互全书 |
| [references/tech-stack.md](./references/tech-stack.md) | 原技术栈说明书：选型理由、禁令、分期 |
| [references/vercel-ai-sdk-7-feature-matrix.md](./references/vercel-ai-sdk-7-feature-matrix.md) | AI SDK 7 能力对照 + Enjoy Agents 落地状态 |
| [references/Enjoy Agents：Vercel AI SDK 7 全能力落地计划.md](./references/Enjoy Agents：Vercel AI SDK 7 全能力落地计划.md) | 全能力落地计划 |
| [references/Enjoy Agents：ACP 多引擎宿主开发实现计划.md](./references/Enjoy Agents：ACP 多引擎宿主开发实现计划.md) | ACP 多引擎宿主分期；落地以 specs 为准 |
| [references/gap-audit-vs-github-agents.md](./references/gap-audit-vs-github-agents.md) | 对照 Orca / Cline / OpenHands / Goose / Hermes：假实现、半成品、该重设计的点 |
| [references/oss-agent-landscape-2026.md](./references/oss-agent-landscape-2026.md) | 2026 高星 Agent 星数榜与设计课；Enjoy 该加深的 seam（不是空壳清单） |
| [references/peer-qm-craft-synara-zeron.md](./references/peer-qm-craft-synara-zeron.md) | 对照 QM / Craft / Synara / Zeron：能在现有壳里展示什么（不是抄云/worktree/PR） |
| [references/multica-gap.md](./references/multica-gap.md) | 对照 Multica：抄会话工单节奏，不抄团队看板架构；落地以 specs 为准 |
| [references/cli-bind-ux.md](./references/cli-bind-ux.md) | CLI × 供应商引用的交互逻辑（对照 Cline / OpenCode / CC Switch；落地以 agent-cli 为准） |
| [references/emerging-agent-innovation.md](./references/emerging-agent-innovation.md) | 新兴 Agent 创新清单与 I1–I7 backlog（产品第一稿；落地以 specs 为准） |
| [references/plugin-extensions-hub.md](./references/plugin-extensions-hub.md) | 插件 / 扩展 / 技能 / MCP 仓库方案（产品第一稿；落地以 specs 为准） |
| [references/p0-r-remote.md](./references/p0-r-remote.md) | P0-R 远程第一刀：SSH 远程工作区（本机 UI，远端文件/CLI）；不是云 harness / 沙箱上轨 / worktree |
| [references/dev-plan-p0-h-i-r.md](./references/dev-plan-p0-h-i-r.md) | 执行计划：P0-H 扩展壳 + I2 精选 + I1 换模型 + P0-R SSH；落地以 specs 为准，本文不是当前真相 |
| [previews/explore-execute-p0.html](./previews/explore-execute-p0.html) | P0 探索/执行 + Sources 视觉真源（锁 tip `80faf22`） |
| [previews/cli-a-official-login.html](./previews/cli-a-official-login.html) | CLI-A 仅官方四家登录闭环视觉真源（锁 tip `a0ac8f5`；检测中 / 打开授权中 / 已登录 / 失败人话） |
| [previews/local-cli-dense-p0.html](./previews/local-cli-dense-p0.html) | 本机 CLI 密表唯一视觉真源（锁 tip `8bd7f6e`；预览内容 `add29a4`） |
| [previews/local-cli-dense-v2.html](./previews/local-cli-dense-v2.html) | 过程稿 stub（`8bd7f6e` 起）；勿按此路径接线 |
| [previews/local-cli-power-source.html](./previews/local-cli-power-source.html) | 动力源同构 + 抽屉同壳（历史预览） |
| [previews/p0-add-provider-discover.html](./previews/p0-add-provider-discover.html) | 绑定下拉发现性：菜单只列档案，添加在菜单外（锁 tip `033838f`） |
| [previews/cli-b-registry-install.html](./previews/cli-b-registry-install.html) | CLI-B Registry / 安装未就绪视觉真源（未找到 / 检测中 / 安装中 / 安装失败 / 仅复制 / 已就绪；锁 tip `6c02931`） |
| [previews/p0-b-drawer-trust.html](./previews/p0-b-drawer-trust.html) | 抽屉信任摘要：健康体检 + 本月用量（【视觉真源】P0-B，锁 tip `f48ab0d`） |
| [previews/p0-d-approval-discover.html](./previews/p0-d-approval-discover.html) | 智能体设置审批发现性：本机 CLI / 默认项共享摘要条，跳已有权限卡（【视觉真源】P0-D，锁 tip `1a435e4`） |
| [previews/p0-e-cli-outdated.html](./previews/p0-e-cli-outdated.html) | CLI 过旧/不兼容警告：永不绿灯就绪，次行例外与发送闸（【视觉真源】P0-E，锁 tip `4d33f07`） |
| [previews/p0-f-preview-open.html](./previews/p0-f-preview-open.html) | 完成条「在浏览器打开」（【视觉真源】P0-F，锁 tip `9a1a4ca`；系统浏览器，不嵌 Chromium） |
| [previews/p0-g-sources-detail.html](./previews/p0-g-sources-detail.html) | 气泡底脚芯片 → 右/底 sheet「本轮来源」（【视觉真源】P0-G，锁 tip `76b5ecd`；文件/技能/MCP，无来源无底脚） |
| [previews/p0-h-extensions-hub.html](./previews/p0-h-extensions-hub.html) | 扩展发现壳：设置两列 MCP \| Skills + 添加深链（【视觉真源】P0-H） |
| [previews/p0-r-remote-workspace.html](./previews/p0-r-remote-workspace.html) | SSH 远程工作区：抽屉 / 顶条 /「远程 ≠ 引擎」（【视觉真源】P0-R） |

---

## 文档更新协议

**代码与文档必须同一次改动里对齐。** 触发条件见根目录 `AGENTS.md`「何时必须更新文档」。

每份 spec 保持同一骨架，方便扫：

```markdown
# spec/<id>

> 一句话职责。最后更新：YYYY-MM-DD

## 当前真相
## 不变量
## 代码入口
## 已知坑
```

- **当前真相**：现在代码实际怎么做，不是愿景。
- **不变量**：打破就会出安全 / 架构事故的规则。
- **已知坑**：修 bug 或踩坑后必须补的条目（现象 → 根因 → 正确做法）。
- 愿景、第二期能力写在 `product` 分期或 `references/tech-stack.md`，不要假装已经落地。
