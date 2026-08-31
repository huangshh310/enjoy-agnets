import assert from "node:assert/strict"
import { test } from "node:test"
import { runDurableWorkflow, type WorkflowCheckpoint } from "./workflow.ts"
import { layerWorkflowSteps, orderWorkflowSteps } from "./workflow-graph.ts"

test("workflow 逐步写 checkpoint 并可从中断处恢复", async () => {
  const log: WorkflowCheckpoint[] = []
  let pauseOnce = true
  const steps = [
    { id: "s1", label: "one", run: async () => ({ outputSummary: "1" }) },
    { id: "s2", label: "two", run: async () => ({ outputSummary: "2" }) }
  ]
  const first = await runDurableWorkflow({
    steps,
    persist: async (checkpoint) => {
      log.push(checkpoint)
    },
    shouldPause: () => {
      if (pauseOnce) {
        pauseOnce = false
        return true
      }
      return false
    }
  })
  assert.equal(first.status, "paused")
  const second = await runDurableWorkflow({
    steps,
    resumeFrom: first.lastIndex,
    persist: async (checkpoint) => {
      log.push(checkpoint)
    }
  })
  assert.equal(second.status, "completed")
  assert.ok(log.some((item) => item.status === "paused"))
})

test("dependsOn 按拓扑排序，环则拒绝", () => {
  const ordered = orderWorkflowSteps([
    { id: "b", dependsOn: ["a"] },
    { id: "a" }
  ])
  assert.deepEqual(
    ordered.map((step) => step.id),
    ["a", "b"]
  )
  assert.throws(() => orderWorkflowSteps([{ id: "a", dependsOn: ["b"] }, { id: "b", dependsOn: ["a"] }]), /cycle/i)
})

test("layerWorkflowSteps 把并行依赖排成一层", () => {
  const layers = layerWorkflowSteps([
    { id: "plan" },
    { id: "act", dependsOn: ["plan"] },
    { id: "review", dependsOn: ["plan"] },
    { id: "verify", dependsOn: ["act", "review"] }
  ])
  assert.deepEqual(
    layers.map((layer) => layer.map((step) => step.id)),
    [["plan"], ["act", "review"], ["verify"]]
  )
})
