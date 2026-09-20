# spec/skills

> 技能生态、Agent 专属整备舱、Bento 集市与同步投影。最后更新：2026-09-20

## 当前真相

设置 `#/settings/extensions` 对精选技能只读投影（`skills-curated.constants.ts`），添加 / 点卡深链本页（`?tab=curated&install=`），不新开安装内核。

1. **工作模块与路由**：`#/skills` 是应用内唯一的 Skills 工作模块。情境导航栏（Secondary Sidebar）包含三组导航：
   - 技能中心：精选集市 (`curated`)、全部能力库 (`all`)、技能包合集 (`packs`)。
   - 按生效助手筛选 (`target:${targetId}`)：已全面对齐系统 13 款原生 CLI 智能体（Enjoy, Claude, Cursor, Grok, Codex, Antigravity, Gemini, OpenCode, Pi, OMP, Hermes, Amp, DeepSeek）。必须统一呈现各 Agent 官方品牌真实图标（走 `AgentBrandIcon`、`@lobehub/icons` 与 `AppMark`），严禁使用手电筒、终端盒、代码斜杠等通用 Remixicon 占位标。
   - 已安装技能组 (`sources`)：Git 仓库与本地文件夹来源组。
2. **Agent 专属整备舱 (Agent Armory Staging)**：
   - 当用户在侧栏选择特定助手（如 `Pi`）时，**严禁展示孤立消极的空白圆角卡片**。
   - 必须呈现 **Agent 专属能力整备舱 (Armory Staging)**：顶部 Agent Profile（展示官方真实品牌标、品牌基色微光与就绪参数），中部推荐能力套件，底部来源组**导入宿主目录**胶囊 + 技能检索矩阵。
   - 投影粒度是**来源组**（`enabledTargetIds` 的宿主目标），不是单技能，也不是 13 家家目录勾选。技能行只展示是否已随来源组装备到宿主，点击打开详情；导入/卸下只走上方来源组胶囊，避免误卸整组。能力卡片底栏只画 `enjoy-agents` / `workspace-agents` 徽标。
3. **Master-Detail 技能组详情页**：
   - 目标 Agent 投影矩阵采用品牌插槽卡片（Slot Cards），禁止灰白扁平药丸。
   - 技能清单支持即时模糊搜索与启用状态过滤（全部 / 已启用 / 停用），每项展示技能名称、简述、命令行呼号与开关状态。领域分类需有真实字段后再做，禁止编造桶。
   - 右侧 IDE 级规范检视器（Frontmatter + 正文），提供定位文件夹与复制定义。
4. **精选集市 (Curated Store)**：
   - 非对称 Bento（Spotlight + 热门榜），严禁 `[Centered-Marketing-Hero]` 与 `[Generic-SaaS-Card]`，分类胶囊用 Remixicon 不用 emoji。
   - 数据集成 `https://www.skills.sh/`（The Open Agent Skills Ecosystem）：主进程 `skills-market-fetcher.ts` 异步拉取并解析全网 180+ 开源技能榜单（涵盖 All Time / Trending / Hot），提供 12 小时本地落盘缓存（`skills-sh-market-cache.json`）与离线内置预置平滑合并，保证 100% 离线可用且不阻塞首屏加载。
5. **新建技能工坊 (Create Skill Studio) 与导入解耦**：
   - 顶栏【新建技能】与【导入来源】两个独立入口。
   - `CreateSkillDialog` 宽体工坊（覆盖 Dialog 默认 `sm:max-w-lg`），模版预设、Markdown 编辑、SKILL.md 实时预览。Slug 仅在 trigger 仍等于自动值时同步呼号。工作区 scope 必须带 `workspacePath`。
6. **技能详情抽屉**：
   - 对标 shadcn Drawer：遮罩 + **内缩悬浮面板**（`inset-y-3 right-3`，四边 `rounded-3xl` + `shadow-card`），禁止贴死视口右缘的全高 `border-l` 切片。
   - 顶栏（图标/标题/关闭）+ 中部滚动 + 底栏全宽主按钮（复制触发指令）。点遮罩或 Escape 关闭。
7. **M6 可选更新（薄层）**：用户点了才 `skills.sources.updateAll`。只快进 manifest 里的 **Git** 源，本机发现组计入 `skippedCount`。成功后尽量 `deploy`（未勾选则只完成 checkout）。入口只有两处，共用 `useSkillSourcePull`：
   - `#/skills` 顶栏「更新技能」：`gitSourceCount > 0` 才渲染；否则**不画按钮**（禁止灰色禁用钮）。
   - `#/settings/agent?tab=defaults` 技能源卡片：无 Git 源时只留「打开 Skills」，不画更新按钮。
   - 进行中文案「正在更新…」；结果 toast「更新了 N 个」/「有源未更新」，禁止堆栈或 IPC 码。
   - **禁止**把更新条挂进空会话 / `AiChatEmptyState`（空态只允许标题 + checklist + pills，Composer 钉 Stage 底）。
   - **不做**：自动 pull、摩擦信号、周报 digest、团队 MCP 分发。
8. **宿主技能索引**（`formatSkillCatalog`）：名称、scope、trigger、一句 description、工作区内相对 `path`。禁止把正文灌进系统提示。预算 8k / 最多 48 条。Enjoy Local 用 `skill` 工具代读（含全局包）。ACP（`hostSkills=catalog-prompt`）把同一份索引垫进 `composeAcpPrompt`；检查器 ACP 也展示该索引。Grok 本机 ACP 另把宿主 `~/.enjoy-agents/skills` 与工作区 `.agents/skills` 收成只含 `plugin.json` + `skills/` 的 `--plugin-dir`（插在 `stdio` 前，不含 hooks）。SSH 上看不见本机路径，不传 plugin-dir，仍靠索引。部署默认只投影到 `enjoy-agents` 与工作区 `.agents/skills`，**不再** `cpSync` 到 `~/.claude/skills` 等家目录。Composer 句首 `/` 列出同一份已安装技能；选中变成 Chip，发送走 `formatSkillMention`（不点名 `read_file`），仍然不灌 SKILL.md。名称带空格且没有合法 `trigger` 时没有 `/` 呼号，只能点面板选。

## 不变量

- 视觉风格严格遵守 BoardUI 语义 token，单强调色 Signal Blue，禁止裸写未定义颜色，禁止 emoji。
- 严禁在有技能库上下文时直接渲染毫无引导意义的空白占位框。
- 技能的启用、禁用与删除必须通过 IPC 规范处理，保证状态与文件系统同步一致。
- 来源组名称与技能名称严格防注入与路径穿越验证。
- `CreateSkillDialog` 必须用带 `sm:` 前缀的 max-width 覆盖 `DialogContent` 默认 `sm:max-w-lg`。
- M6 可选更新不得自动 `git pull`。无 Git 源时不渲染更新按钮。空会话禁止任何技能源同步条。

## 代码入口

- 主页面容器：`apps/desktop/src/renderer/src/components/skills/skills-page.tsx`
- 专属整备舱：`apps/desktop/src/renderer/src/components/skills/components/armory/`
- 详情与控制台：`apps/desktop/src/renderer/src/components/skills/components/detail/`
- 精选集市：`apps/desktop/src/renderer/src/components/skills/components/curated/`
- 状态与查询 Hook：`apps/desktop/src/renderer/src/components/skills/hooks/use-skills-page.ts`、`use-skill-source-pull.ts`
- 领域常量与主题：`apps/desktop/src/renderer/src/components/skills/constants/`
- 后端服务：`apps/desktop/src/main/services/skills-service.ts`、`main/services/skill-sources/`
- 开流索引：`packages/ipc-contract/src/skills-catalog.ts`；拼进 `inspect-prompt-instructions.ts` / Local `open-coding-stream-local.ts` / ACP `composeAcpPrompt`
- 可移植插件导入：`skill-sources/import-plugin.ts`
- Grok `--plugin-dir`：`host-extensions/grok-plugin-dir.ts`
- Composer `/` 技能面板：`ai-chat/composer/mentions/`（`formatSkillMention.ts`、`composer-skill-chips.ts`）
- 设置入口：`components/settings/settings-skill-sources.tsx`
- 更新 toast：`components/skills/components/skill-source-toast-host.tsx`

## 已知坑

- 目标切换状态不更新：`toggleTarget` 执行后必须通过 QueryClient 刷新 `OVERVIEW_QUERY_KEY` 与 `ALL_SKILLS_QUERY_KEY`，否则情境栏数字与卡片徽标不会即时更新。
- 触发词与指令前缀冲突：技能名称包含空格时不能生成合法命令前缀，必须降级为无 `/` 呼号、只能点面板选（`skillSlashToken` 返回 null）。不要编造 `/代码审查` 这种非法 token。
- 整备舱技能行不能调用 `toggleTarget`：会把整组 selected 技能从目标卸掉。导入宿主只走来源组胶囊。
- 整备舱绿灯不得看 `profile.targetId`（Claude/Cursor 家目录）。`isEnabled` 只认 `enjoy-agents` / `workspace-agents`；点击一律 `toggleTarget(..., "enjoy-agents")`。卡片徽标用 `hostEnabledTargetIds`，不要把残留的 claude/cursor 勾画成已装备。
- Agent 品牌标规范（2026-09）：按生效助手筛选列表、整备舱卡片头部与推荐套件严禁使用手电筒（RiFlashlight）、终端盒（RiTerminalBox）、代码斜杠（RiCodeSSlash）等通用占位图标。必须统一走 `AgentBrandIcon` 渲染官方品牌标（覆盖全量 13 款内置 CLI 智能体）。
- `updateAll` 只拉 Git：本机 `~/.agents/skills` 等发现组不会被 pull。没有 Git 源时入口必须不渲染，不要灰按钮空转。
- 空态禁运维条：技能源更新与 SessionReviewBar 同类，不能进 `AiChatEmptyState` / 空会话引导。
- 拉取后投影是尽力而为：`EMPTY_SELECTION` / `MISSING_CHECKOUT` 不算进 `errors`，只完成 checkout。需要覆盖目标目录时仍走 Skills 详情的「重新部署」。
- Skills 页能装却不进当前引擎：Local 必须注入索引 + `skill` 工具；ACP 必须垫同一份 `formatSkillCatalog`。禁止把 `SkillItem.content` 整份塞进系统提示。全局技能 Local 由 main `readSkillContent` 代读；ACP 不要编造 jail 外路径。
- 部署不得再 `cpSync` 到 `~/.claude/skills` 等家目录。默认只写 `enjoy-agents` 与工作区 `.agents/skills`。整备舱按助手查看宿主目录；各家家目录只读，导入是加宿主目标。原生 Cordis/hooks 只给复制命令。
- 可移植插件（根 `plugin.json` / `.claude-plugin/plugin.json`）经 `skills.sources.add` 本地文件夹导入 skills + MCP。无 skills/mcp 的 Cordis 包抛 `PLUGIN_NOT_PORTABLE`。
