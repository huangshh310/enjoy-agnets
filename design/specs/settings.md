# spec/settings

> 设置是路由，不是弹层。加载器页与设置同构。最后更新：2026-09-11

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
| `#/settings/account` `#/settings/notifications` | 账号 / 通知 | 旧 `#/account/*` redirect。通知偏好走 `preferences` + 主进程 `Notification`。个人资料（名/邮箱/头衔/封面/Blobatar）走 `settings.setPreferences.accountProfile`，进本机 `preferences` JSON；旧 `localStorage` `enjoy:account-profile` 只迁移一次。不是云账号 |
| `#/settings/workspace` | 工作区管理（含已挂载目录列表） | 旧 `#/workspaces` redirect |
| `#/studio` | （已废止） | 重定向 `#/` |

`#/settings/instructions` 写入 `preferences.customInstructions`：Enjoy Local 拼进 ToolLoop 系统提示；本机 CLI 垫 `session/prompt` 前缀（`[Enjoy custom instructions]`）。工作区 / 全局 `AGENTS.md` 走独立链（`formatAgentsMdChain`，32KiB），不再只靠 always-on 整份 dump。`#/settings/rules` 扫描到的其余常驻规则（无 globs 或 `alwaysApply: true`，预算 24k）注入 Enjoy Local；带 globs 的 contextual 不自动塞每一轮。`#/skills` 已装技能以索引注入 Enjoy Local（不灌 SKILL.md）。ACP 不重复灌 AGENTS.md / 技能正文（CLI 读盘）。新建会话才 `modeForNewSession(rememberedDefaultMode)`（由 settings 快照记住，禁止再打 `settings.get` 扫 PATH）。设置页改默认模式只 `rememberDefaultMode` + `preferences.defaultMode`，**禁止** `setMode` 当前会话。切回已有会话用 `sessionModes[sessionId]`，缺记录回落 `agent`，不用默认项。settings refetch 不得覆盖当前会话 mode。

设置分段 ID 完整保留 24 个（`general` `appearance` `shortcuts` `providers` `agent` `instructions` `skills` `rules` `workspace` `mcp` `git` `capabilities` `knowledge` `media` `workflow` `automations` `telemetry` `sandbox` `archived` `team` `members` `billing` `organization` `integrations` `account` `notifications`）。
侧栏情境栏精炼为 4 大板块 **10** 个核心项（应用偏好：通用/外观/快捷键；智能体与模型：供应商/智能体/说明/**技能**；工作区与扩展：工作区/MCP；组织：**个人资料** `#/settings/account`），杜绝 24 项长滚动与底部截断。其余子分段仍通过 `resolveActiveNavSectionId` 高亮所属一级条目（`team` / `members` / `billing` / `organization` / `integrations` / `notifications` / `archived` → `account`）；`skills` 自己就是一级入口，不再并进「说明」。不要把一级入口做成「团队资料」空态，否则个人中心（Blobatar / Hero / 用量图）会从侧栏消失。
底栏用户卡片是本机工作区（邮箱占位 `local`），菜单到工作区 / **个人资料** / Inbox / 通用设置。**没有**退出登录、没有聊天菜单里的「订阅与账单」。`#/settings/team` / `members` / `organization` / `integrations` / `billing` 都是诚实空态（本地单机，无组织同步、无假套餐升级）；团队页提供「打开个人资料」CTA，不要让用户停在空白「本地单机」卡上找不到画像。归档聊天是真页面（`ArchivedChatsPage`），不是 Coming Soon。
快捷键：`Ctrl+,` / `Cmd+,` → General；在 Settings / Inbox 上按 Escape → 进入前的工作模块（记住 last work module，不要永远回 `#/`）。

Providers 页是协议工厂（见 `providers` spec + visual-system §14）：顶部分段 Configured / Explore Presets，添加 / 编辑走右侧抽屉（与智能体配置同一套 `SettingsSideDrawer`），四页签 Connection / Models / Parameters / Overrides，不是居中 Dialog、不是页脚堆表单。本页自带标题与分段控件，壳层不要再叠 `h1`。空态虚线框用 `flex-1 min-h-0` 铺满 `wide` 剩余高度。Configured 行显示引用该档案的本机 CLI 芯片（无引用不画「0 个智能体」）；点芯片 `navigate` 到 `#/settings/agent?tool=<runtimeId>`，本机 CLI 卡闪一下（`agent-tool-anchor`）。删除仍被引用的档案先 Confirm 列出助手名。

`#/skills` 是唯一 Skills 工作模块（总览 / 精选发现 / 来源详情 / doctor）。`#/settings/skills`、`#/customize/skills` redirect 到它。`#/settings/agent?tab=defaults` 另有一行**可选拉取**卡片（`SettingsSkillSources`），只调用 `skills.sources.updateAll`，不复制整页 Skills UI。权威状态在 `~/.enjoy-agents/skill-sources/`（`manifest.json` / `lock.json`）。打开总览时会把本机 Agent 技能根（`~/.agents/skills`、`~/.claude/skills` 等）写入 manifest，之后才能 `configure` / `deploy`。Git 只接受 HTTPS GitHub/GitLab；`git@` / SSH / `clawhub:` 抛 `UNSUPPORTED_SOURCE`。现有 `skills.list|create|delete|reveal` 仍给 Context 检查器与模版安装。M6 可选更新：无 Git 源则**不渲染**更新按钮；点了才快进，不自动同步。空会话禁止挂更新条。
Automations 存 `settings` 表的 `automations` JSON。触发：`manual` / `on_save`。`automations.run` 用当前会话 `agent.run`；Agent 写盘或 Files 保存（带 sessionId）会触发已启用的 `on_save`。通知开关节入 `preferences.desktopPush` / `approvalRequiredAlert` / `agentCompleteSound`，主进程在 `approval.required` / `run.end` 弹系统通知。界面语言默认 `zh`，见 [i18n](./i18n.md)。

个人中心画像 (`#/settings/account`)：对齐 [BoardUI AI Profile](https://www.boardui.com/templates/ai-profile) 范式：
- 顶部 Hero 卡片集成 [Canvas UI](https://canvasui.dev/) 官方 WebGL 着色器动态封面，仅四套：代码雨（`GlyphRain`）、悬浮六角棱镜（`HexFloat`）、复古点阵（`RetroDither`）、冰晶融冻（`Frost`），右上角切换；叠层 [blobatar.dev](https://blobatar.dev/) 的 `BlobatarAvatar`（确定性哈希五官、表情、0~360° 色相、呼吸微动）；Share 复制姓名+handle，Edit 打开资料弹窗。
- 关键指标阵列来自 `observability.metrics`（最多 500 条）：年度贡献按 BoardUI 货币字面 `$` + 千分位（如 `$51`），旁挂环比胶囊（上年为 0 且今年 > 0 显示 `+100%`，双 0 显示 `0%`）；Lifetime tokens、Peak tokens、Longest task、Top streak。禁止正弦波或占位 9B。
- 活跃矩阵热力图：7 行微单元格，Weekly / Monthly / Yearly；空日为 0 阶可见底，不补伪随机活跃。
- Agents 柱状图按**选中月份**聚合真实 run 数，月份选择器可前后翻（不超过当前月）。
- Tokens 面积图：该月每日 token 合计，平滑贝塞尔 + `accent-500` 渐变；标题旁始终挂环比胶囊（相对上月，规则同上）。
- 资料修改（昵称/邮箱/头衔/时区/形象）收纳于 Edit Dialog 与 `BlobatarPicker` / `BlobatarPickerDialog`。底栏安全卡片只反映 renderer 可见的 `hasKey` 与本机节点，不宣称 DPAPI/Keychain、不编造 IP。

企业账单 (`#/settings/billing`)：诚实空态（`LocalOnlyNotice`）。没有自营套餐、席位滑块或可点升级。额度在各家 CLI / 供应商密钥里。`company/billing/` 演示草稿不再挂入口。

## 不变量

- 侧栏条目必须 `navigate`，禁止 no-op。
- Providers 禁用 `article`（760px），目录三列会被裁。
- 设置行：标题 + 说明 + 右侧控件，放在内层 bordered card。偏好页先 `SettingsHub` 再卡片，不要只丢一行开关在空白画布上。通用页一行：当前版本（说明里带状态）+「检查更新」；有新版本同一行变成打开说明（见 `updates` spec）。
- 不要把 Codex `auth.json` / 原始 `config.toml` 编辑器当本页模型。Claude / Codex / Gemini / OpenCode 可把已绑定的 Enjoy 档案 **同步**到本机配置（用户点击、先备份 `*.enjoy.bak`、可恢复）；Enjoy 内开流默认只注入子进程 env，不必先同步。不是给用户手改 toml。
- Agent 段用顶部分段：本机 CLI / **Registry** / 进阶沙箱 / 默认项。三路命名与 M1 一致：Enjoy 本地 · ACP 本机 CLI · 进阶沙箱。Registry 不上 EngineRail、不进新会话空态；`#/settings/agent?tab=registry` 打开 Registry（空态深链）；`#/settings/agent?tool=<id>` 打开本机 CLI 并闪对应行。本机 CLI 页顶：管理供应商 / 扫描 / 体检 + 一行可关提示「切到本机助手时 Enjoy 密钥不会带过去」；隔离令牌已配置时多一行「进阶沙箱：隔离令牌已配置」（未配置则藏，禁止「Token：Vercel」），**然后是密表**（助手 | 动力源 | 操作），1:1 [`previews/local-cli-dense-p0.html`](../previews/local-cli-dense-p0.html)（锁 tip `8bd7f6e`，表骨架真源）。未找到行的安装中 / 失败态 1:1 [`previews/p0-sandbox-debrand-install-states.html`](../previews/p0-sandbox-debrand-install-states.html)（锁 tip `4c0e9e0`）：主槽「安装中…」禁用；失败一行人话 +「重试」+ 复制，禁止假进度条。助手列：品牌 · 名 · 状态点；`homeSynced` 才在名旁画「已同步」，「官方仍保留」只进抽屉。次行只拼 `{version} · {路径短名}`（Enjoy `— · 内置`）。每行都有动力源：可绑=`供应商 · 档案 · 模型`（未绑=`官方登录 · 已登录/未登录/检测中`）；仅官方（`providerBind=none`，含 Cursor/Grok/Antigravity/Amp）=`官方登录 · 已登录/未登录/检测中`；OMP=`OMP 供应商 · … · 模型`；Enjoy 本地=`供应商 · 当前档案 · 模型`；未找到 / 空=`—`。列表不画额度条、「额度进配置」、表底协议词。操作列定宽主槽（设为主引擎 / ✓ 当前 / 一键安装）+ 图标次钮（配置 / 复制）。主引擎只轻标「当前」，已绑档案时胶囊描 `accent` 边，不整行特权蓝块。配置抽屉宽 **576px**（`36rem`），顶栏是名称 +「配置 · …」+ 关闭，内容 `px-4 py-4`。「这个助手用」是标签 + 双行触发器：账号行只写档案名（或官方登录 + 品牌标），模型单独一行带族标；禁止两只下拉都拼「档案 · 模型」。也用于是圆片；同步是次级 `<details>`，不要做成第三只下拉。官方旁注虚线盒写「官方登录仍保留 · 仅系统终端」，不摊邮箱。列表不画 ToolLoop / ACP stdio / 绝对路径 / 额度条 / 邮箱；短路径 `bin/xxx` 可以。`#/settings/agent?tool=<id>` 闪对应行。只读 **能力矩阵** 与 **配置边界** 收进默认收起的「能力说明」；矩阵「支持」不是已登录，点行跳到对应卡（沙箱行切进阶沙箱）。配置走右侧抽屉（对标知识库文档预览，禁止居中 Dialog），**所有助手同一壳**，决策槽永远叫「这个助手用」。可绑：档案+模型 → 也用于（不含沙箱）→ 同步折叠；官方 inspect 降为旁注。仅官方：只读官方登录态 + 登录 CTA，**禁止假 vault 下拉**。OMP：同一槽位但文案是 OMP 供应商，不是 Enjoy 档案。绑了档案后禁止把 inspect 名 / 当前模型画成当前供应商。官方账号 Hero 决策面只写「登录方式 · 官方账号」，禁止摊 `authMethod` / OAuth / 协议原文。没有兼容档案时保持官方登录，点按钮就地打开对应 preset 的新建表单（Claude → Anthropic），禁止跳到供应商整页。禁止进入「已选 Enjoy 但没有档案」的空状态。OMP 配置必须按供应商登录并等 callback，禁止无参 `login`。禁止 `AgentToolsHubMetrics` 装载率条 / 常绿灯 /「沙箱隔离·实时 Token 流」。进阶沙箱标题是「进阶沙箱」，只可读「当前提供商 · 云隔离（默认）」；字段是隔离令牌 / 团队 ID / 项目 ID，保存钮「保存隔离令牌」。C 端字段标题禁止 Vercel。不上 Composer 导轨。CLI 是紧凑表行 + 配置抽屉（探测 / 安装 / 卸载 / 登录 / 模型 / **这个助手用** / **运行偏好** / 路径 / doctor / 账号详情 / 可选同步）。运行偏好只暴露 ACP 真正认的旗标（`LAUNCH_PREFS` 目前为空，避免再写出 `--fast`）；未收录项才出现在高级「自定义参数」。开流按 `RuntimeCapabilities` 丢掉 `--fast` / `--thinking`。账号与额度来自 `agentTools.inspect`（`login || quota || models==inspect` 且已就绪，不含 Enjoy Local）。进度条仅 `quota=true` **且** 有官方数字；否则诚实空态「该 CLI 无公开额度 API」，不画空条。企业账单是诚实空态，不做演示套餐（L2 不做假积分）。环境扫描、设置页挂载与 doctor / 登录会清 inspect 缓存并 `refresh: true`。详见 [`m1-usage-and-capabilities.md`](./m1-usage-and-capabilities.md)。

## 代码入口

- 收件箱：`apps/desktop/src/renderer/src/components/inbox/`（`inbox-page.tsx` 壳，`feed/` 时间线，`lib/` 过滤与分组）
- 路由：`apps/desktop/src/renderer/src/router.tsx`
- 分段目录：`apps/desktop/src/renderer/src/components/settings/settings-catalog.ts`
- 壳：`settings-shell.tsx`（登记情境栏）；应用铬 `app-shell/`
- 抽屉叠层：`settings-overlay.ts`（base 50 / nested 70 / float 80）
- 看板原语：`settings-hub.tsx`
- 偏好段：`settings-general.tsx`、`settings-appearance.tsx`、`settings-agent.tsx`、`settings/agent-tools/`（`agent-tool-row.tsx` / `list-secondary.ts` / `install-row-copy.ts` / `list-layout.ts` / `power-source/` / `bind-source/` / `capability-matrix.tsx` / `config-boundary-table.tsx` / `acp-registry-*.tsx` / `custom-acp-agent-form.tsx`）、`settings-media.tsx`
- AI 段：`settings-ai-pages.tsx`；本机执行沙箱：`sandbox-settings.tsx`；进阶沙箱：`settings-harness.tsx` / `settings-harness-credentials.tsx`；偏好补丁：`settings-pref.ts`
- 个人中心：`apps/desktop/src/renderer/src/components/account/`（`lib/profile-metrics.ts` 聚合、`glass/glass-cover.tsx` 封面、`avatar/` Blobatar）
- 账单 / 团队 / 组织 / 集成诚实空态：`settings/local-only-notice.tsx`、`company/company-billing-section.tsx`、`team/*-section.tsx`、`company/company-*-section.tsx`
- Skills：`apps/desktop/src/renderer/src/components/skills/`（`skills-page.tsx`）。主进程：`main/services/skill-sources/`、`main/ipc-skill-sources.ts`
- 技能源可选更新：`settings-skill-sources.tsx`（Agent 默认项）。禁止挂进空会话。
- 视觉细节：[../references/visual-system.md](../references/visual-system.md) §6 / §14
## 已知坑

- 收件箱是 AppShell 模块，不是独立壳。不要 Generic-SaaS-Card，也不要「大白卡片里再套一张圆角列表」：用 `contentWidth="fill"` 左右分栏。未读用字重，不要 8 个相同蓝点；日期用 caption 而不是灰条表头；点时间线只打开阅读器，跳转只走阅读器主按钮。
- Studio / Team / Company / Account 旧 Hash 必须 redirect 进 AppShell，不要再挂 `SecondaryPageShell` 侧栏。
- Skills 只有工作模块 `#/skills` 一套 UI。单个技能走 `skills.sources.deleteSkill`（本机目录删包，Git 只拆投影）。来源组 `skills.sources.remove`：Git 清 checkout 与投影；本机自动发现组写入 `ignoredOrigins` 隐藏，不删 `~/.agents/skills` 根。模版安装仍走 `skills.create`。
- 嵌套供应商抽屉是 `z-[70]`。模型 Combobox / Select / Dropdown 若仍 `z-50` 或 `z-60`，菜单会开在抽屉背面，看起来「点击无法下拉」。弹出层必须用 `SETTINGS_DRAWER_Z_CLASS.float`（`z-[80]`），且 Popover 保持 `modal`，避免点菜单时点穿遮罩关掉抽屉。nested Escape 必须看 `defaultPrevented`，并忽略 popover / dropdown 内的 Esc。
- 自定义 ACP 编辑也走 `SettingsSideDrawer`，不要居中 Dialog。
- 绑了 Enjoy 档案后，配置抽屉顶部若仍画 `inspect.authAccount` 英雄卡（邮箱 / CUSTOM / 当前模型），用户会以为没换供应商。`authAccount` 是本机 CLI 官方登录。正确做法：「这个助手用」在前；`useCustomProvider` 时官方账号只作旁注，不展示 inspect 当前模型。
- 「这个助手用」若两只无标签下拉都写 `deep · deepseek-flash`，用户分不清在选账号还是模型。账号行只写档案名 + 品牌/密钥副行；模型单独标签。抽屉 576px（`36rem`），给后续字段留宽。同步是次级折叠，不要做成第三只下拉。
- Appearance 支持手动亮/暗，以及皮肤 `classic` / `glass` / `ink`（彩绘墨线）/ `sketch`（素描铅笔纸），不跟随 OS。
- 设置侧栏严禁无脑平铺全部 24 个分段。`skills` 是一级入口（智能体分组），不要再并进「说明」。组织一级入口必须是 `account`（个人资料），禁止用空的 `team` 顶掉画像。其余子分段（`rules` / `billing` / `team` 等）仍通过 `resolveActiveNavSectionId` 高亮父级。
- `mcp` 已落地，不要再写成占位。
- 个人中心图表禁止 Fake-Status-Chrome：没有遥测就画 0，不要 `Math.max(count, 14)` 或种子随机填热力图。IPC `observability.metrics` 上限 500，年视图会截断更早记录。
- 安全卡片不能探测 `safeStorage.isEncryptionAvailable()`（无对应 IPC）；只展示 `hasKey`。不要为了绿点去加频道。
- 个人资料不要只写 renderer `localStorage`：刷新能活但换 userData / 主进程看不到。权威在 `preferences.accountProfile`；旧 key 迁完即删。
- `canvasui/` 是官方着色器 vendored 副本（单文件远超 300 行），不要拆 GLSL/WebGL 一体着色器。产品封面只接线四套，不要再挂 Unsplash 伪晶体预设。
- 设置壳 `hideChrome` 对全部 Settings 分段生效：各页自带 `h1` 或 Hero，禁止再叠「团队资料」铬条。
- 本机 CLI 配置与供应商添加/编辑必须是右侧抽屉（`SettingsSideDrawer`，知识库文档预览同款），禁止再开居中 Dialog。卸载 / 删除仍可用 ConfirmDialog。从智能体抽屉里添加供应商用 nested 层，避免两只抽屉抢 Escape。
- Providers 自带标题与分段控件。`SettingsSectionPage` 不要再叠一层 `h1`，否则出现两个「模型供应商」。空态虚线框必须 `flex-1`，不要按内容收在卡片上半截。
- 账单页没有计费 IPC，也不要再挂演示套餐 / 升级弹窗。L4 卡可以深链到本页说明，不要假装能在 Enjoy 里充值。
- 团队 / 成员 / 组织 / 集成禁止再塞 Alex Zhang、GitHub Enterprise「已连接」、`team@enjoy-agents.dev` 已登录云账号。没有云同步就写本地单机。用户卡禁止「退出登录」（没有云会话可退）。
- 新建会话若 `settings.get` 会顺带 `listAgentTools`（PATH 探测），输入框会顿一下。默认模式只从已应用的 settings 快照记住。设置页改 Ask/Plan 默认项若顺便 `setMode`，会把正在看的会话改名实不符；必须只写偏好。
- `#/settings/instructions` 能保存却不进默认引擎：旧路径只给 Harness 拼 `customInstructions`。Enjoy Local 必须 `extraInstructions`；ACP 只垫 `session/prompt`，检查器不得回 ToolLoop `systemPromptFor`。
- 不要把 `AgentToolsHubMetrics` 装回来：装载率百分比、永远绿灯、「沙箱隔离 · 实时 Token 流」是 Fake-Status-Chrome，且把沙箱和 ACP 混成一条。
- 本机 CLI 若把能力矩阵铺在卡片前面，用户会以为「登录=是」就是已登录，也找不到安装入口。矩阵必须默认收起，「支持」不是现场状态。
- 本机 CLI 列表若按 `providerBind===none` 藏绑定摘要，Cursor / Grok 会缺「动力源」列。正确做法：每行都有同构胶囊；仅官方走 `官方登录 · 已登录/未登录/检测中`，未找到画 `—`，禁止假 BYOK。不要再铺不等高卡片网格，也不要在列表画绝对路径 / 额度 / 邮箱 / 协议微标。主引擎只轻标。
- 列表副标题若用品牌 `meta.tagline` 或 `listLine` 长句，Grok 等会泄漏协议词。次行走 `formatListSecondary`（只拼 `{version} · {路径短名}`，缺段用 —，禁止 doctor /「体检正常」/ 安装长句）。官方旁注不要再插 `{name}` / 邮箱，「官方仍保留」只进抽屉、不上列表。视觉锁只认 [`previews/local-cli-dense-p0.html`](../previews/local-cli-dense-p0.html)（锁 tip `8bd7f6e`）。`dense-v2` 已废为 stub，勿接线。安装中 / 失败与进阶沙箱去品牌另认 [`previews/p0-sandbox-debrand-install-states.html`](../previews/p0-sandbox-debrand-install-states.html)（锁 tip `4c0e9e0`）。
- 进阶沙箱 C 端若再写「Vercel Sandbox 令牌 / Token：Vercel」，用户会以为要买云品牌。字段只写隔离令牌；实现仍可一家后端。供应商 Explore 分类是「AI SDK 兼容」，不要假「Vercel 沙箱」供应商卡。失败只 toast、行上无原因，用户不知道为何没装上。主槽改「重试」，一行人话，不要假进度条。
- Registry 只在 `#/settings/agent?tab=registry`。空态 checklist 不得嵌 `AgentCliInstall` 整卡或 Registry 列表；深链用 search `tab`，不要新开路由。
