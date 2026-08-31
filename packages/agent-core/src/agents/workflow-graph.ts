/**
 * Workflow 步骤拓扑：支持 dependsOn，环则拒绝。
 */
export type WorkflowNode = {
  id: string
  dependsOn?: string[]
}

export function orderWorkflowSteps<T extends WorkflowNode>(steps: T[]): T[] {
  const byId = new Map(steps.map((step) => [step.id, step]))
  const incoming = new Map(steps.map((step) => [step.id, 0]))
  for (const step of steps) {
    for (const dep of step.dependsOn ?? []) {
      if (!byId.has(dep)) throw new Error(`Unknown workflow dependency: ${dep}`)
      incoming.set(step.id, (incoming.get(step.id) ?? 0) + 1)
    }
  }
  const ready = steps.filter((step) => (incoming.get(step.id) ?? 0) === 0)
  const ordered: T[] = []
  while (ready.length > 0) {
    const next = ready.shift()
    if (!next) break
    ordered.push(next)
    enqueueDependents(steps, next.id, incoming, ready)
  }
  if (ordered.length !== steps.length) throw new Error("Workflow has a cycle.")
  return ordered
}

/** 按依赖分层，给 DAG 画布从左到右排。 */
export function layerWorkflowSteps<T extends WorkflowNode>(steps: T[]): T[][] {
  const remaining = new Set(steps.map((step) => step.id))
  const byId = new Map(steps.map((step) => [step.id, step]))
  const layers: T[][] = []
  while (remaining.size > 0) {
    const layer = steps.filter((step) => {
      if (!remaining.has(step.id)) return false
      return (step.dependsOn ?? []).every((dep) => !remaining.has(dep))
    })
    if (layer.length === 0) throw new Error("Workflow has a cycle.")
    layers.push(layer)
    for (const step of layer) remaining.delete(step.id)
  }
  return layers.map((layer) => layer.map((step) => byId.get(step.id)).filter(Boolean) as T[])
}

function enqueueDependents<T extends WorkflowNode>(
  steps: T[],
  doneId: string,
  incoming: Map<string, number>,
  ready: T[]
) {
  for (const step of steps) {
    if (!step.dependsOn?.includes(doneId)) continue
    const left = (incoming.get(step.id) ?? 0) - 1
    incoming.set(step.id, left)
    if (left === 0) ready.push(step)
  }
}
