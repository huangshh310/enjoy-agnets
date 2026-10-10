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
  isStripCompact,
  stripNeedsCount,
  stripApprovalCount,
  stripVisibleForOpenSessions,
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

function slot(partial: Partial<AttentionItem> & Pick<AttentionItem, "id" | "sessionId" | "kind">): AttentionItem {
  return {
    sessionTitle: partial.sessionTitle ?? partial.sessionId,
    status: "active",
    runId: "run",
    occurredAt: 1,
    summary: partial.summary ?? partial.id,
    ...partial
  }
}

test("approval.required 按工具分成 pending_approval / ask_user", () => {
  assert.equal(attentionKindFromEvent(approval()), "pending_approval")
  assert.equal(attentionKindFromEvent(approval("ask_user_questions")), "ask_user")
})

test("同会话同 kind 只占一槽，后到覆盖并保留 workspaceId", () => {
  const first = ingestAttentionEvent([], {
    event: approval("bash"),
    sessionId: "ses_b",
    sessionTitle: "B",
    workspaceId: "ws_1",
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
  assert.equal(second[0]?.workspaceId, "ws_1")
})

test("新审批进场时只收 complete，未处理的 error 保留", () => {
  const failed = ingestAttentionEvent([], {
    event: { type: "run.error", runId: "run_old", message: "boom" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const waiting = ingestAttentionEvent(failed, {
    event: approval(),
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(waiting.find((item) => item.kind === "error")?.status, "active")
  assert.equal(waiting.find((item) => item.kind === "pending_approval")?.status, "active")
})

test("新审批进场时收掉已完成，需处理与已完成不叠出", () => {
  const done = ingestAttentionEvent([], {
    event: { type: "run.end", runId: "run_old" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const waiting = ingestAttentionEvent(done, {
    event: approval(),
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(waiting.find((item) => item.kind === "complete")?.status, "resolved")
  assert.equal(waiting.find((item) => item.kind === "pending_approval")?.status, "active")
  assert.equal(stripNeedsCount(waiting), 1)
  assert.equal(
    stripVisibleItems(waiting).some((item) => item.kind === "complete"),
    false
  )
})

test("拒绝审批后需处理清零，不当出错", () => {
  const waiting = ingestAttentionEvent([], {
    event: approval(),
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const denied = ingestAttentionEvent(waiting, {
    event: { type: "approval.resolved", runId: "run_b", toolCallId: "tc_1", decision: "deny" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(denied.find((item) => item.kind === "pending_approval")?.status, "resolved")
  assert.equal(denied.some((item) => item.kind === "error"), false)
  assert.equal(stripNeedsCount(denied), 0)
  assert.equal(stripApprovalCount(denied), 0)
})

test("未执行类 run.error 不当出错，徽标清掉", () => {
  const waiting = ingestAttentionEvent([], {
    event: approval(),
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const finished = ingestAttentionEvent(waiting, {
    event: { type: "run.error", runId: "run_b", message: "本次未执行。" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(finished.find((item) => item.kind === "pending_approval")?.status, "resolved")
  assert.equal(finished.some((item) => item.kind === "error"), false)
  assert.equal(stripApprovalCount(finished), 0)
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

test("本轮工具全未执行：run.end 收束审批但不弹已完成", () => {
  const waiting = ingestAttentionEvent([], {
    event: approval(),
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const quiet = ingestAttentionEvent(waiting, {
    event: { type: "run.end", runId: "run_b" },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2,
    omitComplete: true
  })
  assert.equal(quiet.find((item) => item.kind === "pending_approval")?.status, "resolved")
  assert.equal(
    quiet.some((item) => item.kind === "complete" && item.status === "active"),
    false
  )
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

test("Strip 按优先级排序，当前会话仍可见", () => {
  const items: AttentionItem[] = [
    slot({ id: "ses_a:complete", sessionId: "ses_a", kind: "complete", occurredAt: 4 }),
    slot({ id: "ses_b:pending_approval", sessionId: "ses_b", kind: "pending_approval", occurredAt: 2 }),
    slot({ id: "ses_c:error", sessionId: "ses_c", kind: "error", occurredAt: 3 }),
    slot({ id: "ses_d:ask_user", sessionId: "ses_d", kind: "ask_user", occurredAt: 1 })
  ]
  assert.deepEqual(
    stripVisibleItems(items).map((item) => item.kind),
    ["pending_approval", "ask_user", "error", "complete"]
  )
  assert.equal(stripNeedsCount(items), 3)
  assert.equal(stripApprovalCount(items), 2)
  assert.equal(stripVisibleItems([]).length, 0)
})

test("胶囊不指向已隐藏会话", () => {
  const items: AttentionItem[] = [
    slot({ id: "gone:pending_approval", sessionId: "gone", kind: "pending_approval" }),
    slot({ id: "live:ask_user", sessionId: "live", kind: "ask_user" })
  ]
  const visible = stripVisibleForOpenSessions(items, new Set(["live"]))
  assert.deepEqual(visible.map((item) => item.sessionId), ["live"])
})

test("当前会话 Dock 已开时胶囊收成微点，不要第二套按钮", () => {
  const item = slot({
    id: "ses_a:pending_approval",
    sessionId: "ses_a",
    kind: "pending_approval"
  })
  assert.equal(isStripCompact(item, "ses_a", true, true), true)
  assert.equal(isStripCompact(item, "ses_a", true, false), false)
  assert.equal(isStripCompact(item, "ses_a", false, true), false)
  assert.equal(isStripCompact(item, "ses_b", true, true), false)
})

test("已完成约 4s 自消", () => {
  assert.equal(COMPLETE_TTL_MS, 4_000)
})

test("点 complete 直接 resolved；dismiss 写 dismissed；约 4s 后过期", () => {
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
