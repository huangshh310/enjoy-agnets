/**
 * Workflow durable adapter：每步写 checkpoint，支持暂停 / 恢复 / 重试。
 */
import { orderWorkflowSteps } from "./workflow-graph.ts"

export type WorkflowCheckpoint = {
  stepIndex: number
  inputSummary: string
  outputSummary?: string
  status: "running" | "paused" | "completed" | "failed"
}

export type DurableStep = {
  id: string
  label: string
  dependsOn?: string[]
  run: (ctx: { checkpoint?: WorkflowCheckpoint }) => Promise<{ outputSummary: string }>
}

export async function runDurableWorkflow(options: {
  steps: DurableStep[]
  resumeFrom?: number
  persist: (checkpoint: WorkflowCheckpoint) => Promise<void>
  shouldPause?: () => boolean
}): Promise<{ status: "completed" | "paused"; lastIndex: number }> {
  const steps = orderWorkflowSteps(options.steps)
  const start = options.resumeFrom ?? 0
  for (let index = start; index < steps.length; index += 1) {
    const step = steps[index]
    if (!step) continue
    await options.persist({
      stepIndex: index,
      inputSummary: step.label,
      status: "running"
    })
    if (options.shouldPause?.()) {
      await options.persist({
        stepIndex: index,
        inputSummary: step.label,
        status: "paused"
      })
      return { status: "paused", lastIndex: index }
    }
    const result = await step.run({})
    await options.persist({
      stepIndex: index,
      inputSummary: step.label,
      outputSummary: result.outputSummary,
      status: index === steps.length - 1 ? "completed" : "running"
    })
  }
  return { status: "completed", lastIndex: steps.length - 1 }
}
