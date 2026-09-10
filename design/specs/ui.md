# spec/ui

> 三张浮在 Mist 画布上的卡片，不是营销落地页。最后更新：2026-09-10

## 当前真相

窗口画布支持全应用皮肤切换（`classic` 经典实体、`glass` 磨砂玻璃、`ink` 手绘墨线、`sketch` 素描铅笔纸）。接口只有 `html[data-skin]`；每种皮肤一份 CSS：`packages/ui/styles/skins/classic.css`、`glass.css`、`ink.css`、`sketch.css`，由 `globals.css` `@import`。`ink` 跟昼/夜开关同一套模具：天蓝底、2.5px 墨边、错位投影、`::after` 抖动描边；字/图标走墨色 `#1a1a1a`。`sketch` 是另一套：素描纸 + 淡排线分层，**不要黑框、不要错位硬影**，不改 ink。浅色 `glass` 画布透明、冷石板深色字；暗色 `glass` 覆盖浅字，frost 约 58% + `blur(44px)`。底板注入物理微环境漫射光斑（Ambient Canvas Glow），赋予三卡片自然进深感与悬浮质感。主工作区三张卡片、12px 窗内边距、间隙 `gap-3`。三卡片采用双层物理光学投影系统（`shadow-card` / `shadow-sidebar`），浅色具备细腻触地影与环境漫射扩散，暗色具备 1px 倒角微高光。全应用只有这一套铬（`AppShell`），禁止再弹出「返回应用」第二套侧栏：

1. **Nav card（轨道+情境）** — 展开 260px，折叠 60px。内部左侧 48px 图标轨道：上为 Chat / Knowledge / Workflows / Media / MCP / **Skills** / Observability，底部分隔 Inbox / Settings。右侧 212px 情境栏随模块更换（Chat=会话树，Knowledge=来源，MCP=服务/市场/JSON，Skills=来源组/精选/目标，Settings=分段…）。折叠只留轨道图标。禁止在情境栏底再叠一层 Module Rails。会话行左侧画**该会话绑定**的 Lobe 品牌标（`sessionRuntimes[sessionId]`，缺省 `preferredRuntimeId`），不要一律跟 Composer 当前 runtime，否则切一次 Cursor 所有历史会话都会变 Cursor。运行中右侧用 `LoadingStateGlyph` `drive`（与 Thinking 头同一套 3×3 点阵），不要再走 `DotMatrixLoader` wave。新建会话立刻 `bindSessionRuntime`，绑的是 **Composer 当前 `runtimeId`**，不是全局偏好。⌘L 最近会话同样画品牌标。
2. **Stage** — flex，**始终铺满标题栏以下剩余高度**（与 Nav card 底边对齐），不要按内容收缩露出大块 Mist。Chat 为线程与 composer（`hidden` 藏起但不卸载）；其它模块换工作台。切模块不丢 `chat-store`、草稿、正在跑的 run。`SecondaryPageMain` 必须 `h-full`；Outlet 外层是 `absolute inset-0 flex flex-col`，禁止只写 `flex-1` 却挂在非 flex 父级上。`wide` / `stage` 用原生 `overflow-y-auto` + 内层 `min-h-full flex flex-col`，**不要** Radix ScrollArea（viewport 内层 inline `display:table` 会盖掉 flex）。列表空态用 `flex-1 min-h-0` 铺满剩余高度。Skills / Media / MCP / Inbox / Observability / Workflows 用 `fill` + `hideChrome`：页内自带顶栏，不要再叠 `SecondaryPageChrome`。工具栏固定，空态与列表吃剩余高度。侧栏项目区在底栏用户卡之上 `flex-1`，无项目虚线框铺满该区。设置 Providers 仍用 `wide`，但空态虚线框同样 `flex-1`，不要按内容收高度。
3. **Changes & Inspector pane** — 可改宽，**默认收起**。四种皮肤同样套在大卡片上。展开后约 38%，最小 280px。始终挂载，切模块不卸掉。**工作台 Panel 不可 collapse 到 0**：加宽审查栏最多把 Stage 压到 42%，切模块若 Stage 被收成缝则拉回 62%。有 dirty 文件且还没开标签时，展开审查栏直接进 Review。承载 Context（只画真实挂载芯片与本轮 sources/tools 状态）、Review（Codex 控制台：7 个作用域含检查点、统计徽标、分支对比、⌘P 跳转文件；**左文件树可拖拽改宽、右单文件满高 diff**；「展开全部差异」才叠 compact 卡片；提交底栏贴底，主按钮走 `text-text-white`；「已提交」作用域才走 devl.dev 多色 SVG 提交时间线；「检查点」列 Enjoy 写盘快照，空态贴顶短文；先 dry-run 未跟踪列表再 Confirm，文案写明不移动 HEAD / 不是分支回退；还原不改用户暂存区；只用真实 Git，不编造 CI/审批/第二车道）、Files、Terminal 与 Browser。macOS 快捷键用 ⌘，同时认 meta/ctrl。

Chat 与 Changes 之间是画布上的 12px 间隙，不是同一张白卡片里的发丝分割线。禁止把两栏融成一块白矩形。禁止第四张大卡片。

Knowledge / Workflows / Media / MCP / Skills / Observability / Inbox / Settings 仍是 **Hash 路由**，全部渲染在 `AppShell` 内换轨。`#/studio` 重定向 `#/`（Studio 不是第二首页）。Automations / Customize / Team / Company / Account / Workspaces 并入 `#/settings/$section`，旧 Hash 保留 redirect。`SecondaryPageShell` 只向情境栏登记导航并画 Stage 主卡片（`article` 760px、`wide` `max-w-5xl`、`stage` 满宽、`fill` 铺满高度），不再自带侧栏或 Studio 面包屑。`#/inbox` 必须用 `fill`：左右分栏时间线 + 阅读器，禁止再在主卡片里套一层圆角列表。Escape 从 Settings / Inbox 回到进入前的工作模块。全局提供 `⌘L` Quick Search。Providers 页必须用 `wide`。实验能力在页面上写明 experimental。`#/mcp` 的 App 只进隔离 iframe，`postMessage` 不在 renderer 执行 RPC。`#/skills` 是唯一 Skills 工作模块（与 MCP 同级）；`#/settings/skills` 与 `#/customize/skills` redirect 到它，禁止第二套技能页。

Composer：运行中输入框不禁用。Stop 与发送互斥：正文、引用 Chip、知识 Chip 或技能 Chip 任一算有草稿才出发送，空草稿运行中才出 Stop。Enter 进 followupQueue；⌘/Ctrl+Enter 纠偏。排队条默认折叠显示数量；展开后有「立即纠偏」（`elevateToSteer` → `agent.steer`）、「编辑」（`editQueuedMessage` 回填正文+引用并聚焦末尾）、上下调序、删除。已 idle 再入队会立刻自启下一轮 `agent.run`；`waiting_review` 不自启。发送 / 纠偏 / 排队成功后清空草稿。步骤树可引用进 Chip。助手气泡底部可挂静态引导词（ActionChip）：未点击保持静默；空闲点击新开一轮并带走输入框已有引用；运行中按 `queue` / `fill_input` 分流。Chip 入队提示可关闭，禁止倒计时自动发。状态必须写在按钮左边（模式或流式 thinkingLabel）；底栏 `+` 打开本机文件选择器（支持多选），经 `assets.import` 排队。Composer 顶栏不要再画「+ 上下文」或「工作区 · 本地」胶囊：附件走底栏 `+` / `@`，工作区名已经在 Composer 下方状态栏。输入框打 `@` 打开工作区文件/目录面板，选中后钉 `QuotedContext`（`workspace.readFile` / `workspace.files` 的真实内容，超长截断并标明 `read_file`）。句首 `/` 打开内置命令 + 已安装技能：`/compact` 立刻走 `session.compact`（不把 `/compact` 发给模型）；`/plan` `/ask` `/agent` `/debug` **各引擎都列**，对照 Codex 切宿主协作模式。Enjoy Local `setMode` 且底栏菜单可见。ACP 没有 `session/set_mode`：仍写入 store，输入框上方画「/plan 规划中」芯片，发送时垫 host-mode 围栏（用户气泡剥掉），禁止再钉 `引用自步骤` 假引用。选中技能变成 Chip，发送时写成「去 `read_file` 该 SKILL.md」指令，不灌正文。ACP `available_commands` 仍只进 ⌘L，禁止画 Composer 假 slash，也没有 `/web`。支持剪贴板图片粘贴（`Ctrl+V`）与文件拖拽（Drag & Drop）；待发送附件采用输入框上方智能层叠托盘（Smart Adaptive Attachment Shelf & Inspector Drawer），将图片（Visual Previews 44px 缩略图、Lightbox 放大、单项 `×`）与文件（Context Files 胶囊、类型图标、文件大小）分区呈现，多附件时自动启用智能折叠（+N 徽标）并提供全景检视抽屉（图片画廊网格 + 双列代码文件矩阵），彻底根除原生滚动条；发送时随 `attachments` 提交并在用户消息气泡中展示已发送资产，刷新后从 `message_parts` 恢复。语音键仅 Enjoy Local 且当前模型 `capabilities` 含 `realtime` 时渲染（ACP 隐藏，不要灰按钮）。打开后采 PCM 帧走 `realtime.sendAudio`，`realtime.text` 写入输入框。底栏 Fast / 五档思考 / 执行模式按 `composerChromeFor(runtimeId)` 显隐：切到 Cursor 等 ACP 只留 `+`、审批、引擎胶囊、发送。助手轮次优先渲染白名单生成式 UI（`card` / `form` / `table` / `source-list` / `asset-preview`）；点选知识引用打开审查。助手生图走 BeUI Image Generation 表面（`packages/ui/components/ai-elements/image-generation/`）：稳定正方形画布、生成中 dither、完成后渐进揭示 +「Image ready」状态行，prompt 取上一轮用户正文；只抄交互，皮是 BoardUI token，不要 registry 默认 `bg-muted` / Lucide。助手视频：复用 BeUI Image Generation 的 dither 加载交互，画布 16:9；状态行「Generating video」/「Video ready」；完成后 `<video controls>`，src=`enjoy-asset://…

助手轮 Thinking：流式占位与思考头用 Beautiful UI Loading State（`packages/ui/components/ai-elements/loading-state.tsx`）——默认 Drive 3×3 点阵 + 流光文案 + `1.4s` / `3m 16.1s` 耗时。工具执行与思考过程统一合并在单一树形导轨（AgentStepTree）中，**按步骤切开**：工具开始时记下 `reasoningChars`，时间线是「思考 → 工具 → 思考」。有工具时思考段默认折叠，标题用首句摘要**单行截断**，禁止把「(N 字符)」和摘要并排；字数只作悬停 `title`，展开后复制原文。ACP/CLI 弱名 `command` 必须按 kind/args 分成 read / edit / bash，禁止五行都显示 `$ command`。连续 2 个及以上同质工具聚合成 monocode 式摘要（`读取 N 个文件` / `编辑 N 个文件` / `运行 N 条命令`），默认折叠，展开后是 Read/Write + 路径 + 类型微标。单项去除重复路径副标题；终端有真实 argv 才展示 `$ cmd`。禁止把 bash 从思考链剥离到外部平铺；工具步骤支持搜索与可点击域名胶囊（`[🌐 wttr.in]`，点开右栏浏览器）、深度阅读（含 `Explored N pages` 折叠子清单），底部挂 Tool Chips 文件变更胶囊（路径名 + 增减行，点选展开右栏审查并选中该文件）。Markdown http(s) 链接同样打开浏览器标签；Ctrl/⌘ 点击仍走系统浏览器。皮走 BoardUI token。
助手轮在 Thinking **折叠外面**挂 File Diff（`thread/tool-surfaces/`）：仅对产生文件差异 (diff) 的代码修改工具进行展示，多文件修改时自动聚合为横向可切换的 `MultiFileDiffTabs`（每个 Tab 展示文件名与增减行，点击实时切换对应文件的 Diff，彻底杜绝平铺刷屏或只能看第一个文件）。终端命令输出保留在思考链内部原位展开，不作为孤儿卡片置于外部。Todo List 不进气泡：只取**最后一条用户消息之后**的 `todo_write`（`latestSessionTodoList`），不要把上一轮已完成的 Rust 任务挂到新 Stripe 轮上。采用对标 Manus 的**输入框层叠控制舱 (Stacked Task Dock)** 结构（`composer/composer-todo-dock.tsx`），左右各内缩 16px 呈现阶梯进深感（Stepped Inset），并采用 Pebble/次级微深底色与纯白输入框拉开明度反差；折叠态展示单行活跃步骤与进度徽标（如 `[✓] 步骤名 | 全部完成  1/4 ⌄`），展开态向上延伸出高密度步骤清单（时钟待办、旋转运行态、绿勾完成态），点击整行顺畅折叠收放。`store.running === false` 时 `in_progress` 显示「已停止」，禁止继续转圈「运行中」；未完成时 Dock 提供「继续」，发送续跑提示。Composer 上方另挂本轮改动条（`composer/session-review/`）：有仍 dirty 的写盘 path、真实 `workspace.changes`、或正在跑时出现。已提交进 HEAD 的 path 必须拿掉。运行中用 `runStartedAt` 画「{模型} 已运行 3分 14秒」，模型名跟 Composer 胶囊同一套（Enjoy Local 档案目录，ACP 用 CLI `selectedModel`），禁止把上一引擎的 `store.modelLabel`（如 deepseek）写到 Grok 审查条。禁止编造起点。文件行用彩色类型微标 + 文件名 + 目录 + 增减。**只有本轮写盘、且 2–6 个文件时默认展开**。空会话藏 SessionReviewBar，改动只留问候下「N 项」芯片进 Inspector。空会话是**开始面**（`empty-session-start.tsx`），不是贴顶清单：`Header → 垂直居中（问候 text-title-1-bold + 一条元数据条 + Composer + 下方命令 pills）`。问候里工作区名走 `text-accent-500`。改动 / 已就绪 / 未安装收成一粒次级胶囊，展开才出下拉名单。禁止口号 / serif / 光晕 Logo / 三等分功能卡。**禁止**把 Composer 放进 `AiChatEmptyState` children；pills 必须在 Composer **下面**。清单卡禁止 `flex-1` `my-auto`。**禁止**把设置 Registry、`AgentCliInstall`、`SkillSourcePullStrip` 或技能源同步条铺进线程区。强调词走 `text-accent-500` 同族字，**禁止 serif 斜体、禁止 `text-3xl font-semibold`**。Composer 底栏控件 `shrink-0 whitespace-nowrap`：宁可整颗换行，禁止把「模式: 智能体 / 编辑 / Fast」挤成两行字或 `编..`。⌘L 必须有 `command.chat` / `command.knowledge`，禁止露出 key 路径。供应商列表只写「密钥已保存」，不要露出后四位。像素宠物只画一只 8×8 小猫 SVG；运行中绝对浮动在审查条**顶边**。走动用 WAAPI 写 `left: calc(100% - 22px)` 满宽来回（16s 一圈），跑道是卡片上 `inset-x-0 w-full`，不读 `offsetWidth`（绝对定位空盒子经常量到 0，猫会钉死在左边）。随机金币，走近起跳从下往上顶。`prefers-reduced-motion` 只放慢，不冻住。任务结束后隐去。右侧并列 Undo All / Keep All / Review（对标 Cursor 单行药丸组）。审查打开右栏 Review。**全部保留**收下磁盘改动并隐藏改动条；**全部撤销**先 ConfirmDialog，再 `workspace.gitRestore`（已跟踪 `git restore --staged --worktree`，未跟踪删除），成功后隐藏改动条。新 run 再出现。`read_file` 整文件不进对话框。右栏 Review 默认仍是完整工作区 diff，提交分段只画真实 `git log`。生成式白名单含 `todo-list`。
审批策略只走 Composer 底栏盾牌（`ApprovalPolicyToggle`），禁止再画上沿「写入 / Shell / Git」一瞥或通栏粉/红条。
审批入口（`thread/approval/`）画在 **PermissionDock**：夹在会话内容与 Composer 之间，贴 Composer 顶边（`chat-composer-cluster.tsx`），禁止钉在 Conversation 顶或写进 `ConversationContent`。按工具分成 AICSS 三种表面，抄交互、皮走 BoardUI：`bash` / `code_mode` / 管道与 ACP 弱名（`command` / `cmd` / `argv`）→ **command**（`args.cwd` 否则工作区 `rootPath` + `$` 命令，主按钮「运行」）；`write_file` / `edit_file` / `git_commit` → **plan**（标题 + 本次入参合成的待办，写盘可展开真实 diff，**禁止** 30s 倒计时自动放行）；`ask_user_questions` → Fluid AskUserQuestions 步进问答（`thread/ask-user/`，数字键、可其它、可跳过，皮走 BoardUI）；其余工具 → **questions**（字母选项 + 参数预览，选完才能「继续」，Skip=拒绝，Always allow 是选项 id 不是底栏第三钮、也不拿译文做相等判断）。MCP 只带 `args.command` 不算 shell。决策仍是 `allow` / `deny` / `allow_session`；提问完成走 `allow` + `answers`，对本工具禁止 `allow_session`。提问卡片不走 `ApprovalChrome` 三钮，标题下仍标明 HMAC。command / plan / questions 底栏保留 HMAC。禁止上架 AICSS / Fluid registry 默认皮。command 图标走 `text-error` / `background-tertiary-error`，不要 `amber-500`。

 ## 不变量

 - 视觉语言只走 BoardUI **语义 token**。禁止生造第二套灰阶，禁止 `text-sm font-medium` 拼字号。
- 严格遵守根目录 `DESIGN.md` 定义的 **8 大命名 Anti-Patterns 禁令**（`Centered-Marketing-Hero`、`Generic-SaaS-Card`、`Invented-Raw-Styles`、`Cramped-Evidence-Table`、`Deconstructed-Typography`、`Viewport-Trapped-Layout`、`Fake-Status-Chrome`、`Unsafe-Native-Dialog`）。
 - 运行时组件：shadcn/ui + AI Elements。不要再装 BoardUI `components/base/*` 做新控件。
- 保留 **ThemeToggle**（点击原点圆形揭示）和 **ComposerLoader**（composer 虹彩描边）。昼/夜与多语言采用标题栏 24px 原生微控件（`h-6`），严格水平对齐窗口控制按钮，禁止在现代标题栏上使用粗糙错位的手绘卡通开关破坏质感。侧栏底栏用户卡片保持轻量 Ghost / 次级态，长邮箱收进弹出面板，严禁在侧栏狭窄区域产生破相硬截断。
 - 产品主标：`AppMark` + `enjoy-ui-kit`（见 `brand` spec）。产品铬图标：`@remixicon/react`。AI 品牌标：`@lobehub/icons`。禁止用 Remix 或字母「E」圆冒充 enjoy 主标。
 - 单一强调色 Signal Blue（`accent-500` / `primary`）。禁止纯黑 `#000000`、禁止 emoji、禁止居中营销 hero。
 - 新控件先搜 shadcn → AI Elements → Beautiful UI / BeUI 等，抄交互再 restyle。禁止原样上架 registry 默认皮。
## 实现分层

| 层 | 来源 | 管什么 |
|---|---|---|
| Tokens | `packages/ui/styles/` | 色、字、圆角、阴影、`.dark` |
| Skins | `packages/ui/styles/skins/` | `classic.css` / `glass.css`，只通过 `html[data-skin]` 覆盖 |
| 基础控件 | `packages/ui/components/ui/` | Button、Dialog、Tabs… |
| Agent 铬 | `packages/ui/components/ai-elements/` | Conversation、Message、PromptInput、Reasoning、Tool、Image Generation、Loading State、Tool Chips |
| 产品屏 | `apps/desktop/.../ai-chat/` | Shell、sidebar、workspace 接线 |

类名合并：`cn()` 或 `cx()`。全屏高度用 `min-h-[100dvh]` / `h-full`，不用 `h-screen`。

`packages/ui` 控件默认文案走 `uiT("中文", "English")`（`packages/ui/i18n/ui-locale.ts`），默认中文；桌面 `I18nProvider` 调 `setUiLocale` 同步。UI 包不引用 `@renderer/i18n`。

## 代码入口

 - 视觉全书：[../references/visual-system.md](../references/visual-system.md)
- 权威设计规约与 Anti-Patterns：[../../DESIGN.md](../../DESIGN.md)
 - BoardUI 短规则：`packages/ui/AGENTS.md`、`apps/desktop/.cursor/rules/boardui.mdc`
- 皮肤 CSS：`packages/ui/styles/skins/`；挂载 `use-theme-skin.ts` + `index.html` 内联 `data-skin`
- 静态设计检查：`apps/desktop/src/renderer/src/lib/design-rules.ts`
- 工作区壳：`apps/desktop/src/renderer/src/components/app-shell/app-shell.tsx`（轨道、情境、Chat 工作台、Inspector）
- Chat 工作台：`app-shell/chat-stage.tsx`；会话树：`ai-chat-sidebar.tsx`；动作 / 仓库树 / 用户与团队卡片：`ai-chat/sidebar/`（会话行 `sidebar-session-row.tsx` + `session-agent-mark.tsx`）
- Composer 底栏显隐：`composer/composer-footer.tsx` 读 `composerChromeFor`（`packages/ipc-contract/src/runtime-capabilities.ts`）
- Composer `@` 文件引用与 `/` 内置命令（compact / plan）+ 技能面板：`ai-chat/composer/mentions/`
- 审批策略：`ai-chat/approval-policy-toggle.tsx`（底栏盾牌）；禁止再挂 `AutoApproveBar`
- Composer 本轮改动条与跳动宠物：`ai-chat/composer/session-review/`
- 来源 / 资产 / 生成式 UI：`apps/desktop/src/renderer/src/components/ai-chat/thread/`
- 审批卡片三表面：`apps/desktop/src/renderer/src/components/ai-chat/thread/approval/`；停靠：`ai-chat/attention/permission-dock.tsx` + `chat-composer-cluster.tsx`（Composer 上沿）
- Attention 条：`ai-chat/attention/attention-strip.tsx` 挂在 `stage-split.tsx` Stage 顶（空则不渲染）
- 向用户提问：`apps/desktop/src/renderer/src/components/ai-chat/thread/ask-user/`
- 对话工具表面：`apps/desktop/.../ai-chat/thread/tool-surfaces/`
- 收件箱：`apps/desktop/src/renderer/src/components/inbox/`（Attention 档案时间线；`openSession` 必须带 `sessionId`）
- 会话空状态（Zero State）：`apps/desktop/src/renderer/src/components/ai-chat/empty-state/`（清单在 `empty-state/checklist/`）；开始面编排在 `app-shell/chat/empty-session-start.tsx`
- 引擎交接：`ai-chat/agent-picker/handoff/`（`EngineHandoffDock` 在 Composer 上沿同宽坞；摘要默认折叠、只进隐藏上下文；pending 锁 Picker；确认后 UI 仅「已交接」微条）
 - 状态栏与 L3 上下文分桶：`apps/desktop/src/renderer/src/components/ai-chat/agent-limits/`（无计划额度条）
- Usage L1/L3/L4：`apps/desktop/src/renderer/src/components/ai-chat/usage/`（`UsagePill` / `SessionMeter` / `QuotaExhaustedCard`）
- UI 包语言：`packages/ui/i18n/ui-locale.ts`

## 已知坑

- 审批卡只挂 PermissionDock（Composer 上沿），禁止写回 `ConversationContent`。M3 阻切「去处理审批」必须走 M2 `focusAttention({ sessionId, kind, navigate })`，不要无参滚 Dock stub，也不要在线程里复制一张卡。
- 不要再画 Composer 上沿「写入自动 · Shell 需确认 · Git 需确认」。它和底栏「编辑」盾牌重复；「模式: 智能体」是执行模式，不是审批。
- Agent Picker：未装 CLI 上轨，状态用中性胶囊「未装」，不要名字底下第二行灰字。点开一键安装，不要再收成「未安装 N」。模型行不要上下两行同名；未装 / 需登录面板不要 `h-[390px]` 空撑。OMP 右栏模型图标按模型族（Claude / Gemini / GPT），禁止用引擎 `omp` 灰圆字母。OMP 的 `google-antigravity` 是供应商，不是模型。OMP「登录」必须是实心按钮；点了要打开浏览器，禁止只回英文 Login started。打开授权页后按钮保持「正在打开授权…」，浏览器成功并写入凭证后左栏才变已登录，不要停在登录按钮。**已装未登录**（含 Claude / Cursor）导轨标「登录」，点开下面板是实心登录，禁止「使用 {name}」空钮；`loggedIn===null` 标「检测」，禁止探测中绿灯。胶囊灯与发送盘只信 `composerSendReady` / `engineReadiness==="ready"`（Enjoy Local 看 `hasKey`）。未就绪发送盘禁止 `from-accent-500` 渐变，点击仍走闸门（开 Picker / 留开始面）。Enjoy Local 无密钥标「密钥」，发送失败留在开始面，禁止自动跳设置。`ACP_AUTH_REQUIRED` 主钮打开 Picker 登录，禁止跳 `#/settings/providers`。设置「设为主引擎」必须走 `requestEngineSwitch`。
- shadcn 的裸 `accent` token 是 **hover 填充**，不是 Signal Blue。交互强调色用 `accent-500` / `primary`。
- 玻璃皮肤看起来仍是实体：画布 `bg-background-full` 不透明时，`backdrop-filter` 卷积纯色 Mist，肉眼无磨砂。光斑层禁止负 z-index（会画到窗口底板后面）。皮肤覆盖必须进 `styles/skins/<name>.css`，不要写回 `globals.css`。`SettingsCard` 必须带 `settings-card` 类，设置页内层卡片才能吃到半透。
- 暗色 + 玻璃：`html[data-skin=glass]` 的深色 ink 比对 `.dark` 更具体，不覆盖就会黑字贴壁纸。`html.dark[data-skin=glass]` 必须重写 `text-*` / `icon-*`。frost 约 58% + 更强 blur，禁止 50% 把桌面当照片，也禁止 80% 把磨砂盖成实心黑。
- 主题存在 `localStorage` 的 `boardui:theme`，不跟随系统。切换时冻住颜色过渡，走圆形揭示。皮肤存在 `boardui:skin`。
- Playwright Electron 窗口流依赖桌面 `out/main/index.js` 与 `playwright` 包。CI 合约测只验收 Stop/Attach 源码与 Hash 路由；没有 launcher 时窗口用例 skip，不要当成已跑通真实聊天。
- 切模块不得卸载 `chat-store` / Inspector：Chat 工作台用 `hidden` 藏起；Inspector 收起走 `Panel.collapse`，不要 `null` 卸掉 `RightPane`。不要把账单、团队、账号放进 48px 轨道。不要把 Agent Studio 当第二首页。`SecondaryPageShell` 禁止再画「返回应用」。Escape 从 Settings/Inbox 回工位时必须尊重 `defaultPrevented` 和 Dialog。
- 点右上角布局钮「没打开」：`react-resizable-panels` 的 `expand()` 回到 collapse 前的百分比。默认收起时 `defaultSize`/`minSize` 写成 `0`，collapse 是 no-op、`expandToSize` 没记下，expand 会落到 `1%` 一条缝。minSize 始终 `280px`，defaultSize 始终 `38%`；展开后若像素仍 `< 280` 再 `resize("38%")`。
- 审查栏「占满」若 `chat` Panel `collapse()` 到 `0px`，Knowledge / Inbox / Chat 会变成空白目的地列表。工作台禁止 collapsible；加宽只 `resize("42%")`。localStorage 分栏若 `chat < 25%` 必须 `sanitizeSplitLayout` 拉回 62/38。切模块只在 Stage 真被收成缝或加宽态时恢复，不要在审查栏默认收起时 `resize(62%)` 把右栏撑开。
- 空会话把 `workspace.changes` 当本轮改动并默认展开，会把 Composer 顶出屏幕。`describeReviewFiles` 区分 `fromLastTurn`；非本轮只出折叠 pill。
- 相邻两条相同用户句：`persistUserTurn` 8 秒内同文跳过；hydrate `dedupeConsecutiveUserTurns` 再收一道。
- ⌘L 缺 `command.knowledge` 会露出 key 路径。中英 catalog 必须同键（`locale.test.ts`）。
- 供应商 `keyHint` 不要拼后四位（`••••ZhTM`）。列表只说「密钥已保存」。
- 禁止在 Inspector 里用 `useLayoutEffect` 调 `panel.expand` / `collapse`：子组件 layout effect 早于 Group 注册，会抛 `Group enjoy-agents-chat-split not found`，整页进错误边界。必须 `useEffect`（paint 之后 Group 已在）。
- Stage 卡片高度塌成内容高、底下露出 Mist：Outlet 外层是 `absolute inset-0`（不是 flex），子级写 `flex-1` 无效。必须 `h-full` 传到 `SecondaryPageMain`，Inbox / MCP / Settings 与 Chat 同一底边。
- 二级页空态不拉高：Radix ScrollArea viewport 内层带 inline `display:table`，Tailwind `flex` 盖不掉，`flex-1` 无效。`wide`/`stage` 必须走原生滚动；工作台（Skills / Media / MCP / Inbox）用 `fill`。侧栏项目空态拆「顶栏 shrink-0 / 列表 flex-1 / 底栏 shrink-0」。
- 侧栏项目行展开只认 `expandedIds`。不要用「当前工作区」强制展开，也不要在 `hydrateWorkspacesAndSessions` 把 current id 写回 `expandedIds`，否则二次点击无法收缩。
- 确认框用应用内 `ConfirmDialog`（shadcn Dialog）。不要 `window.confirm` / Electron 原生框，标题会变成包名 `@enjoy-agents/desktop`。
- Remixicon 4.9 没有 `RiAttachment2Line`（只有 `RiAttachment2` / `RiAttachmentLine`）。命名导出不存在时 Vite ESM 直接抛 SyntaxError，React 还没挂上，窗口标题在、`#root` 空。新图标先对 `@remixicon/react` 的 `index.d.ts`。审批卡片 plan 用已有的 `RiListCheck3`，不要再引入 Lucide `ListTodo`。
- 会话行 Agent 标必须读 `pickSessionRuntime(sessionId, sessionRuntimes, preferred)`。若订阅 `store.runtimeId`，切一次 Composer 引擎，侧栏里每条历史会话都会变成同一个标。未绑定的旧会话才回落偏好。运行中指示器与 Thinking 头共用 `LoadingStateGlyph` `drive`，不要侧栏 wave、内容区 3×3 两套皮。新建会话绑 `store.runtimeId`（当前 Composer），不要绑 `preferredRuntimeId`：打开一条 override 会话后再点新对话，否则会写成旧偏好。
- 审批 command 的 cwd 用 `args.cwd` / `workdir`，否则当前工作区 `rootPath`，不要 `workspaceRootLabel`（那是最后一段文件夹名）。ACP 弱名 `command` + `argv` 必须走 command 表面；禁止「任意工具带 args.command 就当 shell」。questions 选项用稳定 id（`allow_once` / `allow_session`），禁止 `picked === t("chat.alwaysAllow")`。
- 不要 `npx shadcn add` Fluid `ask-user-questions.json`：会带进 `@base-ui/react`、`framer-motion`、Lucide、`bg-card`。只抄步进/数字键/其它输入，皮走 BoardUI。`ask_user_questions` 与审批 questions 不是同一张皮：前者是产品选择题，后者是允许本次/本会话。提问卡片绕开 `ApprovalChrome`，必须自己画 HMAC；数字键把「其它」当下一号并聚焦输入，不要只绑 `options[]`。
- 审批卡片不要原样上架 AICSS registry：禁止 CSS module hex 皮、Lucide、plan 30s Auto Approve。三种表面只抄交互；HMAC 与 `allow_session` 是本产品契约，registry 里没有也要留。
- 用户气泡附件「发过又没了」：模型能描述图片，说明 `attachments` 到了 main；气泡只看 `message.assets`。旧 persist 只写 text，点会话 / 刷新走 `loadSession` 后缩略图消失。列出消息时按导入时间窗补 file part；同会话重灌用内存附件兜底。
- 附件黑框：写了 `border` 却配不存在的 token（如 `border-border-card`）。宽度生效、颜色回落 `currentColor`（正文近黑）。边框只用 `border-border-button-default` / `border-separator-border`。图片外包 `button` 必须 `border-0`，否则 Electron 原生按钮描边也会是黑圈。
- 助手生图预览不要再包一层描边卡片。BeUI 表面本身是 `rounded-2xl` + `bg-background-secondary-default`，再加 `border` 会回到黑框坑。`MessageContent` 是 `w-fit`，生图画布必须给明确宽度（如 `w-80`），否则 `w-full` + `aspect-ratio` 会塌成一条缝。
- 生图轮出现空 Thinking：`ThinkingTrace` 在 `streaming` 时默认展开。imagine 走 `generateImage`，没有 `reasoning.delta` / `tool.*`，时间线就是「No reasoning trace」。有推理或工具才挂 Thinking；媒体轮只挂 Image Generation。不要伪造一条 generateImage 工具调用。
- 生图轮操作条「点了没反应」：赞踩原来没有 onClick；Copy 写空 `message.content`；Extract 见空正文就 return，即便有 handler 也会拿当前 imagine 去跑 `structured-object`。复制要有勾，Extract 要用聊天模型 + prompt 兜底，失败写 `store.error`。
- Extract 灰块像 JSON：`StructuredCard` 的 `card` 变体以前一律 `JSON.stringify`。`title/summary/items` 必须走 Extract 卡片。生图轮不要把 prompt 写成 “assistant reply”，否则模型会输出「这是一句很短的中文」这种元描述。
- Extract 出现两份一样的卡片：`ai.generate` 的 `structured.delta` 进了全局 `applyStreamEvent`。原图轮已不 streaming，`ensureAssistant` 又开一条 `msg_${runId}`，Extract 自己再把卡片写回原消息。旁路 run 只给 `waitForRunOutput` 收，不要另开助手轮；线程里藏掉「上一轮已有 Extract、本轮只有空卡片」的孤儿。
- Composer 先 `setRunning(true)`（`runId` 仍是 null）再等 IPC：这段窗口旁路 Extract / 标题补全会写进乐观 `msg_pending_*`。`running && !runId` 时把事件推进 `pendingStreamEvents`，拿到 composer `runId` 再按 id 过滤回放。`run.end` 必须 `event.runId === store.runId` 才 finalize。
- Stop 以前在 `!runId` 时直接 return，点了没反应；新会话也不清 `running`，空线程会一直画 Thinking 占位，发送被 `store.running` 挡住，草稿留在输入框。Stop 必须先松 UI（不要求 runId、不等 abort IPC）；新建 / 切换会话先 `abortComposerRun`。IPC 返回后若用户已停或已切会话，不得再 `setRunning(true, runId)`，改为 abort 那一轮。

- 思考链不要整段堆在「推理过程」一块再平铺工具。主流做法是按步骤切开；`tool.start` 必须记下当时 reasoning 字数（`ThreadToolCall.reasoningChars`）。旧消息没有该字段时才退回「思考在上、工具在下」。
- 思考折叠头不要把 `({N 字符})` 和摘要并排进 `inline-flex`：标题一长、右侧再挂引用按钮，字数会被挤成「(495 字 / 符)」两行，摘要也换行。折叠头只留单行 truncate 摘要 + 箭头；字数进 `title`。
- 线程占位不要再用 `AgentThinking` infinity，也不要和 Thinking 头上的 `DotMatrixLoader` 叠两套动效。流式走 `LoadingState` / `LoadingStateGlyph`。未接线的 registry 默认皮（`prompt-input` / `reasoning` / `tool` / `shimmer` / `AgentLog`）已删，不要再装回来。`AgentThinking` 仍导出但聊天主路径不用。
- Composer 边框流光（`BorderBeam`）溢色渗底：禁止 `colorVariant="colorful"`（粉/黄污斑）。只用 `ocean` + `theme="auto"`，空闲 `strength=0`。经典皮内层保持实体底；玻璃皮走 `[data-frost=chip]` 半透磨砂，不要再叠一层实心 `bg-background-primary-default`，否则 Composer 会变回白块。
- 错误信息展示必须使用结构化卡片（`ThreadErrorBanner`）：禁止在会话流底部裸露单行无修饰红字。错误卡片必须配备警示图标、明确错误摘要、换行错误原文，并提供「重新生成 (Retry)」、「切换模型」与「关闭」操作。
- 权限模式 (Permission Mode) 开关倒置与高危正则误判：底层 `require*Approval` 为 `false` 时代表自动放行。UI 菜单中的 Switch 必须以 `!require*Approval` 绑定 `checked`，确保选择 `All` 预设时开关处于开启高亮态；`tool-approval` 的 `DANGEROUS_BASH` 正则必须严格匹配管道后紧跟 shell 二进制（`bash|sh|zsh`），严禁泛匹配带 `sh` 的普通单词（如 `wttr.in/Shanghai`），避免合法命令在 All 模式下被误判触发二次审批。
- 执行模式菜单只露智能体 / 规划 / 问答 / 调试（BoardUI token，不要彩虹皮、不要「模式:」前缀）。规划/问答是真只读工具集；调试与智能体同一套写工具。`workflow` / `tdd` / `code_mode` 不进菜单。附件只走底栏「+」（本机选择器 + 插入 `@`）；禁止 Composer 顶栏再画「+ 上下文」或「工作区 · 本地」胶囊：前者和底栏 `+` 重复，后者和状态栏文件夹名重复。禁止 `/web`、禁止把 ACP `available_commands` 画进 Composer 斜杠条。导轨组标题不要再挂 `CLI` 协议副标题。
- Context 检查器禁止 Fake-Status-Chrome：不要写死 AGENTS.md / RAG / MCP 芯片，也不要把每条工具标成完成。芯片来自会话挂载；工具状态跟 `ToolCallState`。
- Composer Todo Dock 不要扫整段会话最后一次 `todo_write`：新用户轮发出后上一轮「Rust login logic 2/2」会一直挂着，直到本轮再写出表。必须只看最后一条**非续跑**用户消息之后的 tools。「继续完成未完成的内容」这类续跑句不能当新任务边界，否则切模型 / 报 `No output generated` 后 Dock 会消失。续跑走 `continueTodoTurn`，`persistUser: false`，不要 `setComposer` 插气泡，也不要落库用户句。折叠 Dock 也要能点「继续」。`in_progress` 只在 `store.running` 时转圈；跑完没再 `todo_write` 要显示「已停止」，否则像会话卡死。
- 像素猫钉在改动条左上角：曾经用 rAF 读绝对定位空跑道的 `offsetWidth`，量为 0 时 `stepRunner` 每帧把 x 锁回左边。走动只准 WAAPI 写 `left: calc(100% - 22px)`，跑道必须是卡片上 `inset-x-0 w-full`，禁止再量空绝对盒子。`prefers-reduced-motion` 只放慢，禁止 `animation: none`。
- Composer `@` 必须 `workspace.readFile` / `workspace.files` 收成 `QuotedContext`，禁止只钉文件名空 Chip。浮层挂 `document.body`，禁止被 Composer / BorderBeam 裁成一条 Chip。用户气泡用 `splitQuotedDisplay` 只画文件 Chip + 用户正文，禁止把 `> [引用自文件:` 协议块渲进气泡。`/` 面板按内置 / 工作区 / 个人分组，行是强调色 Remix 图标 + 深色 `/名` + 一句说明 + 来源胶囊：命令名 `text-body-2-semibold text-text-primary`，`/` 与图标走 `accent-500`，内置胶囊 `bg-accent-500/10 text-accent-600`，说明用 `text-text-secondary`，选中行 `bg-accent-500/10`。禁止整列 `text-text-tertiary` 发灰。不要再把 `/` 写两遍、也不要把「个人」甩到行尾留一片空。`/compact` 与 `/plan` `/ask` `/agent` `/debug` 始终列在「内置」（Grok 等 ACP 也要看见）。`/compact` 立刻压缩本会话 SQLite 历史（`session.compact`），不要把该词发给模型。`/plan` 对照 Codex 切宿主协作模式：`setMode` + ACP 每轮 Prompt 围栏 + 「规划中」芯片。禁止再钉 `引用自步骤` 假引用（模型会当成引用、声称仍是 Normal），也禁止 `session/set_mode`，不要把 Grok 规划画成 Enjoy 只读工具集。禁止把 ACP `available_commands` 或网页搜索画进面板（那些进 ⌘L）。
- 运行中不要禁用 Composer 输入框。Stop 与发送不能同时出现：正文 / 引用 Chip / 知识 Chip / 技能 Chip 任一算有草稿只出发送（运行中点了是排队），空草稿才出 Stop。排队条必须有「立即纠偏」（steer）和「编辑」（回填正文与引用、光标到末尾），并支持调序。禁止再用「引导」称呼纠偏，以免和消息底 ActionChip 混淆。⌘/Ctrl+Enter 纠偏。引用 Chip 与知识 Chip 分开，发送时引用块拼在正文前。排队自启必须订阅 `followupQueue`：只听 `running` 边沿时，已 idle 再入队会卡住；`pendingApproval` 时不要取队。发送 / 纠偏 / 排队成功后必须清空草稿，否则同一句会再发一次。ActionChip 禁止倒计时自动发送；点击分流见 `action-chip-intent.ts`。发送钮用 `text-text-white`，不要裸 `text-white`。
- 审查条「{模型} 已运行」必须走 `composerActiveModelLabel`：ACP 读 CLI `selectedModel`。`store.modelLabel` 是 Enjoy Local 档案目录，切到 Grok 后仍可能是 deepseek-v4-flash，写上去就是假的。
- Composer 本轮改动条不要常驻空边框。有写盘 path 时优先列本轮**仍 dirty** 的文件；停跑后已提交进 HEAD、不在 `workspace.changes` 的 path 必须拿掉，禁止继续显示「N 个文件」。本轮都已提交则回落其余未提交；都干净则藏条（除非还在跑）。审查栏 `gitCommit` 必须 invalidate `["changes", workspaceId]`，不要写成不存在的 `workspace-changes`。没有则用真实 `workspace.changes`。右侧 Undo All / Keep All / Review 药丸组对标 Cursor：Review 实心底（`bg-accent-500 text-text-white`）、无眼睛图标。审查打开右栏 Review；文件行才点选具体 path。全部保留只收起改动条；全部撤销必须走 ConfirmDialog + `workspace.gitRestore`，成功后收起。禁止 `window.confirm`。词表 `sessionReview*` 必须走 `t()`。点「审查」或文件行必须打开右栏并列出**同一批文件**。CLI 抽不出上一轮 path 时条会退回 `workspace.changes`，审查作用域要切到「未提交」，禁止锁死空的「上一轮」。选中 path 用后缀对齐 Git 行。像素猫用 WAAPI 写 `left: calc(100% - 22px)` 沿审查条顶边满宽来回（16s 一圈），随机金币走近才起跳，平地走过不能吃。禁止 rAF 读空绝对跑道的 `offsetWidth`（量为 0 会钉死在左边）。`prefers-reduced-motion` 只放慢，禁止 `animation: none`。Keep/Undo 后即使仍在跑也按 `sessionReviewDismissedKey` 藏条；新 run `setRunning(true)` 才清 key。无文件时禁用 Keep/Undo，避免 `n: 0` 空确认。`gitRestore` 对不上 porcelain 抛 `RESTORE_NOTHING_MATCHED`，禁止 `{ok:true}` 空转后藏条。
- 思考树 `exploredPages` 必须写进 node，域名胶囊点 `openBrowserUrl`。步骤图标用 Remix，禁止 emoji。ACP 工具 title=`command` 是弱名，判定顺序：`argv` / `command` / `cmd` 当 bash，有 content/diff 当 edit，有 path/locations 当 read。禁止把读写全部画成 `$ command`，也禁止用 stdout 正文猜 `package.json` / `layout.tsx`。批量只聚合同质 kind（读取不和搜索混批）。批量标题对标 monocode：`读取 N 个文件` / `编辑 N 个文件` / `运行 N 条命令`，默认折叠，展开才列路径。终端有真实 `command`/`cmd`/`argv` 才展示 `$ cmd`。
- 改动条文件行的彩色类型微标走 `FileTypeIcon`，不要换成 `FileKindIcon` 字母标。`FileTypeIcon` 扩展名色板与金币 SVG 是像素资产色（写在组件色表 / `session-mascot.css`），不是语义 token，不要改成 `accent-500`。单文件行也要带目录。
- 会话「没做完任务就停」通常不是崩溃：ToolLoop 在模型不再调工具时就会 `run.end`。Grok 常 glob/read 之后写一段计划文字收工，Todo 停在 `in_progress`。main 对未完成 Todo 同 run 最多再泵 2 次；用尽后 Dock 出「继续」。
- File Diff / Tool Result / Todo List 必须挂在 Thinking 折叠外面。跑完后 `isTraceExpanded` 为 false，埋进步骤树会随思考一起消失。`ToolResultView` 只给助手轮工具表面用，不要再当死代码。
- 同目录不要同时放 `foo.ts` 和 `foo.tsx`。TS/Vite 解析 `from "./foo"` 会打到 `.ts`，`.tsx` 的组件导出丢失，窗口白屏或起不来。选择器和组件要不同文件名（如 `select-turn-tool-surfaces.ts` + `turn-tool-surfaces.tsx`）。
- 卡片光学投影必须采用多层漫射配置：浅色与暗色模式分别通过 `--shadow-card` 与 `--shadow-sidebar` 控制，暗色依靠 1px 外围与内边缘反射营造微高光切边（Specular Rim），禁止手写野生裸 hex 边框。
- 轨道按钮与次级卡片必须提供物理级触觉回弹（`active:scale-[0.98]` 或 `active:scale-90`）与流畅的时间过渡（`transition-all duration-200`），避免状态突变造成视觉卡顿。
- 标题栏辅助开关高度必须严格锁定为 24px（`size-6` / `h-6`）：与系统窗口控制按钮保持垂直居中和基线对齐，严禁使用超出 24px 的拟物卡通开关。
- 侧栏情境栏底栏用户卡片严禁硬编码过长字符串：212px 容器内文本空间极小，长邮箱（超过 15 字符）必须在侧栏卡片上优雅收敛或展示工作区标签，完整邮箱与账号操作统一在 265px 悬浮弹层（AriaPopover）中展示。
- Composer 智能体动力选择器采用双层流式 HUD（`AgentPicker`）：触发胶囊只写品牌 + `引擎 · 模型` + 就绪微灯（完整引擎名，模型可省略号；供应商只进左栏 / `title`）。**禁止**常驻协议/路径微标（`本地 ToolLoop` / `ACP · 订阅登录` / `ACP Stdio` 及同类）。`quota=true` 且有官方数字时才旁挂 `UsagePill`。空会话 pill 一律 `quiet`（含 ≥85%）；有消息才走 M1 ≥85% 警报。百分比只信 inspect，禁止假 100%。浮层必须「顶部分组导轨 (`AgentEngineRail`)：本地 vs 本机助手/CLI + 下层自适应动力面板」。已装与未装 CLI 都上轨；未装点开一键安装。即将推进「即将推出 N」。Enjoy 本地模型行 `label===id` 不画第二行。OMP 左栏列全部可登录供应商（已登录在前，未登录点授权），不要等两家模型前缀才分栏。未装/即将推出面板用 `max-h-[390px]`，不要锁死 390 高空盒。导轨项只画品牌、引擎名、中性就绪胶囊（未装/需登录/即将）与当前就绪灯，不是协议标签；进阶沙箱禁止上轨。底栏按 `composerChromeFor` 隐藏 ACP 不支持的 Fast / 思考 / 模式 / 语音，并挂 L3 `SessionMeter`（无用量隐藏）。
- 空态 `MissingRow` 不要嵌 `AgentCliInstall` 整卡，也不要把设置 Registry 铺进线程。缺口行只留品牌+名+一个 CTA。已检测 / 未安装只做问候下的一行折叠，有就绪时未安装默认收起，禁止两张描边卡把空会话做成安装目录。Composer 不能当 empty-state children；空会话走开始面（问候 → Composer → pills），有消息才钉底。卡片 `h-auto`。
- 空会话禁止 `SkillSourcePullStrip` / 技能源同步条。M6 可选更新只进 `#/skills` 顶栏与 `#/settings/agent?tab=defaults`；合 #10 时不得把空会话条或 children 插槽加回来。
- 设置智能体页禁止 Fake-Status-Chrome：已删 `AgentToolsHubMetrics`。本机 CLI 先密表后「能力说明」；矩阵/边界默认收起，是证据表不是营销 Hero。顶条是一行可关提示，不是黄 Hero。表行 1:1 [`previews/local-cli-dense-p0.html`](../previews/local-cli-dense-p0.html)：三列密布局、同构动力源、版本·短路径次行、定宽操作槽、无列表额度/协议脚注。`dense-v2` 已废为 stub。配置抽屉 380px 同壳。「运行偏好」只暴露 `LAUNCH_PREFS` 里该 CLI 真正认的旗标。
- L4 额度耗尽走 `QuotaExhaustedCard`，不要并进泛化 `rate limit` 红条。禁止 `Math.max(%,2)` 假填充与遥测伪造 5 小时/周度条。
- 发送被拦：`NEED_CLI_INSPECTING` 标题走 `chat.agentInspecting`，主钮「重试检测」，禁止写成「还没登录」。`NEED_CLI_LOGIN` 才开 Picker。`HANDOFF_CONFIRM_FAILED` 走词表，不要静默。
