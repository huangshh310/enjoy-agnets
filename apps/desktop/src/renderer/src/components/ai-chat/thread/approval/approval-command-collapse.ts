/**
 * luna #144 must-fix：命令卡最多 4 行 + 底部渐隐，「展开全部（共 {n} 字）」/「收起」。
 * 展开后命令区最高 40% 会话区（`40cqh`，容器是 chat-stage 主体），超出在命令区内滚；
 * 拒绝 / 运行与 Composer 永远可见。纯视图走 createElement，便于 node --test 渲染。
 */
import { createElement as h, type ReactElement } from "react"

export const COMMAND_COLLAPSED_LINES = 4
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
  const preStyle = collapsed
    ? { maxHeight: `${COMMAND_COLLAPSED_LINES}lh`, overflow: "hidden" }
    : { maxHeight: COMMAND_EXPANDED_MAX_HEIGHT, overflowY: "auto" as const }
  return h(
    "div",
    { className: "flex min-w-0 flex-col gap-0.5 rounded-lg bg-background-secondary-default px-3 py-2.5" },
    h("p", { className: "truncate font-mono text-caption-2-regular text-text-tertiary" }, cwd),
    h(
      "div",
      { className: "relative min-w-0" },
      h(
        "pre",
        {
          ref: view.preRef,
          "data-testid": "approval-command",
          "data-expanded": expanded ? "true" : "false",
          style: preStyle,
          className:
            "m-0 whitespace-pre-wrap break-all font-mono text-caption-1-regular leading-relaxed text-text-primary"
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
              "self-start pt-0.5 text-caption-2-medium text-accent-500 underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
          },
          commandToggleLabel(expanded, command, t)
        )
      : null
  )
}
