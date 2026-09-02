/**
 * Workflow dependsOn 分层图：从左到右画层，不是可拖拽画布。
 * 不从 agent-core 主入口导入，避免把 Node 工具打进 renderer。
 */
import {
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiPauseCircleLine,
  RiShieldCheckLine,
  RiTimeLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import type { WorkflowStep } from "@enjoy-agents/ipc-contract"
import { useT, type TranslateFn } from "@renderer/i18n"

type DagNode = {
  id: string
  index: number
  label: string
  status: string
  durationMs?: number
  dependsOn?: string[]
}

function layerSteps(steps: DagNode[]): DagNode[][] {
  const remaining = new Set(steps.map((step) => step.id))
  const layers: DagNode[][] = []
  while (remaining.size > 0) {
    const layer = steps.filter((step) => {
      if (!remaining.has(step.id)) return false
      return (step.dependsOn ?? []).every((dep) => !remaining.has(dep))
    })
    if (layer.length === 0) break
    layers.push(layer)
    for (const step of layer) remaining.delete(step.id)
  }
  return layers
}

export function WorkflowDag({ steps }: { steps: WorkflowStep[] }) {
  const t = useT()
  if (steps.length === 0) return null
  const layers = layerSteps(
    steps.map((step) => ({
      id: step.id,
      index: step.index,
      label: step.label,
      status: step.status,
      durationMs: step.durationMs,
      dependsOn: step.dependsOn
    }))
  )

  return (
    <div
      className="flex items-center gap-3.5 overflow-x-auto py-2 px-1"
      data-testid="workflow-dag"
    >
      {layers.map((layer, index) => (
        <div key={layer.map((step) => step.id).join("-")} className="flex items-center gap-3.5">
          {index > 0 ? (
            <div className="flex items-center text-text-tertiary">
              <RiArrowRightLine className="size-4 shrink-0" aria-hidden />
            </div>
          ) : null}

          <div className="flex flex-col gap-2.5">
            {layer.map((step) => (
              <div
                key={step.id}
                className={cx(
                  "min-w-36 rounded-xl border p-3 transition-all shadow-xs",
                  step.status === "completed" &&
                    "border-emerald-500/20 bg-emerald-500/[0.04] text-text-primary",
                  step.status === "running" &&
                    "border-accent-500/40 bg-accent-500/[0.06] ring-2 ring-accent-500/20 shadow-sm",
                  step.status === "paused" &&
                    "border-amber-500/20 bg-amber-500/[0.04] text-text-primary",
                  step.status === "waiting_approval" &&
                    "border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300",
                  step.status === "failed" &&
                    "border-rose-500/20 bg-rose-500/[0.04] text-rose-700 dark:text-rose-300",
                  step.status !== "completed" &&
                    step.status !== "running" &&
                    step.status !== "paused" &&
                    step.status !== "waiting_approval" &&
                    step.status !== "failed" &&
                    "border-border-button-default bg-background-primary-default text-text-secondary"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-text-tertiary">
                    {t("pages.workflows.stepN", { n: step.index + 1 })}
                  </span>
                  <StepIcon status={step.status} />
                </div>

                <p className="mt-1 font-semibold text-body-medium truncate">{step.label}</p>

                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                  <span
                    className={cx(
                      "font-medium capitalize",
                      step.status === "completed" && "text-emerald-600 dark:text-emerald-400",
                      step.status === "running" && "text-accent-600 dark:text-accent-400 font-semibold",
                      step.status === "paused" && "text-amber-600 dark:text-amber-400",
                      step.status === "failed" && "text-rose-600 dark:text-rose-400",
                      step.status !== "completed" &&
                        step.status !== "running" &&
                        step.status !== "paused" &&
                        step.status !== "failed" &&
                        "text-text-tertiary"
                    )}
                  >
                    {stepStatusLabel(step.status, t)}
                  </span>

                  {step.durationMs ? (
                    <span className="font-mono text-[10px] text-text-tertiary">
                      {step.durationMs > 1000
                        ? `${(step.durationMs / 1000).toFixed(1)}s`
                        : `${step.durationMs}ms`}
                    </span>
                  ) : null}
                </div>

                {step.dependsOn?.length ? (
                  <p className="mt-1 text-[10px] text-text-tertiary truncate">
                    {t("pages.workflows.afterDeps", { deps: step.dependsOn.join(", ") })}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function stepStatusLabel(status: string, t: TranslateFn): string {
  if (status === "running") return t("pages.workflows.statusRunning")
  if (status === "completed") return t("pages.workflows.statusCompleted")
  if (status === "paused") return t("pages.workflows.statusPaused")
  if (status === "failed") return t("pages.workflows.statusFailed")
  return status.replace("_", " ")
}

function StepIcon({ status }: { status: string }) {
  if (status === "completed") {
    return <RiCheckLine className="size-3.5 text-emerald-500" />
  }
  if (status === "running") {
    return <RiLoader4Line className="size-3.5 text-accent-500 animate-spin" />
  }
  if (status === "waiting_approval") {
    return <RiShieldCheckLine className="size-3.5 text-amber-500" />
  }
  if (status === "paused") {
    return <RiPauseCircleLine className="size-3.5 text-amber-500" />
  }
  if (status === "failed") {
    return <RiCloseLine className="size-3.5 text-rose-500" />
  }
  return <RiTimeLine className="size-3.5 text-text-tertiary" />
}

