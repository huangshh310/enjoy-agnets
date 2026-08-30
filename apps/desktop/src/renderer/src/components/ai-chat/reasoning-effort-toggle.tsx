/**
 * 聊天输入框推理模式/思考强度切换组件 (Reasoning Effort Selector)：
 * 允许用户在对话时针对推理模型快速选择思考深度 (Default, Low, Medium, High, Max)。
 */
import { RiBrainLine, RiCheckLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"

const EFFORT_OPTIONS: Array<{
  id: "low" | "medium" | "high" | "xhigh" | "default"
  label: string
  desc: string
}> = [
  { id: "default", label: "Model Native", desc: "Provider default budget" },
  { id: "low", label: "Low Effort", desc: "Fast & lightweight reasoning" },
  { id: "medium", label: "Medium Effort", desc: "Balanced thinking" },
  { id: "high", label: "Deep Reasoning", desc: "Thorough multi-step problem solving" },
  { id: "xhigh", label: "Maximum Effort", desc: "Exhaustive deep thinking for complex tasks" }
]

export function ReasoningEffortToggle() {
  const reasoningEffort = useChatStore((state) => state.reasoningEffort)
  const setReasoningEffort = useChatStore((state) => state.setReasoningEffort)
  const modelId = useChatStore((state) => state.modelId)
  const models = useChatStore((state) => state.models)

  const currentModel = models.find((m) => m.id === modelId)
  const isReasoningSupported = Boolean(
    currentModel?.supportsReasoning ||
      currentModel?.isReasoning ||
      modelId.toLowerCase().includes("reasoner") ||
      modelId.toLowerCase().includes("r1") ||
      modelId.toLowerCase().startsWith("o1") ||
      modelId.toLowerCase().startsWith("o3")
  )

  if (!isReasoningSupported) return null

  const activeLabel = reasoningEffort
    ? reasoningEffort.charAt(0).toUpperCase() + reasoningEffort.slice(1)
    : "Thinking"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Reasoning Effort"
          className={cx(
            "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium outline-none transition-colors",
            reasoningEffort
              ? "bg-state-success-text/10 text-state-success-text hover:bg-state-success-text/15 ring-1 ring-state-success-text/20"
              : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
          )}
        >
          <RiBrainLine className="size-3.5 text-state-success-text" />
          <span>{activeLabel}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-card"
      >
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold text-text-tertiary">
          Thinking Budget / Reasoning Effort
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="-mx-1 my-1 bg-separator-border" />

        {EFFORT_OPTIONS.map((opt) => {
          const isSelected =
            (opt.id === "default" && !reasoningEffort) ||
            reasoningEffort === opt.id

          return (
            <DropdownMenuItem
              key={opt.id}
              onClick={() =>
                setReasoningEffort(opt.id === "default" ? undefined : opt.id)
              }
              className={cx(
                "flex items-start justify-between rounded-xl px-2.5 py-1.5 cursor-pointer text-left transition-colors",
                isSelected
                  ? "bg-accent-50 text-text-primary dark:bg-accent-950/50"
                  : "hover:bg-background-secondary-hover text-text-secondary hover:text-text-primary"
              )}
            >
              <div className="flex flex-col">
                <span className="text-[12px] font-medium leading-tight">
                  {opt.label}
                </span>
                <span className="text-[10px] text-text-tertiary mt-0.5">
                  {opt.desc}
                </span>
              </div>
              {isSelected ? (
                <RiCheckLine className="size-3.5 text-accent-500 mt-0.5" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
