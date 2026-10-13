import assert from "node:assert/strict"
import { test } from "node:test"
import { inboxRailCount, pickDefaultInboxTab } from "./inbox-default-tab.ts"

test("只有失败：默认落到失败页签，不停在空的「等你决定」", () => {
  assert.equal(pickDefaultInboxTab({ approval: 0, needs_review: 0, failed: 2 }, "approval"), "failed")
})

test("当前页签有条目就不动；全空也不动", () => {
  assert.equal(pickDefaultInboxTab({ approval: 1, needs_review: 0, failed: 2 }, "approval"), "approval")
  assert.equal(pickDefaultInboxTab({ approval: 0, needs_review: 0, failed: 0 }, "approval"), "approval")
  assert.equal(pickDefaultInboxTab({ approval: 0, needs_review: 3, failed: 2 }, "approval"), "needs_review")
})

test("左栏徽标：失败会话也计数；已好的 / 已删会话不计", () => {
  const live = new Set(["a", "b"])
  const items = [
    { sessionId: "a", kind: "error", status: "active" },
    { sessionId: "a", kind: "error", status: "focused" },
    { sessionId: "b", kind: "error", status: "resolved" },
    { sessionId: "gone", kind: "error", status: "active" }
  ]
  assert.equal(inboxRailCount({ liveSessionIds: live, pendingApprovalSessionIds: [], attentionItems: items }), 1)
  assert.equal(inboxRailCount({ liveSessionIds: live, pendingApprovalSessionIds: ["b"], attentionItems: items }), 2)
  assert.equal(inboxRailCount({ liveSessionIds: new Set(), pendingApprovalSessionIds: ["b"], attentionItems: items }), 0)
})
