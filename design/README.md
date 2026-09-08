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
| `window` | [specs/window.md](./specs/window.md) | 无边框窗口、标题栏、窗口 IPC | `main/index.ts`、`components/layout` |
| `brand` | [specs/brand.md](./specs/brand.md) | 应用 logo、任务栏 / 打包图标 | `enjoy-ui-kit`、`AppMark`、`build/icon.*` |
| `settings` | [specs/settings.md](./specs/settings.md) | 设置 / Automations / Customize 路由 | `router.tsx`、`components/settings` |
| `ai-capabilities` | [specs/ai-capabilities.md](./specs/ai-capabilities.md) | AiRuntime、StreamEvent v2、UIMessage | `agent-core/runtime`、`ipc-contract` |
| `knowledge` | [specs/knowledge.md](./specs/knowledge.md) | 来源、索引、本地检索 | `packages/knowledge` |
| `media` | [specs/media.md](./specs/media.md) | 资产库、导出审批、Realtime | `packages/assets` |
| `workflow` | [specs/workflow.md](./specs/workflow.md) | Durable run、checkpoint | `agent-core/agents/workflow` |
| `mcp` | [specs/mcp.md](./specs/mcp.md) | Server、权限、隔离 App | `packages/mcp` |
| `observability` | [specs/observability.md](./specs/observability.md) | 本地指标、脱敏、OTEL | `telemetry-service` |
| `i18n` | [specs/i18n.md](./specs/i18n.md) | 中英界面语言，默认中文 | `renderer/src/i18n`、`packages/ui/i18n` |
| `skills` | [specs/skills.md](./specs/skills.md) | 技能生态、Agent 专属整备舱、Bento 集市与同步投影 | `components/skills`、`main/services/skills-service.ts` |
| `updates` | [specs/updates.md](./specs/updates.md) | 自动更新、发行说明、GitHub Releases | `main/services/app-update.ts`、`components/app-update/` |
| `m1-usage` | [specs/m1-usage-and-capabilities.md](./specs/m1-usage-and-capabilities.md) | 三路命名、Usage L1–L4、能力矩阵、配置边界 | `runtime-capabilities.ts`、`ai-chat/usage/`、`settings/agent-tools/` |
| `m2-attention` | [specs/m2-attention.md](./specs/m2-attention.md) | AttentionStrip、PermissionDock、Inbox 跳转 | `ai-chat` 审批/Inbox |
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
