import assert from "node:assert/strict"
import { test } from "node:test"
import { StreamEvent } from "./stream-event.ts"
import { StopReceipt } from "./stop-receipt.ts"

const receipt = {
  write: "maybe_partial",
  tools: [
    {
      toolCallId: "call-1",
      name: "bash",
      write: "maybe_partial",
      evidence: ["process_killed"],
      exit: "killed"
    }
  ],
  settledAt: 1_700_000_000_000,
  elapsedMs: 1200,
  tree: "confirmed"
}

test("run.stopped：三阶段都过闸，回执原样保留", () => {
  for (const phase of ["stuck", "settled", "final"] as const) {
    const parsed = StreamEvent.safeParse({ type: "run.stopped", runId: "r1", sessionId: "s1", phase, receipt })
    assert.ok(parsed.success, phase)
    if (parsed.success && parsed.data.type === "run.stopped") {
      assert.equal(parsed.data.phase, phase)
      assert.equal(parsed.data.receipt.write, "maybe_partial")
      assert.equal(parsed.data.receipt.tools[0]?.exit, "killed")
    }
  }
})

test("run.stopped：未知阶段 / 未知写盘结论不过闸", () => {
  assert.equal(
    StreamEvent.safeParse({ type: "run.stopped", runId: "r1", sessionId: "s1", phase: "done", receipt }).success,
    false
  )
  assert.equal(StopReceipt.safeParse({ ...receipt, write: "none" }).success, false)
})

test("run.error：settling 可选；坏字段当缺省，不拖垮整条事件", () => {
  const ok = StreamEvent.safeParse({
    type: "run.error",
    runId: "r1",
    message: "Aborted by user",
    code: "user_aborted",
    settling: { deadlineAt: 123 }
  })
  assert.ok(ok.success)
  if (ok.success && ok.data.type === "run.error") assert.deepEqual(ok.data.settling, { deadlineAt: 123 })

  const missing = StreamEvent.safeParse({ type: "run.error", runId: "r1", message: "x", code: "user_aborted" })
  assert.ok(missing.success)
  if (missing.success && missing.data.type === "run.error") assert.equal(missing.data.settling, undefined)

  const bad = StreamEvent.safeParse({ type: "run.error", runId: "r1", message: "x", settling: { deadlineAt: "soon" } })
  assert.ok(bad.success)
  if (bad.success && bad.data.type === "run.error") assert.equal(bad.data.settling, undefined)
})
