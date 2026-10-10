import assert from "node:assert/strict"
import { test } from "node:test"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import {
  COMPLETE_TTL_MS,
  attentionKindFromEvent,
  attentionSlotId,
  clearCompleteIfSessionErrored,
  dismissAttentionSlot,
  focusAttentionSlot,
  ingestAttentionEvent,
  isStripCompact,
  stripNeedsCount,
  stripApprovalCount,
  stripVisibleItems,
  clearSessionAttention
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

test("缺 args 的 approval.required 仍占审批槽", () => {
  const items = ingestAttentionEvent([], {
    event: {
      type: "approval.required",
      runId: "run_b",
      toolCallId: "tc_1",
      approvalId: "apr_1",
      name: "write_file"
    },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  assert.equal(items.find((item) => item.kind === "pending_approval")?.status, "active")
})

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

test("Strip 同会话已有出错时不画已完成残渣", () => {
  const leftover: AttentionItem[] = [
    slot({
      id: attentionSlotId("ses_err", "complete"),
      sessionId: "ses_err",
      kind: "complete",
      status: "active",
      occurredAt: 1
    }),
    slot({
      id: attentionSlotId("ses_err", "error"),
      sessionId: "ses_err",
      kind: "error",
      status: "active",
      occurredAt: 2,
      summary: "INTERNAL_STORE_ERROR"
    })
  ]
  assert.deepEqual(
    stripVisibleItems(leftover).map((item) => item.kind),
    ["error"]
  )
})

test("切到已出错会话：残留下的已完成必须收掉，不当本轮又发了已完成", () => {
  const leftover: AttentionItem[] = [
    slot({
      id: attentionSlotId("ses_err", "complete"),
      sessionId: "ses_err",
      kind: "complete",
      status: "active",
      occurredAt: 1
    }),
    slot({
      id: attentionSlotId("ses_err", "error"),
      sessionId: "ses_err",
      kind: "error",
      status: "active",
      occurredAt: 2,
      summary: "INTERNAL_STORE_ERROR"
    })
  ]
  const next = clearCompleteIfSessionErrored(leftover, "ses_err")
  assert.equal(next.find((item) => item.kind === "error")?.status, "active")
  assert.equal(next.find((item) => item.kind === "complete")?.status, "resolved")
  assert.equal(
    stripVisibleItems(next).some((item) => item.kind === "complete"),
    false
  )
})

test("run.error 即使 turn 写成 complete 也只出出错，不当本轮又发了已完成", () => {
  const badError = {
    type: "run.error" as const,
    runId: "run_err",
    message: "INTERNAL_STORE_ERROR",
    turn: { workflow: "todo" as const, attention: "complete" as const }
  }
  assert.equal(attentionKindFromEvent(badError), "error")
  const done = ingestAttentionEvent([], {
    event: {
      type: "run.end",
      runId: "run_old",
      turn: { workflow: "todo", attention: "complete" }
    },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const failed = ingestAttentionEvent(done, {
    event: badError,
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(failed.find((item) => item.kind === "error")?.status, "active")
  assert.equal(
    failed.some((item) => item.kind === "complete" && item.status === "active"),
    false
  )
  assert.equal(
    stripVisibleItems(failed).some((item) => item.kind === "complete"),
    false
  )
})

test("存储失败 turn.error：只出出错，收掉同会话已完成", () => {
  const done = ingestAttentionEvent([], {
    event: {
      type: "run.end",
      runId: "run_old",
      turn: { workflow: "todo", attention: "complete" }
    },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 1
  })
  const failed = ingestAttentionEvent(done, {
    event: {
      type: "run.error",
      runId: "run_err",
      message: "INTERNAL_STORE_ERROR",
      turn: { workflow: "in_progress", attention: "error" }
    },
    sessionId: "ses_b",
    sessionTitle: "B",
    now: 2
  })
  assert.equal(failed.find((item) => item.kind === "error")?.status, "active")
  assert.equal(failed.find((item) => item.kind === "complete")?.status, "resolved")
  assert.equal(
    failed.some((item) => item.kind === "complete" && item.status === "active"),
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

test("点 complete 直接 resolved；dismiss 写 dismissed；10s 后过期", () => {
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

test("用户停 run.error 只信 turn.neutral：不当出错，不进需处理", () => {
  const stopped = ingestAttentionEvent([], {
    event: {
      type: "run.error",
      runId: "run_stop",
      message: "Aborted by user.",
      code: "user_aborted",
      turn: { workflow: "in_progress", attention: "neutral" }
    },
    sessionId: "ses_stop",
    sessionTitle: "停",
    now: 1
  })
  assert.equal(stopped.some((item) => item.kind === "error" && item.status === "active"), false)
  assert.equal(stripNeedsCount(stopped), 0)
})

test("本会话开跑收掉已完成，不留下已完成胶囊", () => {
  const done = ingestAttentionEvent([], {
    event: { type: "run.end", runId: "run_old", turn: { workflow: "todo", attention: "complete" } },
    sessionId: "ses_a",
    sessionTitle: "A",
    now: 1
  })
  const next = ingestAttentionEvent(done, {
    event: { type: "run.start", runId: "run_new", sessionId: "ses_a" },
    sessionId: "ses_a",
    sessionTitle: "A",
    now: 2
  })
  assert.equal(next.find((item) => item.kind === "complete")?.status, "resolved")
})

test("归档中止 run.error 中性：不当出错，审批槽收掉", () => {
  const waiting = ingestAttentionEvent([], {
    event: approval("write_file"),
    sessionId: "ses_arch",
    sessionTitle: "归档中",
    now: 1
  })
  const archived = ingestAttentionEvent(waiting, {
    event: {
      type: "run.error",
      runId: "run_b",
      message: "Aborted by user.",
      turn: { workflow: "in_progress", attention: "neutral" },
      sessionId: "ses_arch"
    },
    sessionId: "ses_arch",
    sessionTitle: "归档中",
    now: 2
  })
  assert.equal(archived.find((item) => item.kind === "pending_approval")?.status, "resolved")
  assert.equal(archived.some((item) => item.kind === "error" && item.status === "active"), false)
  assert.equal(stripNeedsCount(archived), 0)
})

test("归档后清掉该会话需处理 / 出错 / 已完成", () => {
  let items = ingestAttentionEvent([], {
    event: approval("write_file"),
    sessionId: "ses_arch",
    sessionTitle: "归档中",
    now: 1
  })
  items = ingestAttentionEvent(items, {
    event: { type: "run.error", runId: "run_other", message: "boom" },
    sessionId: "ses_keep",
    sessionTitle: "留下",
    now: 2
  })
  items = ingestAttentionEvent(items, {
    event: { type: "run.end", runId: "run_done", turn: { workflow: "todo", attention: "complete" } },
    sessionId: "ses_arch",
    sessionTitle: "归档中",
    now: 3
  })
  const cleared = clearSessionAttention(items, "ses_arch")
  assert.equal(
    cleared.some(
      (item) => item.sessionId === "ses_arch" && (item.status === "active" || item.status === "focused")
    ),
    false
  )
  assert.equal(cleared.find((item) => item.sessionId === "ses_keep" && item.kind === "error")?.status, "active")
  assert.equal(stripNeedsCount(cleared), 1)
})
