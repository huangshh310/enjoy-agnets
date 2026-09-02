/**
 * 右栏空态：列出可打开的工具，点一项再挂内容。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { PANE_FOCUS, getRightPaneTools } from "./constants"
import type { RightPaneKind } from "./right-pane.types"

export function RightPanePicker({ onPick }: { onPick: (kind: RightPaneKind) => void }) {
  const t = useT()
  return (
    <div className="flex flex-1 flex-col justify-center px-8">
      <ul className="mx-auto flex w-full max-w-[280px] flex-col gap-0.5">
        {getRightPaneTools(t).map((tool) => {
          const Icon = tool.icon
          return (
            <li key={tool.kind}>
              <button
                type="button"
                onClick={() => onPick(tool.kind)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-2lg px-3 py-2 text-left",
                  "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
                  PANE_FOCUS
                )}
              >
                <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-body-medium">{tool.label}</span>
                  <span className="block text-caption-1-medium text-text-tertiary">{tool.hint}</span>
                </span>
                <kbd className="shrink-0 text-caption-1-semibold text-text-tertiary">{tool.shortcut}</kbd>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
