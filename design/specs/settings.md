# spec/settings

> 设置是路由，不是弹层。加载器页与设置同构。最后更新：2026-09-08

## 当前真相

TanStack Router + **Hash History**。根布局包 `WindowFrame`。

| Hash | 页面 | 落点 |
|---|---|---|
| `#/` | Chat 工作模块 | AppShell 情境=会话树，Stage=线程 |
| `#/knowledge` `#/workflows` `#/media` `#/mcp` `#/observability` | 工作模块 | AppShell 内换轨，不弹出第二套壳 |
| `#/inbox` | 消息 | 轨道底部 Inbox；`fill` 时间线+阅读器 |
| `#/settings/general` 等 | 设置分段 | AppShell Settings 模块；Providers 必须 `wide` |
| `#/settings/archived` | 已归档的聊天 | Settings |
| `#/settings/automations` | 自动化 | Settings；旧 `#/automations` redirect |
| `#/settings/instructions` `#/settings/rules` | 说明 / 规则 | Settings；旧 `#/customize/*` redirect。`#/settings/skills` 与 `#/customize/skills` 重定向 `#/skills` |
| `#/settings/team` `#/settings/members` | 团队资料 / 成员 | 旧 `#/team/*` redirect |
| `#/settings/billing` `#/settings/organization` `#/settings/integrations` | 账单 / 组织 / 企业集成 | 旧 `#/company/*` redirect |
| `#/settings/account` `#/settings/notifications` | 账号 / 通知 | 旧 `#/account/*` redirect |
| `#/settings/workspace` | 工作区管理（含已挂载目录列表） | 旧 `#/workspaces` redirect |
| `#/studio` | （已废止） | 重定向 `#/` |

设置分段 ID 完整保留 24 个（`general` `appearance` `shortcuts` `providers` `agent` `instructions` `skills` `rules` `workspace` `mcp` `git` `capabilities` `knowledge` `media` `workflow` `automations` `telemetry` `sandbox` `archived` `team` `members` `billing` `organization` `integrations` `account` `notifications`）。
侧栏情境栏精炼为 4 大板块 **10** 个核心项（应用偏好：通用/外观/快捷键；智能体与模型：供应商/智能体/说明/**技能**；工作区与扩展：工作区/MCP；团队与账户：团队），杜绝 24 项长滚动与底部截断。其余子分段仍通过 `resolveActiveNavSectionId` 高亮所属一级条目；`skills` 自己就是一级入口，不再并进「说明」。
底栏用户卡片展开菜单完整映射至上述 Settings / Inbox Hash，及应用内 `ConfirmDialog` 退出登录，杜绝任何 no-op。
快捷键：`Ctrl+,` / `Cmd+,` → General；在 Settings / Inbox 上按 Escape → 进入前的工作模块（记住 last work module，不要永远回 `#/`）。

Providers 页是协议工厂（见 `providers` spec + visual-system §14）：顶部分段 Configured / Explore Presets，编辑走 Dialog 四页签（Connection / Models / Parameters / Overrides），不是页脚堆表单。本页自带标题与分段控件，壳层不要再叠 `h1`。空态虚线框用 `flex-1 min-h-0` 铺满 `wide` 剩余高度。

`#/skills` 是唯一 Skills UI（总览 / 精选发现 / 来源详情 / doctor）。`#/settings/skills`、`#/customize/skills` redirect 到它。权威状态在 `~/.enjoy-agents/skill-sources/`（`manifest.json` / `lock.json`）。打开总览时会把本机 Agent 技能根（`~/.agents/skills`、`~/.claude/skills` 等）写入 manifest，之后才能 `configure` / `deploy`。Git 只接受 HTTPS GitHub/GitLab；`git@` / SSH / `clawhub:` 抛 `UNSUPPORTED_SOURCE`。现有 `skills.list|create|delete|reveal` 仍给 Context 检查器与模版安装。
Automations 存 `settings` 表的 `automations` JSON。触发：`manual` / `on_save`。界面语言默认 `zh`，见 [i18n](./i18n.md)。

个人中心画像 (`#/settings/account`)：对齐 [BoardUI AI Profile](https://www.boardui.com/templates/ai-profile) 范式：
- 顶部 Hero 卡片集成 [Canvas UI](https://canvasui.dev/) 官方 WebGL 着色器动态封面，仅四套：代码雨（`GlyphRain`）、悬浮六角棱镜（`HexFloat`）、复古点阵（`RetroDither`）、冰晶融冻（`Frost`），右上角切换；叠层 [blobatar.dev](https://blobatar.dev/) 的 `BlobatarAvatar`（确定性哈希五官、表情、0~360° 色相、呼吸微动）；Share 复制姓名+handle，Edit 打开资料弹窗。
- 关键指标阵列来自 `observability.metrics`（最多 500 条）：年度贡献按 BoardUI 货币字面 `$` + 千分位（如 `$51`），旁挂环比胶囊（上年为 0 且今年 > 0 显示 `+100%`，双 0 显示 `0%`）；Lifetime tokens、Peak tokens、Longest task、Top streak。禁止正弦波或占位 9B。
- 活跃矩阵热力图：7 行微单元格，Weekly / Monthly / Yearly；空日为 0 阶可见底，不补伪随机活跃。
- Agents 柱状图按**选中月份**聚合真实 run 数，月份选择器可前后翻（不超过当前月）。
- Tokens 面积图：该月每日 token 合计，平滑贝塞尔 + `accent-500` 渐变；标题旁始终挂环比胶囊（相对上月，规则同上）。
- 资料修改（昵称/邮箱/头衔/时区/形象）收纳于 Edit Dialog 与 `BlobatarPicker` / `BlobatarPickerDialog`。底栏安全卡片只反映 renderer 可见的 `hasKey` 与本机节点，不宣称 DPAPI/Keychain、不编造 IP。

企业账单 (`#/settings/billing`)：对齐 [devl.dev Billing](https://www.devl.dev/c/settings/billing) 现代极简流式卡片架构。数据为**本地演示草稿**，页眉标明「本地演示」，未接计费后端。
- 顶部 Plan Hero：套餐名称、Annual、权益摘要、续费状态微标（`active` 绿勾 / `canceled` 灰叉）、月付单价、Compare / Cancel / Upgrade。Cancel 必须改 `plan.status`，禁止取消后仍画 Active。
- Payment Method：Visa、脱敏卡号、有效期、账单邮箱、Default。Update 打开本页草稿 Dialog，保存只改本地 state。
- Stat Cards：Credits、Tax ID（专票 / 统一代码）、Currency。
- Invoices：本机下载 CSV（Export all 与单行），不假装远端成功。
- Compare plans → `pricing-comparison-dialog`；Custom 只关窗。其它档位带 `planId` 打开升级弹窗。Upgrade → 月/年切换 + 三档 + 席位滑块；Starter 确认时席位钉死 5。

## 不变量

- 侧栏条目必须 `navigate`，禁止 no-op。
- Providers 禁用 `article`（760px），目录三列会被裁。
- 设置行：标题 + 说明 + 右侧控件，放在内层 bordered card。偏好页先 `SettingsHub` 再卡片，不要只丢一行开关在空白画布上。通用页一行：当前版本（说明里带状态）+「检查更新」；有新版本同一行变成打开说明（见 `updates` spec）。
- 不要把 Codex `auth.json` / 原始 `config.toml` 编辑器当本页模型。Claude / Codex 可把已有供应商 Key **同步**到本机配置（用户点击、先备份 `*.enjoy.bak`、可恢复），不是给用户手改 toml。
- Agent 段用顶部分段：本机 CLI / 进阶沙箱 / 默认项。本机 CLI 页顶先提示「切到 Cursor 后 Enjoy 密钥不会传给它」，再画只读 **能力矩阵** 与 **配置边界** 表，然后才是 CLI 卡。禁止 `AgentToolsHubMetrics` 装载率条 / 常绿灯 /「沙箱隔离·实时 Token 流」。进阶沙箱文案是「实验 · 沙箱 Harness」，不上 Composer 导轨。CLI 是紧凑卡 + 配置弹窗（探测 / 安装 / 卸载 / 登录 / 模型 / **运行偏好** / 路径 / doctor / 账号详情 / 可选同步）。运行偏好只暴露 ACP 真正认的旗标（`LAUNCH_PREFS` 目前为空，避免再写出 `--fast`）；未收录项才出现在高级「自定义参数」。开流按 `RuntimeCapabilities` 丢掉 `--fast` / `--thinking`。账号与额度来自 `agentTools.inspect`（`login || quota || models==inspect` 且已就绪，不含 Enjoy Local）。进度条仅 `quota=true` **且** 有官方数字；否则诚实空态「该 CLI 无公开额度 API」，不画空条。企业账单未接后端，页眉保持「本地演示」（L2 不做假积分）。环境扫描、设置页挂载与 doctor / 登录会清 inspect 缓存并 `refresh: true`。详见 [`m1-usage-and-capabilities.md`](./m1-usage-and-capabilities.md)。

## 代码入口

- 收件箱：`apps/desktop/src/renderer/src/components/inbox/`（`inbox-page.tsx` 壳，`feed/` 时间线，`lib/` 过滤与分组）
- 路由：`apps/desktop/src/renderer/src/router.tsx`
- 分段目录：`apps/desktop/src/renderer/src/components/settings/settings-catalog.ts`
- 壳：`settings-shell.tsx`（登记情境栏）；应用铬 `app-shell/`
- 看板原语：`settings-hub.tsx`
- 偏好段：`settings-general.tsx`、`settings-appearance.tsx`、`settings-agent.tsx`、`settings/agent-tools/`（`capability-matrix.tsx` / `config-boundary-table.tsx`）、`settings-media.tsx`
- AI 段：`settings-ai-pages.tsx`；Sandbox：`sandbox-settings.tsx`；偏好补丁：`settings-pref.ts`
- 个人中心：`apps/desktop/src/renderer/src/components/account/`（`lib/profile-metrics.ts` 聚合、`glass/glass-cover.tsx` 封面、`avatar/` Blobatar）
- 企业账单：`apps/desktop/src/renderer/src/components/company/billing/`（`cards/` Hero/支付/指标/发票，`modals/` 对比与升级，`lib/apply-upgrade.ts` / `lib/billing-export.ts`）
- Skills：`apps/desktop/src/renderer/src/components/skills/`（`skills-page.tsx`）。主进程：`main/services/skill-sources/`、`main/ipc-skill-sources.ts`
- 视觉细节：[../references/visual-system.md](../references/visual-system.md) §6 / §14
## 已知坑

- 收件箱是 AppShell 模块，不是独立壳。不要 Generic-SaaS-Card，也不要「大白卡片里再套一张圆角列表」：用 `contentWidth="fill"` 左右分栏。未读用字重，不要 8 个相同蓝点；日期用 caption 而不是灰条表头；点时间线只打开阅读器，跳转只走阅读器主按钮。
- Studio / Team / Company / Account 旧 Hash 必须 redirect 进 AppShell，不要再挂 `SecondaryPageShell` 侧栏。
- Skills 只有工作模块 `#/skills` 一套 UI。单个技能走 `skills.sources.deleteSkill`（本机目录删包，Git 只拆投影）。来源组 `skills.sources.remove`：Git 清 checkout 与投影；本机自动发现组写入 `ignoredOrigins` 隐藏，不删 `~/.agents/skills` 根。模版安装仍走 `skills.create`。
- Appearance 支持手动亮/暗，以及皮肤 `classic` / `glass` / `ink`（彩绘墨线）/ `sketch`（素描铅笔纸），不跟随 OS。
- 设置侧栏严禁无脑平铺全部 24 个分段。`skills` 是一级入口（智能体分组），不要再并进「说明」。其余子分段（`rules` / `billing` 等）仍通过 `resolveActiveNavSectionId` 高亮父级。
- `mcp` 已落地，不要再写成占位。
- 个人中心图表禁止 Fake-Status-Chrome：没有遥测就画 0，不要 `Math.max(count, 14)` 或种子随机填热力图。IPC `observability.metrics` 上限 500，年视图会截断更早记录。
- 安全卡片不能探测 `safeStorage.isEncryptionAvailable()`（无对应 IPC）；只展示 `hasKey`。不要为了绿点去加频道。
- `canvasui/` 是官方着色器 vendored 副本（单文件远超 300 行），不要拆 GLSL/WebGL 一体着色器。产品封面只接线四套，不要再挂 Unsplash 伪晶体预设。
- 设置壳 `hideChrome` 对全部 Settings 分段生效：各页自带 `h1` 或 Hero，禁止再叠「团队资料」铬条。
- Providers 自带标题与分段控件。`SettingsSectionPage` 不要再叠一层 `h1`，否则出现两个「模型供应商」。空态虚线框必须 `flex-1`，不要按内容收在卡片上半截。
- 账单页没有计费 IPC。禁止 setTimeout 假装核验/导出成功；CSV 用 `Blob` 本机下载。页眉必须保留「本地演示」，不要接假积分条（Usage L2）。
- 不要把 `AgentToolsHubMetrics` 装回来：装载率百分比、永远绿灯、「沙箱隔离 · 实时 Token 流」是 Fake-Status-Chrome，且把沙箱和 ACP 混成一条。
