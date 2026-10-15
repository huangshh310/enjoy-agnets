/**
 * leo r3 M2：哪些事件让首句自动标题落定；后台停车分支也要通知（dispatchAgentEvent 接线断言）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { onTurnProducedOutput } from "./pre-output-rollback-listeners.ts"
import { noteTurnSettled, turnSettledByEvent } from "./turn-settled.ts"

test("run.end / 出字 / 工具 / 审批算站住；run.start、run.error、开泵前 source.added 不算", () => {
  for (const type of ["run.end", "text.delta", "reasoning.delta", "tool.start", "approval.required"]) {
    assert.equal(turnSettledByEvent({ type }), true, type)
  }
  for (const type of ["run.start", "run.error", "source.added", "usage.updated"]) {
    assert.equal(turnSettledByEvent({ type }), false, type)
  }
})

test("noteTurnSettled：站住才通知，带会话 id；没有会话 id 不通知", () => {
  const seen: string[] = []
  const off = onTurnProducedOutput((sid) => seen.push(sid))
  try {
    assert.equal(noteTurnSettled("ses_a", { type: "run.end" }), true)
    assert.equal(noteTurnSettled("ses_a", { type: "run.error" }), false)
    assert.equal(noteTurnSettled(undefined, { type: "run.end" }), false)
    assert.deepEqual(seen, ["ses_a"])
  } finally {
    off()
  }
})

test("后台停车分支同样通知（dispatchAgentEvent 在 applyParkEvent 之后调 noteTurnSettled）", () => {
  const src = readFileSync(new URL("./attention/dispatch-agent-event.ts", import.meta.url), "utf8")
  const park = src.indexOf("applyParkEvent(sessionId, event)")
  const note = src.indexOf("noteTurnSettled(sessionId, event)")
  assert.ok(park > 0 && note > park, "停车分支里要调 noteTurnSettled")
})
