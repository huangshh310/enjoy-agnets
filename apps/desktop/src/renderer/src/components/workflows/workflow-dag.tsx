/**
 * Workflow dependsOn 分层图：从左到右画层，不是可拖拽画布。
 * 不从 agent-core 主入口导入，避免把 Node 工具打进 renderer。
 */
import type { WorkflowStep } from "@enjoy-agents/ipc-contract"

type DagNode = { id: string; label: string; status: string; dependsOn?: string[] }

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
  if (steps.length === 0) return null
  const layers = layerSteps(
    steps.map((step) => ({
      id: step.id,
      label: step.label,
      status: step.status,
      dependsOn: step.dependsOn
    }))
  )
  return (
    <div className="flex items-stretch gap-3 overflow-x-auto py-1" data-testid="workflow-dag">
      {layers.map((layer, index) => (
        <div key={layer.map((step) => step.id).join("-")} className="flex items-center gap-3">
          {index > 0 ? (
            <span className="text-title-3-medium text-text-tertiary" aria-hidden>
              →
            </span>
          ) : null}
          <div className="flex flex-col gap-2">
            {layer.map((step) => (
              <div
                key={step.id}
                className="min-w-28 rounded-2xl border border-border-button-default px-3 py-2"
              >
                <p className="text-body-medium text-text-primary">{step.label}</p>
                <p className="text-caption-1-medium text-text-tertiary">{step.status}</p>
                {step.dependsOn?.length ? (
                  <p className="text-caption-1-medium text-text-tertiary">
                    after {step.dependsOn.join(", ")}
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
