import assert from "node:assert/strict"
import { test } from "node:test"
import { decideTurnOutcome, sealTurnTools } from "./turn-outcome.ts"
import { isWriteTypeToolName } from "./tool-names.ts"

test("出错 / 用户停：不完成、不进待验收", () => {
  const write = { name: "write_file", state: "output-available" as const }
  assert.deepEqual(decideTurnOutcome({ ended: "error", tools: [write] }), {
    workflow: "in_progress",
    attention: "error"
  })
  assert.deepEqual(decideTurnOutcome({ ended: "abort", tools: [write] }), {
    workflow: "in_progress",
    attention: "error"
  })
})

test("纯聊天 / 只读轮：完成但不进待验收", () => {
  assert.deepEqual(decideTurnOutcome({ ended: "end", tools: [] }), {
    workflow: "todo",
    attention: "complete"
  })
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [{ name: "read_file", state: "output-available" }]
    }),
    { workflow: "todo", attention: "complete" }
  )
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [{ name: "todo_write", state: "output-available" }]
    }),
    { workflow: "todo", attention: "complete" }
  )
})

test("全拒绝或从未发出：中性、不进待验收", () => {
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [{ name: "write_file", state: "output-denied", errorText: "已拒绝，本次未执行" }]
    }),
    { workflow: "todo", attention: "neutral" }
  )
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [{ name: "write_file", state: "approval-requested" }]
    }),
    { workflow: "todo", attention: "neutral" }
  )
})

test("写类已执行或执行中报错：待验收", () => {
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [{ name: "write_file", state: "output-available" }]
    }),
    { workflow: "needs_review", attention: "complete" }
  )
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [{ name: "write_file", state: "output-error", errorText: "ENOSPC" }]
    }),
    { workflow: "needs_review", attention: "complete" }
  )
})

test("abort 时 input-available 先封成 output-error，算可能已改盘", () => {
  const sealed = sealTurnTools([{ name: "write_file", state: "input-available" }])
  assert.equal(sealed[0]?.state, "output-error")
  assert.equal(sealed[0]?.errorText, "No result received.")
  assert.deepEqual(decideTurnOutcome({ ended: "end", tools: sealed }), {
    workflow: "needs_review",
    attention: "complete"
  })
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [{ name: "write_file", state: "input-available" }]
    }),
    { workflow: "needs_review", attention: "complete" }
  )
})

test("写类名走 MUTATING_TOOLS / MCP 叶子，不另开名单", () => {
  assert.equal(isWriteTypeToolName("write_file"), true)
  assert.equal(isWriteTypeToolName("bash"), true)
  assert.equal(isWriteTypeToolName("mcp_s1__write_file"), true)
  assert.equal(isWriteTypeToolName("apply_patch"), true)
  assert.equal(isWriteTypeToolName("read_file"), false)
  assert.equal(isWriteTypeToolName("todo_write"), false)
  assert.equal(isWriteTypeToolName("ask_user_questions"), false)
})
