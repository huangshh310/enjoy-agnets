import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveErrorSlots } from "./ingest-attention.ts"
import type { AttentionItem } from "./attention.types.ts"

const err = (runId: string, occurredAt: number) =>
  ({ id: "s:error", sessionId: "s", kind: "error", status: "active", runId, occurredAt }) as unknown as AttentionItem

test("同一 run 的成功：清掉出错", () => {
  assert.equal(resolveErrorSlots([err("r2", 200)], "s", { runId: "r2", at: 100 })[0]!.status, "resolved")
})
test("更晚的成功（不同 run）：清掉更早的出错", () => {
  assert.equal(resolveErrorSlots([err("r1", 100)], "s", { runId: "r2", at: 200 })[0]!.status, "resolved")
  assert.equal(resolveErrorSlots([err("r1", 100)], "s", { runId: "r2", at: 100 })[0]!.status, "resolved")
})
test("旧 run 的成功迟到：不清新出错（leo #151）", () => {
  assert.equal(resolveErrorSlots([err("r2", 200)], "s", { runId: "r1", at: 150 })[0]!.status, "active")
  assert.equal(resolveErrorSlots([err("r2", 200)], "s", { at: 150 })[0]!.status, "active")
})
test("别的会话不动", () => {
  const other = { ...err("r1", 1), sessionId: "o" } as AttentionItem
  assert.equal(resolveErrorSlots([other], "s", { runId: "r1", at: 9 })[0]!.status, "active")
})

test("成功时间优先取事件 timestamp，没有才用到达时间", async () => {
  const { successMark } = await import("./ingest-attention.ts")
  assert.deepEqual(successMark({ type: "run.end", runId: "r", timestamp: 42 } as never, 999), { runId: "r", at: 42 })
  assert.deepEqual(successMark({ type: "run.end", runId: "r" } as never, 999), { runId: "r", at: 999 })
})
