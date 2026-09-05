# spec/skills

> 技能生态、Agent 专属整备舱、Bento 集市与同步投影。最后更新：2026-09-05

## 当前真相

1. **工作模块与路由**：`#/skills` 是应用内唯一的 Skills 工作模块。情境导航栏（Secondary Sidebar）包含三组导航：
   - 技能中心：精选集市 (`curated`)、全部能力库 (`all`)、技能包含集 (`packs`)。
   - 按生效助手筛选 (`target:${targetId}`)：Enjoy, Claude, Cursor, Codex, Pi, OMP。
   - 已安装技能组 (`sources`)：Git 仓库与本地文件夹来源组。
2. **Agent 专属整备舱 (Agent Armory Staging)**：
   - 当用户在侧栏选择特定助手（如 `Pi`）时，**严禁展示孤立消极的空白圆角卡片**。
   - 必须呈现 **Agent 专属能力整备舱 (Armory Staging)**：顶部 Agent Profile，中部推荐能力套件，底部来源组快速挂载胶囊 + 技能检索矩阵。
   - 投影粒度是**来源组**（`enabledTargetIds`），不是单技能。技能行只展示是否已随来源组装备，点击打开详情；挂载/卸载只走上方来源组胶囊，避免误卸整组。
3. **Master-Detail 技能组详情页**：
   - 目标 Agent 投影矩阵采用品牌插槽卡片（Slot Cards），禁止灰白扁平药丸。
   - 技能清单支持即时模糊搜索与启用状态过滤（全部 / 已启用 / 停用），每项展示技能名称、简述、命令行呼号与开关状态。领域分类需有真实字段后再做，禁止编造桶。
   - 右侧 IDE 级规范检视器（Frontmatter + 正文），提供定位文件夹与复制定义。
4. **精选集市 (Curated Store)**：
   - 非对称 Bento（Spotlight + 热门榜），严禁 `[Centered-Marketing-Hero]` 与 `[Generic-SaaS-Card]`，分类胶囊用 Remixicon 不用 emoji。
5. **新建技能工坊 (Create Skill Studio) 与导入解耦**：
   - 顶栏【新建技能】与【导入来源】两个独立入口。
   - `CreateSkillDialog` 宽体工坊（覆盖 Dialog 默认 `sm:max-w-lg`），模版预设、Markdown 编辑、SKILL.md 实时预览。Slug 仅在 trigger 仍等于自动值时同步呼号。工作区 scope 必须带 `workspacePath`。

## 不变量

- 视觉风格严格遵守 BoardUI 语义 token，单强调色 Signal Blue，禁止裸写未定义颜色，禁止 emoji。
- 严禁在有技能库上下文时直接渲染毫无引导意义的空白占位框。
- 技能的启用、禁用与删除必须通过 IPC 规范处理，保证状态与文件系统同步一致。
- 来源组名称与技能名称严格防注入与路径穿越验证。
- `CreateSkillDialog` 必须用带 `sm:` 前缀的 max-width 覆盖 `DialogContent` 默认 `sm:max-w-lg`。

## 代码入口

- 主页面容器：`apps/desktop/src/renderer/src/components/skills/skills-page.tsx`
- 专属整备舱：`apps/desktop/src/renderer/src/components/skills/components/armory/`
- 详情与控制台：`apps/desktop/src/renderer/src/components/skills/components/detail/`
- 精选集市：`apps/desktop/src/renderer/src/components/skills/components/curated/`
- 状态与查询 Hook：`apps/desktop/src/renderer/src/components/skills/hooks/use-skills-page.ts`
- 领域常量与主题：`apps/desktop/src/renderer/src/components/skills/constants/`
- 后端服务：`apps/desktop/src/main/services/skills-service.ts`

## 已知坑

- 目标切换状态不更新：`toggleTarget` 执行后必须通过 QueryClient 刷新 `OVERVIEW_QUERY_KEY` 与 `ALL_SKILLS_QUERY_KEY`，否则情境栏数字与卡片徽标不会即时更新。
- 触发词与指令前缀冲突：技能名称包含空格时不能生成合法命令前缀，必须降级为 `@` 标签或隐藏触发胶囊。
- 整备舱技能行不能调用 `toggleTarget`：会把整组 selected 技能从目标卸掉。挂载只走来源组胶囊。
