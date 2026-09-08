import assert from "node:assert/strict"
import { test } from "node:test"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import {
  COMPLETE_TTL_MS,
  attentionKindFromEvent,
  attentionSlotId,
  dismissAttentionSlot,
  focusAttentionSlot,
  ingestAttentionEvent,
  stripVisibleItems
} from "./ingest-attention.ts"
import type { AttentionItem } from "./attention.types.ts"

function approval(name = "bash"): StreamEvent & { type: "approval.required" } {
  return {
    type: "approval.required",
    runId: "run_b",
    toolCallId: "tc_1",
    approvalId: "apr_1",
    name,
    args: { command: "ls" }
  }
}

test("approval.required 按工具分成 pending_approval / ask_user", () => {
  assert.equal(attentionKindFromEvent(approval()), "pending_approval")
  assert.equal(attentionKindFromEvent(approval("ask_user_questions")), "ask_user")
})

test("同会话同 kind 只占一槽，后到覆盖", () => {
  const first = ingestAttentionEvent([], {
    event: approval("bash"),
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const second = ingestAttentionEvent(first, {
    event: { ...approval("write_file"), approvalId: "apr_2" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(second.length, 1)
  assert.equal(second[0]?.id, attentionSlotId("ses_b", "pending_approval"))
  assert.equal(second[0]?.summary.includes("write_file"), true)
})

test("approval.resolved 收束该会话未决审批槽", () => {
  const active = ingestAttentionEvent([], {
    event: approval(),
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const resolved = ingestAttentionEvent(active, {
    event: { type: "approval.resolved", runId: "run_b", toolCallId: "tc_1", decision: "allow" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(resolved[0]?.status, "resolved")
})

test("run.end 收束审批并 upsert complete", () => {
  const waiting = ingestAttentionEvent([], {
    event: approval(),
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const done = ingestAttentionEvent(waiting, {
    event: { type: "run.end", runId: "run_b" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(done.find((item) => item.kind === "pending_approval")?.status, "resolved")
  assert.equal(done.find((item) => item.kind === "complete")?.status, "active")
})

test("Strip 隐藏当前 Chat 会话的 active，空则无项", () => {
  const items: AttentionItem[] = [
    {
      id: "ses_a:pending_approval",
      sessionId: "ses_a",
      sessionTitle: "A",
      kind: "pending_approval",
      status: "active",
      runId: "run_a",
      occurredAt: 1,
      summary: "A"
    },
    {
      id: "ses_b:pending_approval",
      sessionId: "ses_b",
      sessionTitle: "B",
      kind: "pending_approval",
      status: "active",
      runId: "run_b",
      occurredAt: 2,
      summary: "B"
    }
  ]
  assert.deepEqual(
    stripVisibleItems(items, "ses_a", true).map((item) => item.sessionId),
    ["ses_b"]
  )
  assert.equal(stripVisibleItems(items, "ses_a", false).length, 2)
  assert.equal(stripVisibleItems([], "ses_a", true).length, 0)
})

test("点 complete 直接 resolved；dismiss 写 dismissed；过期 complete", () => {
  const done = ingestAttentionEvent([], {
    event: { type: "run.end", runId: "run_b" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 10
  })
  const focused = focusAttentionSlot(done, "ses_b", "complete")
  assert.equal(focused[0]?.status, "resolved")
  const dismissed = dismissAttentionSlot(done, done[0]!.id)
  assert.equal(dismissed[0]?.status, "dismissed")
  const expired = ingestAttentionEvent(done, {
    event: { type: "text.delta", runId: "run_x", text: "x" },
    sessionId: "ses_x",
    sessionTitle: "X",
    now: 10 + COMPLETE_TTL_MS + 1
  })
  assert.equal(expired.find((item) => item.kind === "complete")?.status, "expired")
})
