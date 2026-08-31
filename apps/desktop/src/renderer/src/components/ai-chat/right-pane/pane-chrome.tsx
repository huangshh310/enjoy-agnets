/**
 * 右栏顶栏：已开标签、+ 再开一项、收起。
 */
import { RiAddLine, RiCloseLine, RiContractRightLine } from "@remixicon/react"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { PANE_FOCUS, RIGHT_PANE_TOOLS, toolDef } from "./constants"
import { PaneWidthToggle } from "./pane-width-toggle"
import type { RightPaneKind, RightPaneTab } from "./right-pane.types"

export function RightPaneChrome({
  tabs,
  activeId,
  onSelect,
  onClose,
  onAdd,
  onCollapse,
  maximized,
  onToggleWidth
}: {
  tabs: RightPaneTab[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onAdd: (kind: RightPaneKind) => void
  onCollapse: () => void
  maximized: boolean
  onToggleWidth: () => void
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b border-separator-border px-3">
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((tab) => {
          const def = toolDef(tab.kind)
          const Icon = def.icon
          const selected = tab.id === activeId
          return (
            <div
              key={tab.id}
              className={cx(
                "group flex h-8 max-w-[160px] shrink-0 items-center rounded-2lg pl-2 pr-0.5",
                selected
                  ? "bg-background-secondary-default text-text-primary"
                  : "text-text-secondary"
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                className={cx("flex min-w-0 items-center gap-1.5 rounded-md py-1", PANE_FOCUS)}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate text-caption-1-medium">{def.label}</span>
              </button>
              <button
                type="button"
                aria-label={`Close ${def.label}`}
                onClick={() => onClose(tab.id)}
                className={cx(
                  "rounded-md p-0.5 text-foreground-icon-secondary opacity-0 hover:bg-background-secondary-hover group-hover:opacity-100",
                  PANE_FOCUS
                )}
              >
                <RiCloseLine className="size-3" aria-hidden />
              </button>
            </div>
          )
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <QuietIconButton icon={RiAddLine} aria-label="Open a pane" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {RIGHT_PANE_TOOLS.map((tool) => {
              const Icon = tool.icon
              return (
                <DropdownMenuItem key={tool.kind} onClick={() => onAdd(tool.kind)}>
                  <Icon className="size-4" aria-hidden />
                  <span className="flex-1">{tool.label}</span>
                  <span className="text-caption-1-semibold text-text-tertiary">{tool.shortcut}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <PaneWidthToggle maximized={maximized} onToggle={onToggleWidth} />
      <QuietIconButton icon={RiContractRightLine} aria-label="Collapse changes pane" onClick={onCollapse} />
    </div>
  )
}
