/**
 * 运行模式胶囊：对标 Vercel AI SDK 7 完整支持的智能体执行模式体系。
 * 涵盖 ToolLoopAgent 核心循环、只读问答/架构蓝图，以及 Workflow/TDD/CodeMode 高阶工程工作流。
 */
import {
  RiArrowDownSLine,
  RiBugLine,
  RiCheckLine,
  RiCommandLine,
  RiCompass3Line,
  RiQuestionLine,
  RiRouteLine,
  RiTerminalBoxLine,
  RiTestTubeLine
} from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import type { AgentMode } from "@enjoy-agents/ipc-contract"

export type ModeCategory = "core" | "engineering"

export interface ModeItemConfig {
  id: AgentMode
  label: string
  desc: string
  badge: string
  category: ModeCategory
  icon: typeof RiTerminalBoxLine
  colorClass: string
  bgClass: string
  iconColor: string
}

export const MODE_ITEMS: ModeItemConfig[] = [
  // ─── 核心智能体循环 (AI SDK 7 Core Loops) ──────────────────────────
  {
    id: "agent",
    label: "Agent",
    desc: "Autonomous coding & tools loop",
    badge: "ToolLoop",
    category: "core",
    icon: RiTerminalBoxLine,
    colorClass: "text-purple-600 dark:text-purple-300",
    bgClass: "bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/15 dark:bg-purple-500/15 dark:border-purple-500/30",
    iconColor: "text-purple-500 dark:text-purple-400"
  },
  {
    id: "plan",
    label: "Plan",
    desc: "Architecture & blueprint planning",
    badge: "Read-Only",
    category: "core",
    icon: RiCompass3Line,
    colorClass: "text-amber-600 dark:text-amber-300",
    bgClass: "bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15 dark:bg-amber-500/15 dark:border-amber-500/30",
    iconColor: "text-amber-500 dark:text-amber-400"
  },
  {
    id: "ask",
    label: "Ask",
    desc: "Pure conversational Q&A & search",
    badge: "Read-Only",
    category: "core",
    icon: RiQuestionLine,
    colorClass: "text-sky-600 dark:text-sky-300",
    bgClass: "bg-sky-500/10 border-sky-500/25 hover:bg-sky-500/15 dark:bg-sky-500/15 dark:border-sky-500/30",
    iconColor: "text-sky-500 dark:text-sky-400"
  },
  {
    id: "debug",
    label: "Debug",
    desc: "Root-cause diagnostics & repair",
    badge: "Diagnostic",
    category: "core",
    icon: RiBugLine,
    colorClass: "text-rose-600 dark:text-rose-300",
    bgClass: "bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/15 dark:bg-rose-500/15 dark:border-rose-500/30",
    iconColor: "text-rose-500 dark:text-rose-400"
  },

  // ─── 专业工程工作流 (Specialized Engineering Workflows) ───────────
  {
    id: "workflow",
    label: "Workflow",
    desc: "Multi-step pipeline orchestration",
    badge: "Pipeline",
    category: "engineering",
    icon: RiRouteLine,
    colorClass: "text-emerald-600 dark:text-emerald-300",
    bgClass: "bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15 dark:bg-emerald-500/15 dark:border-emerald-500/30",
    iconColor: "text-emerald-500 dark:text-emerald-400"
  },
  {
    id: "tdd",
    label: "TDD",
    desc: "Red-Green-Refactor test-first loop",
    badge: "Test-First",
    category: "engineering",
    icon: RiTestTubeLine,
    colorClass: "text-indigo-600 dark:text-indigo-300",
    bgClass: "bg-indigo-500/10 border-indigo-500/25 hover:bg-indigo-500/15 dark:bg-indigo-500/15 dark:border-indigo-500/30",
    iconColor: "text-indigo-500 dark:text-indigo-400"
  },
  {
    id: "code_mode",
    label: "Code Mode",
    desc: "Programmatic batch tool scripting",
    badge: "Scripting",
    category: "engineering",
    icon: RiCommandLine,
    colorClass: "text-cyan-600 dark:text-cyan-300",
    bgClass: "bg-cyan-500/10 border-cyan-500/25 hover:bg-cyan-500/15 dark:bg-cyan-500/15 dark:border-cyan-500/30",
    iconColor: "text-cyan-500 dark:text-cyan-400"
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

  const coreItems = MODE_ITEMS.filter((item) => item.category === "core")
  const engineeringItems = MODE_ITEMS.filter((item) => item.category === "engineering")

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
        className="w-72 rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-dropdown"
      >
        <div className="px-2 pt-1 pb-1.5 text-caption-2-semibold text-text-tertiary uppercase tracking-wider">
          AI SDK 7 Core Modes
        </div>
        {coreItems.map((item) => (
          <ModeMenuItem key={item.id} item={item} selected={mode === item.id} onPick={() => onChange(item.id)} />
        ))}

        <DropdownMenuSeparator className="-mx-1 my-1.5 bg-separator-border" />

        <div className="px-2 pt-1 pb-1.5 text-caption-2-semibold text-text-tertiary uppercase tracking-wider">
          Specialized Workflows
        </div>
        {engineeringItems.map((item) => (
          <ModeMenuItem key={item.id} item={item} selected={mode === item.id} onPick={() => onChange(item.id)} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ModeMenuItem({
  item,
  selected,
  onPick
}: {
  item: ModeItemConfig
  selected: boolean
  onPick: () => void
}) {
  const ItemIcon = item.icon
  return (
    <DropdownMenuItem
      onClick={onPick}
      className={cx(
        "flex items-center justify-between rounded-xl px-2.5 py-2 text-left cursor-pointer transition-colors group",
        selected
          ? "bg-background-secondary-default text-text-primary font-medium"
          : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className={cx("flex size-6 shrink-0 items-center justify-center rounded-lg border mt-0.5", item.bgClass)}>
          <ItemIcon className={cx("size-3.5", item.iconColor)} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-caption-1-medium leading-tight text-text-primary">{item.label}</span>
            <span className="rounded bg-background-secondary-default px-1 py-0.2 text-[10px] font-medium text-text-tertiary group-hover:bg-background-primary-default">
              {item.badge}
            </span>
          </div>
          <span className="text-caption-2-regular text-text-tertiary leading-snug mt-0.5">{item.desc}</span>
        </div>
      </div>
      {selected ? <RiCheckLine className={cx("size-4 shrink-0 ml-1.5", item.iconColor)} /> : null}
    </DropdownMenuItem>
  )
}
