import assert from "node:assert/strict"
import { test } from "node:test"
import { droppedTerminalSettle } from "./settle-dropped-terminal.ts"

test("丢掉的 run.end / run.error 抽出 settle 兜底", () => {
  assert.deepEqual(droppedTerminalSettle({ type: "run.end", runId: "run_1" }), {
    runId: "run_1",
    status: "end",
    summary: ""
  })
  assert.deepEqual(
    droppedTerminalSettle({ type: "run.error", runId: "run_2", message: "boom" }),
    { runId: "run_2", status: "error", summary: "boom" }
  )
})

test("非终态或没有 runId 不兜底", () => {
  assert.equal(droppedTerminalSettle({ type: "text.delta", runId: "run_1", text: "hi" }), null)
  assert.equal(droppedTerminalSettle({ type: "run.end" }), null)
  assert.equal(droppedTerminalSettle(null), null)
})
