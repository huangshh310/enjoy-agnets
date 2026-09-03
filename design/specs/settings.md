# spec/settings

> 设置是路由，不是弹层。加载器页与设置同构。最后更新：2026-09-03

## 当前真相

TanStack Router + **Hash History**。根布局包 `WindowFrame`。

| Hash | 页面 | `contentWidth` |
|---|---|---|
| `#/` | Agent 工作区 | — |
| `#/studio` | Agent Studio 资产与编排中枢 | —（自建 Bento + 左侧 Agent rail） |
| `#/settings/general` 等 | 设置分段 | `wide`（尤其 Providers） |
| `#/settings/archived` | 已归档的聊天 | `wide` |
| `#/automations` | 自动化列表 | `stage` |
| `#/customize/instructions` | 用户说明、Skills 技能扩展中心、Rules 规则规范模版库 | `wide` |
| `#/knowledge` | 知识库来源与检索 | `wide` |
| `#/workflows` | Workflow 恢复 | `wide` |
| `#/media` | 资产库 | `wide` |
| `#/mcp` | MCP Server；trusted 可 Open App | `wide` |
| `#/observability` | 本地指标 | `wide` |
| `#/team/profile` 等 | 团队中心（资料、算力配额、成员管理与权限分配） | `wide` |
| `#/workspaces` | 文件夹与工作区管理（已挂载项目、路径、分支、快速切换） | `wide` |
| `#/inbox` | 收件箱：`fill` 左右分栏（时间线 + 阅读器），预置 8 项通知流、未读徽标、清理与跳转。禁止营销 Hero、堆叠描边卡片、嵌套圆角列表 | `fill` |
| `#/company/billing` 等 | 企业中心（账单套餐、发票、合规协议、外部协同工具集成） | `wide` |
| `#/account/profile` 等 | 个人中心（账号安全状态、在线工作站节点、通知推送偏好） | `wide` |

设置分段 ID：`general` `appearance` `shortcuts` `providers` `agent` `workspace` `mcp` `git` `capabilities` `knowledge` `media` `workflow` `telemetry` `sandbox` `archived`。
底栏用户卡片展开菜单完整映射至：`#/team` (profile/members)、`#/workspaces`、`#/inbox`、`#/company` (billing/details/integrations)、`#/account` (profile/notifications) 及应用内 `ConfirmDialog` 退出登录安全确认，杜绝任何 no-op 或偷懒重定向。

快捷键：`Ctrl+,` / `Cmd+,` → General；在 settings / automations / customize 上按 Escape → `#/`。

Providers 页是协议工厂（见 `providers` spec + visual-system §14）：顶部分段 Configured / Explore Presets，编辑走 Dialog 四页签（Connection / Models / Parameters / Overrides），不是页脚堆表单。

Automations 存 `settings` 表的 `automations` JSON。触发：`manual` / `on_save`。界面语言默认 `zh`，见 [i18n](./i18n.md)。

## 不变量

- 侧栏条目必须 `navigate`，禁止 no-op。
- Providers 禁用 `article`（760px），目录三列会被裁。
- 设置行：标题 + 说明 + 右侧控件，放在内层 bordered card。偏好页先 `SettingsHub` 再卡片，不要只丢一行开关在空白画布上。
- 不要把 Codex `auth.json` / 原始 `config.toml` 编辑器当本页模型。

## 代码入口

- 收件箱：`apps/desktop/src/renderer/src/components/inbox/`（`inbox-page.tsx` 壳，`feed/` 时间线，`lib/` 过滤与分组）
- 路由：`apps/desktop/src/renderer/src/router.tsx`
- 分段目录：`apps/desktop/src/renderer/src/components/settings/settings-catalog.ts`
- 壳：`settings-shell.tsx`、`secondary-page-shell.tsx`
- 看板原语：`settings-hub.tsx`
- 偏好段：`settings-general.tsx`、`settings-appearance.tsx`、`settings-agent.tsx`、`settings-media.tsx`
- AI 段：`settings-ai-pages.tsx`；Sandbox：`sandbox-settings.tsx`；偏好补丁：`settings-pref.ts`
- 视觉细节：[../references/visual-system.md](../references/visual-system.md) §6 / §14

## 已知坑

- 收件箱不要 Generic-SaaS-Card，也不要「大白卡片里再套一张圆角列表」：用 `contentWidth="fill"` 左右分栏。未读用字重，不要 8 个相同蓝点；日期用 caption 而不是灰条表头；点时间线只打开阅读器，跳转只走阅读器主按钮。
- Customize 的 Skills 现已落地本机全局与工作区目录的自动扫描、创建、一键安装模版与文件定位。工作区写入必须已打开并登记的 workspace；`global` 才写 `~/.enjoy-agents`。读删不能用任意绝对路径。
- Appearance 支持手动亮/暗，以及皮肤 `classic` / `glass` / `ink`（彩绘墨线）/ `sketch`（素描铅笔纸），不跟随 OS。
- `mcp` 已落地，不要再写成占位。
