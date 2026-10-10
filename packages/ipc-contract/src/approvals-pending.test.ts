import assert from "node:assert/strict"
import { test } from "node:test"
import {
  PENDING_APPROVAL_ARGS_MAX_BYTES,
  parseInboxPendingItems,
  parsePendingApprovalArgs,
  parsePendingApprovalItem
} from "./approvals-pending.ts"

test("args 超上限当缺参，条目其它字段仍可解析", () => {
  const huge = { blob: "x".repeat(PENDING_APPROVAL_ARGS_MAX_BYTES + 8) }
  assert.equal(parsePendingApprovalArgs(huge), undefined)
  const item = parsePendingApprovalItem({
    id: "apr_1",
    runId: "run_1",
    sessionId: "ses_1",
    workspaceId: "ws",
    sessionTitle: "Note",
    name: "write_file",
    toolCallId: "tool_1",
    createdAt: 1,
    args: huge
  })
  assert.ok(item)
  assert.equal(item?.id, "apr_1")
  assert.equal("args" in (item ?? {}), false)
  assert.deepEqual(parsePendingApprovalArgs({ path: "e2e-stub.txt" }), { path: "e2e-stub.txt" })
  assert.equal(parseInboxPendingItems([{ ...item, args: huge }])[0]?.id, "apr_1")
})
