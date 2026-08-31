# spec/ui

> 三张浮在 Mist 画布上的卡片，不是营销落地页。最后更新：2026-09-01

## 当前真相

窗口画布是 `background/full`（Mist `#F7F7F7` / 暗色 Off-Black `#121212`）。主工作区三张 24px 圆角卡片、12px 窗内边距、卡片间隙 `gap-3`：

1. **Agent rail** — 260px（折叠 60px），Mist，`shadow-sidebar`
2. **Chat stage** — flex，白/石墨，`shadow-card`，含线程 + pill composer
3. **Changes pane** — 可改宽，白/石墨，`shadow-card`，默认约 38%，最小 280px。Files 子视图左树右预览，中间可拖拽改树宽并持久化。

Chat 与 Changes 之间是画布上的 12px 间隙，不是同一张白卡片里的发丝分割线。禁止把两栏融成一块白矩形。

设置 / Agent Studio / Automations / Customize / Knowledge / Workflows / Media / MCP / Observability 是 **Hash 路由**，不是 modal。Agent Studio (`#/studio`) 采用高密度非对称 Bento 网格微件（Density 6, Variance 5），左侧常驻 Agent rail，右侧承载资产与编排中枢。所有二级页用 `SecondaryPageShell`（具名变体：`article` 760px、`wide` `max-w-5xl`、`stage` 满宽）并在顶部提供 `Agent Studio > [Page]` 面包屑。全局提供 `⌘L` Quick Search 命令直达面板。Providers 页必须用 `wide`。实验能力在页面上写明 experimental。`#/mcp` 的 App 只进隔离 iframe，`postMessage` 不在 renderer 执行 RPC。

Composer：运行中发送键变成 Stop（`agent.abort`）；Context 打开本机文件选择器（支持多选），经 `assets.import` 排队。支持剪贴板图片粘贴（`Ctrl+V`）与文件拖拽（Drag & Drop）；待发送队列中图片展示 48px 缩略图、点击后 Dialog 放大预览、非图片展示文件胶囊，均支持单项移除（`×`）；发送时随 `attachments` 提交并在用户消息气泡中展示已发送资产，刷新后从 `message_parts` 恢复。语音键仅在当前模型 `capabilities` 含 `realtime` 时可点；打开后采 PCM 帧走 `realtime.sendAudio`，`realtime.text` 写入输入框。助手轮次优先渲染白名单生成式 UI（`card` / `form` / `table` / `source-list` / `asset-preview`）；点选知识引用打开 Files。助手生图走 BeUI Image Generation 表面（`packages/ui/components/ai-elements/image-generation/`）：稳定正方形画布、生成中 dither、完成后渐进揭示 +「Image ready」状态行，prompt 取上一轮用户正文；只抄交互，皮是 BoardUI token，不要 registry 默认 `bg-muted` / Lucide。Thinking / Tool 只服务 Agent ToolLoop（`reasoning.delta` / `tool.*`）；`generateImage` 没有思考链也没有工具调用，不要画空的「Thinking / No reasoning trace」，进度只看 Image Generation 状态行。用户气泡附件仍是缩略图 / 文件胶囊，点图 Dialog 放大。Extract 走 `useObject` 抽结构化卡片。不把引用整篇塞进正文。

## 不变量

- 视觉语言只走 BoardUI **语义 token**。禁止生造第二套灰阶，禁止 `text-sm font-medium` 拼字号。
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
| Agent 铬 | `packages/ui/components/ai-elements/` | Conversation、Message、PromptInput、Reasoning、Tool、Image Generation |
| 产品屏 | `apps/desktop/.../ai-chat/` | Shell、sidebar、workspace 接线 |

类名合并：`cn()` 或 `cx()`。全屏高度用 `min-h-[100dvh]` / `h-full`，不用 `h-screen`。

## 代码入口

- 视觉全书：[../references/visual-system.md](../references/visual-system.md)
- BoardUI 短规则：`packages/ui/AGENTS.md`、`apps/desktop/.cursor/rules/boardui.mdc`
- 工作区壳：`apps/desktop/src/renderer/src/components/ai-chat/ai-chat-shell.tsx`
- 侧栏：`ai-chat-sidebar.tsx`；动作 / 仓库树：`ai-chat/sidebar/`
- 来源 / 资产 / 生成式 UI：`apps/desktop/src/renderer/src/components/ai-chat/thread/`

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
