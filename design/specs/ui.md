# spec/ui

> 三张浮在 Mist 画布上的卡片，不是营销落地页。最后更新：2026-09-02

## 当前真相

窗口画布是 `background/full`（Mist `#F7F7F7` / 暗色 Off-Black `#121212`）。主工作区三张 24px 圆角卡片、12px 窗内边距、卡片间隙 `gap-3`：

1. **Agent rail** — 260px（折叠 60px），Mist，`shadow-sidebar`
2. **Chat stage** — flex，白/石墨，`shadow-card`，含会话空状态（Centered Hero Zero State，包含环境微光晕 Ambient Glow、工程问候大标题、居中 Composer 输入卡片与快捷 Action Chips 胶囊）、历史消息线程与底部 pill composer
3. **Changes pane** — 可改宽，白/石墨，`shadow-card`，**默认收起**。展开后约 38%，最小 280px。Files 子视图左树右预览，中间可拖拽改树宽并持久化。顶栏右侧按钮或快捷键（审查 / 终端 / 浏览器 / 文件）展开。

Chat 与 Changes 之间是画布上的 12px 间隙，不是同一张白卡片里的发丝分割线。禁止把两栏融成一块白矩形。

设置 / Agent Studio / Automations / Customize / Knowledge / Workflows / Media / MCP / Observability 是 **Hash 路由**，不是 modal。Agent Studio (`#/studio`) 采用高密度非对称 Bento 网格微件（Density 6, Variance 5），左侧常驻 Agent rail，右侧承载资产与编排中枢。所有二级页用 `SecondaryPageShell`（具名变体：`article` 760px、`wide` `max-w-5xl`、`stage` 满宽）并在顶部提供 `Agent Studio > [Page]` 面包屑。全局提供 `⌘L` Quick Search 命令直达面板。Providers 页必须用 `wide`。实验能力在页面上写明 experimental。`#/mcp` 的 App 只进隔离 iframe，`postMessage` 不在 renderer 执行 RPC。

Composer：运行中发送键变成 Stop（`agent.abort`）；Context 打开本机文件选择器（支持多选），经 `assets.import` 排队。支持剪贴板图片粘贴（`Ctrl+V`）与文件拖拽（Drag & Drop）；待发送附件采用输入框上方智能层叠托盘（Smart Adaptive Attachment Shelf & Inspector Drawer），将图片（Visual Previews 44px 缩略图、Lightbox 放大、单项 `×`）与文件（Context Files 胶囊、类型图标、文件大小）分区呈现，多附件时自动启用智能折叠（+N 徽标）并提供全景检视抽屉（图片画廊网格 + 双列代码文件矩阵），彻底根除原生滚动条；发送时随 `attachments` 提交并在用户消息气泡中展示已发送资产，刷新后从 `message_parts` 恢复。语音键仅在当前模型 `capabilities` 含 `realtime` 时可点；打开后采 PCM 帧走 `realtime.sendAudio`，`realtime.text` 写入输入框。助手轮次优先渲染白名单生成式 UI（`card` / `form` / `table` / `source-list` / `asset-preview`）；点选知识引用打开 Files。助手生图走 BeUI Image Generation 表面（`packages/ui/components/ai-elements/image-generation/`）：稳定正方形画布、生成中 dither、完成后渐进揭示 +「Image ready」状态行，prompt 取上一轮用户正文；只抄交互，皮是 BoardUI token，不要 registry 默认 `bg-muted` / Lucide。助手视频：复用 BeUI Image Generation 的 dither 加载交互，画布 16:9；状态行「Generating video」/「Video ready」；完成后 `<video controls>`，src=`enjoy-asset://…

助手轮 Thinking：流式占位与思考头用 Beautiful UI Loading State（`packages/ui/components/ai-elements/loading-state.tsx`）——默认 Drive 3×3 点阵 + 流光文案 + `1.4s` / `3m 16.1s` 耗时。工具执行与思考过程统一合并在单一树形导轨（AgentStepTree）中，思考正文作为树上节点支持就地折叠展开（`Reasoning process ▾`），工具步骤支持搜索与可点击域名胶囊（`[🌐 wttr.in]`）、深度阅读（含 `Explored N pages` 折叠子清单）、命令行与代码编辑（支持展开查看完整无截断命令、一键复制、终端执行输出/报错回显与状态码），底部挂 Tool Chips 文件变更胶囊（路径名 + 增减行，点选打开 Files）。皮走 BoardUI token。

 ## 不变量

 - 视觉语言只走 BoardUI **语义 token**。禁止生造第二套灰阶，禁止 `text-sm font-medium` 拼字号。
- 严格遵守根目录 `DESIGN.md` 定义的 **8 大命名 Anti-Patterns 禁令**（`Centered-Marketing-Hero`、`Generic-SaaS-Card`、`Invented-Raw-Styles`、`Cramped-Evidence-Table`、`Deconstructed-Typography`、`Viewport-Trapped-Layout`、`Fake-Status-Chrome`、`Unsafe-Native-Dialog`）。
 - 运行时组件：shadcn/ui + AI Elements。不要再装 BoardUI `components/base/*` 做新控件。
 - 保留 **ThemeToggle**（点击原点圆形揭示）和 **ComposerLoader**（composer 虹彩描边）。
 - 产品主标：`AppMark` + `enjoy-ui-kit`（见 `brand` spec）。产品铬图标：`@remixicon/react`。AI 品牌标：`@lobehub/icons`。禁止用 Remix 或字母「E」圆冒充 enjoy 主标。
 - 单一强调色 Signal Blue（`accent-500` / `primary`）。禁止纯黑 `#000000`、禁止 emoji、禁止居中营销 hero。
 - 新控件先搜 shadcn → AI Elements → Beautiful UI / BeUI 等，抄交互再 restyle。禁止原样上架 registry 默认皮。
## 实现分层

| 层 | 来源 | 管什么 |
|---|---|---|
| Tokens | `packages/ui/styles/` | 色、字、圆角、阴影、`.dark` |
| 基础控件 | `packages/ui/components/ui/` | Button、Dialog、Tabs… |
| Agent 铬 | `packages/ui/components/ai-elements/` | Conversation、Message、PromptInput、Reasoning、Tool、Image Generation、Loading State、Tool Chips |
| 产品屏 | `apps/desktop/.../ai-chat/` | Shell、sidebar、workspace 接线 |

类名合并：`cn()` 或 `cx()`。全屏高度用 `min-h-[100dvh]` / `h-full`，不用 `h-screen`。

`packages/ui` 控件默认文案走 `uiT("中文", "English")`（`packages/ui/i18n/ui-locale.ts`），默认中文；桌面 `I18nProvider` 调 `setUiLocale` 同步。UI 包不引用 `@renderer/i18n`。

## 代码入口

 - 视觉全书：[../references/visual-system.md](../references/visual-system.md)
- 权威设计规约与 Anti-Patterns：[../../DESIGN.md](../../DESIGN.md)
 - BoardUI 短规则：`packages/ui/AGENTS.md`、`apps/desktop/.cursor/rules/boardui.mdc`
- 静态设计检查：`apps/desktop/src/renderer/src/lib/design-rules.ts`
- 工作区壳：`apps/desktop/src/renderer/src/components/ai-chat/ai-chat-shell.tsx`
- 侧栏：`ai-chat-sidebar.tsx`；动作 / 仓库树 / 用户与团队卡片：`ai-chat/sidebar/`
- 来源 / 资产 / 生成式 UI：`apps/desktop/src/renderer/src/components/ai-chat/thread/`
 - 会话空状态（Zero State）：`apps/desktop/src/renderer/src/components/ai-chat/empty-state/`
 - 状态栏与 Agent Limits 卡片（Token 分桶与速率限制）：`apps/desktop/src/renderer/src/components/ai-chat/agent-limits/`
- UI 包语言：`packages/ui/i18n/ui-locale.ts`

## 已知坑

- shadcn 的裸 `accent` token 是 **hover 填充**，不是 Signal Blue。交互强调色用 `accent-500` / `primary`。
- 主题存在 `localStorage` 的 `boardui:theme`，不跟随系统。切换时冻住颜色过渡，走圆形揭示。
- Playwright Electron 窗口流依赖桌面 `out/main/index.js` 与 `playwright` 包。CI 合约测只验收 Stop/Attach 源码与 Hash 路由；没有 launcher 时窗口用例 skip，不要当成已跑通真实聊天。
- 侧栏项目行展开只认 `expandedIds`。不要用「当前工作区」强制展开，也不要在 `hydrateWorkspacesAndSessions` 把 current id 写回 `expandedIds`，否则二次点击无法收缩。
- 确认框用应用内 `ConfirmDialog`（shadcn Dialog）。不要 `window.confirm` / Electron 原生框，标题会变成包名 `@enjoy-agents/desktop`。
- Remixicon 4.9 没有 `RiAttachment2Line`（只有 `RiAttachment2` / `RiAttachmentLine`）。命名导出不存在时 Vite ESM 直接抛 SyntaxError，React 还没挂上，窗口标题在、`#root` 空。新图标先对 `@remixicon/react` 的 `index.d.ts`。
- 用户气泡附件「发过又没了」：模型能描述图片，说明 `attachments` 到了 main；气泡只看 `message.assets`。旧 persist 只写 text，点会话 / 刷新走 `loadSession` 后缩略图消失。列出消息时按导入时间窗补 file part；同会话重灌用内存附件兜底。
- 附件黑框：写了 `border` 却配不存在的 token（如 `border-border-card`）。宽度生效、颜色回落 `currentColor`（正文近黑）。边框只用 `border-border-button-default` / `border-separator-border`。图片外包 `button` 必须 `border-0`，否则 Electron 原生按钮描边也会是黑圈。
- 助手生图预览不要再包一层描边卡片。BeUI 表面本身是 `rounded-2xl` + `bg-background-secondary-default`，再加 `border` 会回到黑框坑。`MessageContent` 是 `w-fit`，生图画布必须给明确宽度（如 `w-80`），否则 `w-full` + `aspect-ratio` 会塌成一条缝。
- 生图轮出现空 Thinking：`ThinkingTrace` 在 `streaming` 时默认展开。imagine 走 `generateImage`，没有 `reasoning.delta` / `tool.*`，时间线就是「No reasoning trace」。有推理或工具才挂 Thinking；媒体轮只挂 Image Generation。不要伪造一条 generateImage 工具调用。
- 生图轮操作条「点了没反应」：赞踩原来没有 onClick；Copy 写空 `message.content`；Extract 见空正文就 return，即便有 handler 也会拿当前 imagine 去跑 `structured-object`。复制要有勾，Extract 要用聊天模型 + prompt 兜底，失败写 `store.error`。
- Extract 灰块像 JSON：`StructuredCard` 的 `card` 变体以前一律 `JSON.stringify`。`title/summary/items` 必须走 Extract 卡片。生图轮不要把 prompt 写成 “assistant reply”，否则模型会输出「这是一句很短的中文」这种元描述。
- Extract 出现两份一样的卡片：`ai.generate` 的 `structured.delta` 进了全局 `applyStreamEvent`。原图轮已不 streaming，`ensureAssistant` 又开一条 `msg_${runId}`，Extract 自己再把卡片写回原消息。旁路 run 只给 `waitForRunOutput` 收，不要另开助手轮；线程里藏掉「上一轮已有 Extract、本轮只有空卡片」的孤儿。
- Composer 先 `setRunning(true)`（`runId` 仍是 null）再等 IPC：这段窗口旁路 Extract / 标题补全会写进乐观 `msg_pending_*`。`running && !runId` 时把事件推进 `pendingStreamEvents`，拿到 composer `runId` 再按 id 过滤回放。`run.end` 必须 `event.runId === store.runId` 才 finalize。
- Stop 以前在 `!runId` 时直接 return，点了没反应；新会话也不清 `running`，空线程会一直画 Thinking 占位，发送被 `store.running` 挡住，草稿留在输入框。Stop 必须先松 UI（不要求 runId、不等 abort IPC）；新建 / 切换会话先 `abortComposerRun`。IPC 返回后若用户已停或已切会话，不得再 `setRunning(true, runId)`，改为 abort 那一轮。

- 线程占位不要再用 `AgentThinking` infinity，也不要和 Thinking 头上的 `DotMatrixLoader` 叠两套动效。流式走 `LoadingState` / `LoadingStateGlyph`。未接线的 registry 默认皮（`prompt-input` / `reasoning` / `tool` / `shimmer` / `AgentLog`）已删，不要再装回来。`AgentThinking` 仍导出但聊天主路径不用。
- Composer 边框流光（`BorderBeam`）溢色渗底：`BorderBeam` 若配 `colorVariant="colorful"` 会产生粉红/黄色的失真大光斑，且包裹的卡片容器若为半透明（如 `bg-background-tertiary-default/85`），底层的流光伪元素会直接透过卡片正文渗出污色。必须使用 Signal Blue/靛蓝调的 `colorVariant="ocean"`、`theme="auto"`，内层卡片容器保持实体底色（`bg-background-primary-default dark:bg-background-tertiary-default`），且未聚焦/空闲态时 `strength` 设为 0。
- 错误信息展示必须使用结构化卡片（`ThreadErrorBanner`）：禁止在会话流底部裸露单行无修饰红字。错误卡片必须配备警示图标、明确错误摘要、换行错误原文，并提供「重新生成 (Retry)」、「切换模型」与「关闭」操作。
- 权限模式 (Permission Mode) 开关倒置与高危正则误判：底层 `require*Approval` 为 `false` 时代表自动放行。UI 菜单中的 Switch 必须以 `!require*Approval` 绑定 `checked`，确保选择 `All` 预设时开关处于开启高亮态；`tool-approval` 的 `DANGEROUS_BASH` 正则必须严格匹配管道后紧跟 shell 二进制（`bash|sh|zsh`），严禁泛匹配带 `sh` 的普通单词（如 `wttr.in/Shanghai`），避免合法命令在 All 模式下被误判触发二次审批。
- 执行模式 (Execution Mode) 对标 Vercel AI SDK 7 架构：按「AI SDK 7 核心循环」与「专业工程工作流」两组分组呈现，完整支持 `Agent` (ToolLoopAgent)、`Plan` (只读架构蓝图)、`Ask` (只读语义问答)、`Debug` (根因排查修复)、`Workflow` (多阶段流水线)、`TDD` (测试先行循环) 与 `Code Mode` (批量代码脚本)。
