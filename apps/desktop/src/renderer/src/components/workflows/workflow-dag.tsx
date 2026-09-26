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
                    "border-state-success-text/20 bg-state-success-text/[0.04] text-text-primary",
                  step.status === "running" &&
                    "border-accent-500/40 bg-accent-500/[0.06] ring-2 ring-accent-500/20 shadow-sm",
                  step.status === "paused" &&
                    "border-status-yellow-text/20 bg-status-yellow-background/[0.04] text-text-primary",
                  step.status === "waiting_review" &&
                    "border-status-yellow-text/30 bg-status-yellow-background/[0.08] text-status-yellow-text dark:text-status-yellow-text",
                  step.status === "failed" &&
                    "border-border-error-default/20 bg-background-tertiary-error/[0.04] text-text-error-primary dark:text-text-error-primary",
                  step.status !== "completed" &&
                    step.status !== "running" &&
                    step.status !== "paused" &&
                    step.status !== "waiting_review" &&
                    step.status !== "failed" &&
                    "border-border-button-default bg-background-primary-default text-text-secondary"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-caption-2-regular text-text-tertiary">
                    {t("pages.workflows.stepN", { n: step.index + 1 })}
                  </span>
                  <StepIcon status={step.status} />
                </div>

                <p className="mt-1 font-semibold text-body-medium truncate">{step.label}</p>

                <div className="mt-1.5 flex items-center justify-between gap-2 text-caption-2-regular">
                  <span
                    className={cx(
                      "font-medium capitalize",
                      step.status === "completed" && "text-state-success-text dark:text-state-success-text",
                      step.status === "running" && "text-accent-600 dark:text-accent-400 font-semibold",
                      step.status === "paused" && "text-status-yellow-text dark:text-status-yellow-text",
                      step.status === "failed" && "text-text-error-primary dark:text-text-error-primary",
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
                    <span className="font-mono text-caption-2-regular text-text-tertiary">
                      {step.durationMs > 1000
                        ? `${(step.durationMs / 1000).toFixed(1)}s`
                        : `${step.durationMs}ms`}
                    </span>
                  ) : null}
                </div>

                {step.dependsOn?.length ? (
                  <p className="mt-1 text-caption-2-regular text-text-tertiary truncate">
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
    return <RiCheckLine className="size-3.5 text-state-success-text" />
  }
  if (status === "running") {
    return <RiLoader4Line className="size-3.5 text-accent-500 animate-spin" />
  }
  if (status === "waiting_review") {
    return <RiShieldCheckLine className="size-3.5 text-status-yellow-text" />
  }
  if (status === "paused") {
    return <RiPauseCircleLine className="size-3.5 text-status-yellow-text" />
  }
  if (status === "failed") {
    return <RiCloseLine className="size-3.5 text-text-error-primary" />
  }
  return <RiTimeLine className="size-3.5 text-text-tertiary" />
}

