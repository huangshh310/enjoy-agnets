/**
 * 当前模型与模式底栏。
 */
import { RiCommandLine, RiCpuLine } from "@remixicon/react"
import { formatTokens, MODEL_CONTEXT_LIMITS } from "../../../agent-limits/agent-limits-calculator"

export function InspectorRuntimeBar({
  modelId,
  modelLabel,
  mode
}: {
  modelId: string
  modelLabel: string
  mode: string
}) {
  const cap = MODEL_CONTEXT_LIMITS[modelId] ?? 200_000

  return (
    <section className="mt-auto flex items-center justify-between gap-2 rounded-xl border border-separator-border/60 bg-background-secondary-default/20 px-3 py-2 font-mono text-caption-2-regular">
      <div className="flex min-w-0 items-center gap-1.5">
        <RiCpuLine className="size-3.5 shrink-0 text-accent-500" />
        <span className="truncate font-semibold text-text-primary" title={modelId}>
          {modelLabel || modelId}
        </span>
        <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-caption-2-regular text-text-tertiary">
          {formatTokens(cap)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-text-secondary">
        <RiCommandLine className="size-3 text-text-tertiary" />
        <span className="capitalize">{mode}</span>
      </div>
    </section>
  )
}
