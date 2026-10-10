import assert from "node:assert/strict"
import { test } from "node:test"
import { decideTurnOutcome, sealTurnTools } from "./turn-outcome.ts"
import { isWriteTypeToolName } from "./tool-names.ts"

test("出错 / 用户停：写类已执行则待验收，Attention 仍是出错", () => {
  const write = { name: "write_file", state: "output-available" as const }
  assert.deepEqual(decideTurnOutcome({ ended: "error", tools: [write] }), {
    workflow: "needs_review",
    attention: "error"
  })
  assert.deepEqual(decideTurnOutcome({ ended: "abort", tools: [write] }), {
    workflow: "needs_review",
    attention: "error"
  })
})

test("出错 / 用户停：没有写类已执行则保持执行中", () => {
  assert.deepEqual(decideTurnOutcome({ ended: "error", tools: [] }), {
    workflow: "in_progress",
    attention: "error"
  })
  assert.deepEqual(
    decideTurnOutcome({
      ended: "abort",
      tools: [{ name: "read_file", state: "output-available" }]
    }),
    { workflow: "in_progress", attention: "error" }
  )
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
  assert.deepEqual(
    decideTurnOutcome({
      ended: "abort",
      tools: [{ name: "write_file", state: "input-available" }]
    }),
    { workflow: "needs_review", attention: "error" }
  )
})

test("只读白名单之外都算写类：未知 MCP 与 ACP move", () => {
  assert.equal(isWriteTypeToolName("write_file"), true)
  assert.equal(isWriteTypeToolName("bash"), true)
  assert.equal(isWriteTypeToolName("mcp_s1__write_file"), true)
  assert.equal(isWriteTypeToolName("apply_patch"), true)
  assert.equal(isWriteTypeToolName("mcp_fs__move_file"), true)
  assert.equal(isWriteTypeToolName("rename"), true)
  assert.equal(isWriteTypeToolName("apply_diff"), true)
  assert.equal(isWriteTypeToolName("git_merge"), true)
  assert.equal(isWriteTypeToolName("set_config"), true)
  assert.equal(isWriteTypeToolName("run_script"), true)
  assert.equal(isWriteTypeToolName("edit_file"), true)
  assert.equal(isWriteTypeToolName("read_file"), false)
  assert.equal(isWriteTypeToolName("todo_write"), false)
  assert.equal(isWriteTypeToolName("ask_user_questions"), false)
  assert.equal(isWriteTypeToolName("delegate"), false)
})

test("delegate 子工具折进同一份 tools：只读子工具不进待验收，未知 MCP 子工具要进", () => {
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [
        { name: "delegate", state: "output-available" },
        { name: "read_file", state: "output-available" }
      ]
    }),
    { workflow: "todo", attention: "complete" }
  )
  assert.deepEqual(
    decideTurnOutcome({
      ended: "end",
      tools: [
        { name: "delegate", state: "output-available" },
        { name: "mcp_fs__move_file", state: "output-available" }
      ]
    }),
    { workflow: "needs_review", attention: "complete" }
  )
})
