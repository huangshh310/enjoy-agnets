# spec/settings

> 设置是路由，不是弹层。加载器页与设置同构。最后更新：2026-08-31

## 当前真相

TanStack Router + **Hash History**。根布局包 `WindowFrame`。

| Hash | 页面 | `contentWidth` |
|---|---|---|
| `#/` | Agent 工作区 | — |
| `#/studio` | Agent Studio 资产与编排中枢 | —（自建 Bento + 左侧 Agent rail） |
| `#/settings/general` 等 | 设置分段 | `wide`（尤其 Providers） |
| `#/settings/archived` | 已归档的聊天 | `wide` |
| `#/automations` | 自动化列表 | `stage` |
| `#/customize/instructions` | 用户说明；Skills / Rules 后续 | `article` |
| `#/knowledge` | 知识库来源与检索 | `wide` |
| `#/workflows` | Workflow 恢复 | `wide` |
| `#/media` | 资产库 | `wide` |
| `#/mcp` | MCP Server；trusted 可 Open App | `wide` |
| `#/observability` | 本地指标 | `wide` |

设置分段 ID：`general` `appearance` `shortcuts` `providers` `agent` `workspace` `mcp` `git` `capabilities` `knowledge` `media` `workflow` `telemetry` `sandbox` `archived`。仅 `git` 标 `soon`。`#/settings/archived` 按项目分组列出已归档会话，可取消归档或永久删除；全部删除会清掉所有已归档记录。Capabilities 展示 `staticCaps`，probe 成功后叠 `probedCaps`；Media / Voice 控件按有效能力禁用。Explore Presets 含 Fal / Replicate / ElevenLabs / Deepgram / Cohere / AI Gateway。MCP / Knowledge / Media / Telemetry / Workflow 已接线。`knowledgeAutoIndex` 与 `experimentalMedia` 由 main 执法，不是只改设置开关。Sandbox 可改 `maxAgentSteps`（ToolLoop `stepCountIs`）、`agentTimeoutMs`（0 不限）、`stepTimeoutMs`（0 不限，传 SDK `timeout.stepMs`）和 `toolTimeoutMs`（bash）。Agent 页 Harness 可选 Claude Code / Codex / Pi / OpenCode；Pi 不强制 Vercel。

快捷键：`Ctrl+,` / `Cmd+,` → General；在 settings / automations / customize 上按 Escape → `#/`。

Providers 页是协议工厂（见 `providers` spec + visual-system §14）：顶部分段 Configured / Explore Presets，编辑走 Dialog 四页签（Connection / Models / Parameters / Overrides），不是页脚堆表单。

Automations 存 `settings` 表的 `automations` JSON。触发：`manual` / `on_save`。

## 不变量

- 侧栏条目必须 `navigate`，禁止 no-op。
- Providers 禁用 `article`（760px），目录三列会被裁。
- 设置行：标题 + 说明 + 右侧控件，放在内层 bordered card。
- 不要把 Codex `auth.json` / 原始 `config.toml` 编辑器当本页模型。

## 代码入口

- 路由：`apps/desktop/src/renderer/src/router.tsx`
- 分段目录：`apps/desktop/src/renderer/src/components/settings/settings-catalog.ts`
- 壳：`settings-shell.tsx`、`secondary-page-shell.tsx`
- AI 段：`settings-ai-pages.tsx`；Sandbox：`sandbox-settings.tsx`；偏好补丁：`settings-pref.ts`
- 视觉细节：[../references/visual-system.md](../references/visual-system.md) §6 / §14

## 已知坑

- Customize 的 Skills / Rules 还是后续加载器（`.agents/skills`、项目规则）。页面可以先占位，文案不要写成已经扫描技能包。
- `git` 仍是 soon。`mcp` 已落地，不要再写成占位。
