/**
 * Stop 只松 UI、收审批槽；工单只信 main 随后推来的 turn。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { workflowAfterStreamEvent } from "../components/ai-chat/review-gate/review-gate-phase.ts"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "composer-run-control.ts"), "utf8")

test("Stop 不算本地 decideTurnOutcome，不抢先改工单", () => {
  assert.equal(src.includes("decideTurnOutcome"), false)
  assert.equal(src.includes("applyLocalSessionWorkflow"), false)
  assert.ok(src.includes("resolveSessionDecisions"))
})

test("omitComplete 认 stopped，不当已完成", async () => {
  const { omitCompleteFromTurn } = await import("../components/ai-chat/review-gate/turn-from-event.ts")
  assert.equal(
    omitCompleteFromTurn(
      { type: "run.error", runId: "r", message: "Aborted by user.", turn: { workflow: "needs_review", attention: "stopped" } },
      false
    ),
    true
  )
})

test("Stop 之后 main 的 turn.workflow 原样落地", () => {
  assert.equal(
    workflowAfterStreamEvent("run.error", {
      turn: { workflow: "todo", attention: "neutral" }
    }),
    "todo"
  )
  assert.equal(
    workflowAfterStreamEvent("run.error", {
      turn: { workflow: "needs_review", attention: "neutral" }
    }),
    "needs_review"
  )
})
