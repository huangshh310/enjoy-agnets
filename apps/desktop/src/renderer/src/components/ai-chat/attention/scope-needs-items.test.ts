import assert from "node:assert/strict"
import { test } from "node:test"
import type { AttentionItem } from "../../../stores/attention/attention.types.ts"
import { activePinLabelKey, sessionActivity, pickActiveSessions } from "../sidebar/session-activity.ts"
import { scopeNeedsItems } from "./scope-needs-items.ts"

function item(id: string, sessionId: string, kind: AttentionItem["kind"]): AttentionItem {
  return { id, sessionId, sessionTitle: sessionId, kind, status: "active", runId: `r_${id}`, occurredAt: 1, summary: "" }
}

const items = [item("e1", "ses_a", "error"), item("p1", "ses_b", "pending_approval"), item("c1", "ses_a", "complete")]

test("会话页：「出错 / 需处理」只列当前会话，不列完成", () => {
  assert.deepEqual(
    scopeNeedsItems(items, { isChat: true, sessionId: "ses_a" }).map((i) => i.id),
    ["e1"]
  )
  assert.deepEqual(
    scopeNeedsItems(items, { isChat: true, sessionId: "ses_b" }).map((i) => i.id),
    ["p1"]
  )
})

test("切到新的空会话（还没 id）：条不挂着上一条会话的错", () => {
  assert.deepEqual(scopeNeedsItems(items, { isChat: true, sessionId: null }), [])
})

test("其它页面（收件箱等）照常列全部会话", () => {
  assert.deepEqual(
    scopeNeedsItems(items, { isChat: false, sessionId: "ses_a" }).map((i) => i.id),
    ["e1", "p1"]
  )
})

test("别的会话出错：顶部条不列，但侧栏会话行仍标出错、钉进需处理组", () => {
  assert.deepEqual(scopeNeedsItems(items, { isChat: true, sessionId: "ses_b" }).map((i) => i.id), ["p1"])
  const other = sessionActivity({ sessionId: "ses_a", currentId: "ses_b", running: false, parks: {}, items })
  assert.equal(other.failed, true)
  const pinned = pickActiveSessions(
    [{ id: "ses_a", updatedAt: 1 }, { id: "ses_c", updatedAt: 2 }],
    (id) => sessionActivity({ sessionId: id, currentId: "ses_b", running: false, parks: {}, items })
  )
  assert.deepEqual(pinned.map((s) => s.id), ["ses_a"])
  assert.equal(
    activePinLabelKey(pinned.map((s) => sessionActivity({ sessionId: s.id, currentId: "ses_b", running: false, parks: {}, items }))),
    "sessionNeedsAttention"
  )
})
