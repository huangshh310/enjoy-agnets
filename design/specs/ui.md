# spec/ui

> 三张浮在 Mist 画布上的卡片，不是营销落地页。最后更新：2026-08-31

## 当前真相

窗口画布是 `background/full`（Mist `#F7F7F7` / 暗色 Off-Black `#121212`）。主工作区三张 24px 圆角卡片、12px 窗内边距、卡片间隙 `gap-3`：

1. **Agent rail** — 260px（折叠 60px），Mist，`shadow-sidebar`
2. **Chat stage** — flex，白/石墨，`shadow-card`，含线程 + pill composer
3. **Changes pane** — 可改宽，白/石墨，`shadow-card`，默认约 38%，最小 280px

Chat 与 Changes 之间是画布上的 12px 间隙，不是同一张白卡片里的发丝分割线。禁止把两栏融成一块白矩形。

设置 / Automations / Customize 是 **Hash 路由**，不是 modal。内容宽度用 `SecondaryPageShell` 具名变体：`article` 760px、`wide` `max-w-5xl`、`stage` 满宽。Providers 页必须用 `wide`。

## 不变量

- 视觉语言只走 BoardUI **语义 token**。禁止生造第二套灰阶，禁止 `text-sm font-medium` 拼字号。
- 运行时组件：shadcn/ui + AI Elements。不要再装 BoardUI `components/base/*` 做新控件。
- 保留 **ThemeToggle**（点击原点圆形揭示）和 **ComposerLoader**（composer 虹彩描边）。
- 产品铬图标：`@remixicon/react`。AI 品牌标：`@lobehub/icons`（经 `ProviderIcon` / `ModelBrandIcon`）。禁止用 Remix 云朵/插头冒充 OpenAI / Claude。
- 单一强调色 Signal Blue（`accent-500` / `primary`）。禁止纯黑 `#000000`、禁止 emoji、禁止居中营销 hero。
- 新控件先搜 shadcn → AI Elements → Beautiful UI / BeUI 等，抄交互再 restyle。禁止原样上架 registry 默认皮。

## 实现分层

| 层 | 来源 | 管什么 |
|---|---|---|
| Tokens | `packages/ui/styles/` | 色、字、圆角、阴影、`.dark` |
| 基础控件 | `packages/ui/components/ui/` | Button、Dialog、Tabs… |
| Agent 铬 | `packages/ui/components/ai-elements/` | Conversation、Message、PromptInput、Reasoning、Tool |
| 产品屏 | `apps/desktop/.../ai-chat/` | Shell、sidebar、workspace 接线 |

类名合并：`cn()` 或 `cx()`。全屏高度用 `min-h-[100dvh]` / `h-full`，不用 `h-screen`。

## 代码入口

- 视觉全书：[../references/visual-system.md](../references/visual-system.md)
- BoardUI 短规则：`packages/ui/AGENTS.md`、`apps/desktop/.cursor/rules/boardui.mdc`
- 工作区壳：`apps/desktop/src/renderer/src/components/ai-chat/ai-chat-shell.tsx`

## 已知坑

- shadcn 的裸 `accent` token 是 **hover 填充**，不是 Signal Blue。交互强调色用 `accent-500` / `primary`。
- 主题存在 `localStorage` 的 `boardui:theme`，不跟随系统。切换时冻住颜色过渡，走圆形揭示。
