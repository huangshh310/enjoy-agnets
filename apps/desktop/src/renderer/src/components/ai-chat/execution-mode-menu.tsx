/**
 * 运行模式胶囊：输入框与 Settings Defaults 共用同一套多色菜单。
 */
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiCodeSSlashLine,
  RiCompass3Line,
  RiQuestionLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import type { AgentMode } from "@enjoy-agents/ipc-contract"

export const MODE_ITEMS = [
  {
    id: "agent" as const,
    label: "Agent",
    desc: "Autonomous coding & tools",
    icon: RiTerminalBoxLine,
    colorClass: "text-purple-600 dark:text-purple-300",
    bgClass: "bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/15 dark:bg-purple-500/15 dark:border-purple-500/30",
    iconColor: "text-purple-500 dark:text-purple-400"
  },
  {
    id: "ask" as const,
    label: "Ask",
    desc: "Read-only Q&A & search",
    icon: RiQuestionLine,
    colorClass: "text-sky-600 dark:text-sky-300",
    bgClass: "bg-sky-500/10 border-sky-500/25 hover:bg-sky-500/15 dark:bg-sky-500/15 dark:border-sky-500/30",
    iconColor: "text-sky-500 dark:text-sky-400"
  },
  {
    id: "plan" as const,
    label: "Plan",
    desc: "Architecture & planning",
    icon: RiCompass3Line,
    colorClass: "text-amber-600 dark:text-amber-300",
    bgClass: "bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15 dark:bg-amber-500/15 dark:border-amber-500/30",
    iconColor: "text-amber-500 dark:text-amber-400"
  },
  {
    id: "debug" as const,
    label: "Debug",
    desc: "Systematic troubleshooting",
    icon: RiCodeSSlashLine,
    colorClass: "text-rose-600 dark:text-rose-300",
    bgClass: "bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/15 dark:bg-rose-500/15 dark:border-rose-500/30",
    iconColor: "text-rose-500 dark:text-rose-400"
  }
]

export function ExecutionModeMenu({
  mode,
  onChange,
  align = "start"
}: {
  mode: AgentMode
  onChange: (mode: AgentMode) => void
  align?: "start" | "end"
}) {
  const active = MODE_ITEMS.find((item) => item.id === mode) ?? MODE_ITEMS[0]
  const ActiveIcon = active.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Select execution mode"
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption-1-semibold transition-all shadow-2xs outline-none cursor-pointer",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            active.bgClass,
            active.colorClass
          )}
        >
          <ActiveIcon className={cx("size-3.5 shrink-0", active.iconColor)} />
          <span>{active.label}</span>
          <RiArrowDownSLine className="size-3 opacity-60 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={6}
        className="w-56 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-card"
      >
        <div className="px-2 py-1 text-caption-2-semibold text-text-tertiary uppercase tracking-wider">
          Execution Mode
        </div>
        {MODE_ITEMS.map((item) => {
          const ItemIcon = item.icon
          const selected = mode === item.id
          return (
            <DropdownMenuItem
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cx(
                "flex items-center justify-between rounded-xl px-2 py-1.5 text-left cursor-pointer transition-colors",
                selected
                  ? "bg-background-secondary-default text-text-primary font-medium"
                  : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cx("flex size-6 shrink-0 items-center justify-center rounded-lg border", item.bgClass)}>
                  <ItemIcon className={cx("size-3.5", item.iconColor)} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-caption-1-medium leading-tight text-text-primary">{item.label}</span>
                  <span className="text-caption-2-regular text-text-tertiary leading-tight truncate">{item.desc}</span>
                </div>
              </div>
              {selected ? <RiCheckLine className={cx("size-4 shrink-0", item.iconColor)} /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
