/**
 * CLI 模型行：有族名画 ModelBrandIcon，否则回落引擎标，不要插头。
 */
import type { AgentCliModel } from "@enjoy-agents/ipc-contract"
import { RiCheckLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { CliModelMark } from "./cli-model-mark"

export function CliModelRow({
  agentId,
  model,
  selected,
  onPick,
  fallbackProvider
}: {
  agentId: string
  model: AgentCliModel
  selected: boolean
  onPick: (model: AgentCliModel) => void
  fallbackProvider?: { kind?: string; name?: string; apiStyle?: string }
}) {
  const showId = model.id.trim().toLowerCase() !== model.label.trim().toLowerCase()
  return (
    <button
      type="button"
      title={showId ? `${model.label} · ${model.id}` : model.label}
      onClick={() => onPick(model)}
      className={cx(
        "flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg px-2.5 py-1.5 text-left transition-colors",
        selected
          ? "bg-accent-500/10 text-accent-700 ring-1 ring-accent-500/25 dark:text-accent-300"
          : "text-text-primary hover:bg-background-secondary-hover/70"
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        <CliModelMark agentId={agentId} model={model} fallbackProvider={fallbackProvider} />
      </span>
      <span className="min-w-0 flex-1 truncate text-caption-1-medium">{model.label}</span>
      {selected ? <RiCheckLine className="size-3.5 shrink-0 text-accent-500" /> : null}
    </button>
  )
}
