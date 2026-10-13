/**
 * luna #144 must-fix：命令卡最多 4 行 + 底部渐隐，「展开全部（共 {n} 字）」/「收起」。
 * 展开后命令区最高 40% 会话区（`40cqh`，容器是 chat-stage 主体），超出在命令区内滚；
 * 拒绝 / 运行与 Composer 永远可见。纯视图走 createElement，便于 node --test 渲染。
 *
 * 小窗（窗口高 ≤ 600px，`COMPACT`）：命令区**不压缩**——短命令全显，长命令收起态 2 行、展开态 2 行高区内滚；
 * 「展开全部」紧贴命令区下方；路径行隐藏，标题挪到底栏一行（见 approval-chrome）。
 */
import { createElement as h, type ReactElement } from "react"

export const COMMAND_COLLAPSED_LINES = 4
/** 小窗收起态最少行数（luna #144 v2：长命令至少 2 行）。 */
export const COMMAND_COMPACT_LINES = 2
/** 小窗断点：窗口高 ≤ 600px。Tailwind 任意 media 变体前缀。 */
export const COMPACT = "[@media(max-height:600px)]:"
/** 展开后命令区最高：会话区（chat-stage 主体容器）高度的 40%。 */
export const COMMAND_EXPANDED_MAX_HEIGHT = "40cqh"
/** 首帧还没量到时按字数估计（约 4 行 × 60 字）；量到后以真实溢出为准。 */
const ESTIMATE_CHARS = COMMAND_COLLAPSED_LINES * 60

/** 按 Unicode 码点数，与「共 {n} 字」一致。 */
export function commandCharCount(command: string): number {
  return Array.from(command).length
}

export function commandHardLineCount(command: string): number {
  return command ? command.split("\n").length : 1
}

/** 首帧估计：硬换行超过 4 行，或字数明显超过 4 行宽。 */
export function estimateCommandOverflow(command: string): boolean {
  return commandHardLineCount(command) > COMMAND_COLLAPSED_LINES || commandCharCount(command) > ESTIMATE_CHARS
}

type Translate = (key: string, vars?: Record<string, string | number>) => string

export function commandToggleLabel(expanded: boolean, command: string, t: Translate): string {
  return expanded ? t("chat.commandCollapse") : t("chat.commandExpandAll", { n: commandCharCount(command) })
}

export type CommandBlockView = {
  cwd: string
  command: string
  expanded: boolean
  /** 收起态内容超过 4 行（量出来的或首帧估计）。 */
  overflowing: boolean
  t: Translate
  onToggle?: () => void
  preRef?: (node: HTMLPreElement | null) => void
}

export function renderCommandBlock(view: CommandBlockView): ReactElement {
  const { cwd, command, expanded, overflowing, t } = view
  const collapsed = !expanded
  const showToggle = overflowing || expanded
  // 命令区永不被挤压：shrink-0；收起 4 行，小窗 2 行；展开 40cqh 区内滚。
  const preSize = collapsed
    ? "max-h-[4lh] [@media(max-height:600px)]:max-h-[2lh] overflow-hidden"
    : // 小窗展开也只给 2 行高、区内滚：按钮与命令必须同时可见（luna #144 v2）。
      "max-h-[40cqh] overflow-y-auto [@media(max-height:600px)]:max-h-[2lh]"
  return h(
    "div",
    {
      "data-testid": "approval-command-block",
      className:
        "flex min-w-0 shrink-0 flex-col gap-0.5 rounded-lg bg-background-secondary-default px-3 py-2.5 [@media(max-height:600px)]:gap-0 [@media(max-height:600px)]:py-0.5"
    },
    h(
      "p",
      { className: "truncate font-mono text-caption-2-regular text-text-tertiary [@media(max-height:600px)]:hidden" },
      cwd
    ),
    h(
      "div",
      { className: "relative min-w-0 shrink-0" },
      h(
        "pre",
        {
          ref: view.preRef,
          "data-testid": "approval-command",
          "data-expanded": expanded ? "true" : "false",
          className: `m-0 shrink-0 whitespace-pre-wrap break-all font-mono text-caption-1-regular leading-relaxed text-text-primary ${preSize}`
        },
        h("span", { className: "mr-1.5 select-none text-text-tertiary" }, "$"),
        command || "—"
      ),
      collapsed && overflowing
        ? h("div", {
            "aria-hidden": true,
            "data-testid": "approval-command-fade",
            className:
              "pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background-secondary-default to-transparent"
          })
        : null
    ),
    showToggle
      ? h(
          "button",
          {
            type: "button",
            "data-testid": "approval-command-toggle",
            "aria-expanded": expanded,
            onClick: view.onToggle,
            className:
              "shrink-0 self-start pt-0.5 text-caption-2-medium [@media(max-height:440px)]:hidden [@media(max-height:600px)]:pt-0 [@media(max-height:600px)]:leading-4 text-accent-500 underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
          },
          commandToggleLabel(expanded, command, t)
        )
      : null
  )
}
