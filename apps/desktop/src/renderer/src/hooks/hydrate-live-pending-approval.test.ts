import assert from "node:assert/strict"
import { test } from "node:test"
import {
  approvalRequiredFromPending,
  argsForToolCall,
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
  createdAt: 1
}

test("只取本会话的活未决", () => {
  assert.equal(
    pickLivePendingForSession(
      [
        { ...item, sessionId: "ses_other", id: "apr_other" },
        item
      ],
      "ses_wait"
    )?.id,
    "apr_1"
  )
  assert.equal(pickLivePendingForSession([item], "ses_empty"), undefined)
})

test("回组 approval.required，参数跟工具行", () => {
  const args = argsForToolCall(
    [{ tools: [{ id: "tool_1", name: "write_file", state: "approval-requested", args: { path: "note.txt" } }] }],
    "tool_1"
  )
  assert.deepEqual(args, { path: "note.txt" })
  const event = approvalRequiredFromPending(item, args)
  assert.equal(event.type, "approval.required")
  assert.equal(event.approvalId, "apr_1")
  assert.equal(event.args.path, "note.txt")
})
