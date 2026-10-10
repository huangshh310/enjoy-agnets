import assert from "node:assert/strict"
import { test } from "node:test"
import {
  approvalRequiredFromPending,
  hasDecidableApprovalArgs,
  pickLivePendingForSession
} from "./hydrate-live-pending-approval.ts"

const item = {
  id: "apr_1",
  runId: "run_1",
  sessionId: "ses_wait",
  workspaceId: "ws_1",
  sessionTitle: "Note",
  name: "write_file",
  toolCallId: "tool_1",
  createdAt: 1,
  args: { path: "e2e-stub.txt", content: "from stub" }
}

test("只取本会话最新的活未决", () => {
  assert.equal(
    pickLivePendingForSession(
      [
        { ...item, sessionId: "ses_other", id: "apr_other" },
        { ...item, id: "apr_old", createdAt: 1 },
        { ...item, id: "apr_new", createdAt: 9 }
      ],
      "ses_wait"
    )?.id,
    "apr_new"
  )
  assert.equal(pickLivePendingForSession([item], "ses_empty"), undefined)
})

test("回组 approval.required，参数只信 Inbox 带来的 HMAC 拷贝", () => {
  const event = approvalRequiredFromPending(item)
  assert.ok(event)
  assert.equal(event.type, "approval.required")
  assert.equal(event.approvalId, "apr_1")
  assert.deepEqual(event.args, { path: "e2e-stub.txt", content: "from stub" })
})

test("缺参不得猜 {}，不组可决策卡", () => {
  assert.equal(hasDecidableApprovalArgs(undefined), false)
  assert.equal(hasDecidableApprovalArgs(null), false)
  assert.equal(approvalRequiredFromPending({ ...item, args: undefined }), null)
})
