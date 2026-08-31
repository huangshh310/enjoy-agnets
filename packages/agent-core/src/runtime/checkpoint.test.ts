import assert from "node:assert/strict"
import { test } from "node:test"
import { isWorkflowCheckpoint, parseGenerationCheckpoint, snapshotGeneration } from "./checkpoint.ts"

test("snapshot 不含 runtimeContext，parse 能还原 kind", () => {
  const raw = snapshotGeneration({
    kind: "text",
    sessionId: "ses_1",
    modelId: "stub",
    prompt: "hi",
    runtimeContext: { secret: "no" }
  })
  const parsed = parseGenerationCheckpoint(raw)
  assert.equal(parsed?.request.kind, "text")
  assert.equal(parsed?.request.prompt, "hi")
  assert.equal("runtimeContext" in (parsed?.request ?? {}), false)
})

test("workflow 形态的 checkpoint 不会被当成 generation", () => {
  assert.equal(isWorkflowCheckpoint(JSON.stringify({ stepIndex: 1, title: "x" })), true)
  assert.equal(isWorkflowCheckpoint(snapshotGeneration({ kind: "agent", sessionId: "s", modelId: "m" })), false)
  assert.equal(parseGenerationCheckpoint(JSON.stringify({ stepIndex: 0 })), null)
})
