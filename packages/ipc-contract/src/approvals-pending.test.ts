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

test("缺参仍保留 targetShortName，超 64 只省略短名", () => {
  const item = parsePendingApprovalItem({
    id: "apr_2",
    runId: "run_2",
    sessionId: "ses_2",
    workspaceId: "ws",
    sessionTitle: "Note",
    name: "write_file",
    toolCallId: "tool_2",
    createdAt: 2,
    targetShortName: "note.txt",
    args: { blob: "x".repeat(PENDING_APPROVAL_ARGS_MAX_BYTES + 8) }
  })
  assert.ok(item)
  assert.equal(item?.targetShortName, "note.txt")
  assert.equal("args" in (item ?? {}), false)
  const tooLong = parsePendingApprovalItem({
    id: "apr_3",
    runId: "run_3",
    sessionId: "ses_3",
    workspaceId: null,
    sessionTitle: "Note",
    name: "write_file",
    toolCallId: "tool_3",
    createdAt: 3,
    targetShortName: `${"a".repeat(65)}.md`
  })
  assert.ok(tooLong)
  assert.equal(tooLong?.id, "apr_3")
  assert.equal("targetShortName" in (tooLong ?? {}), false)
})

test("二次确认卡超上限只剥缩略图，保留 sensitive / hints", () => {
  const args = {
    action: "click",
    sensitive: true,
    hints: ["password field"],
    thumbnailDataUrl: `data:image/png;base64,${"A".repeat(20_000)}`,
    previousThumbnailDataUrl: `data:image/png;base64,${"B".repeat(4_000)}`
  }
  const parsed = parsePendingApprovalArgs(args)
  assert.ok(parsed && typeof parsed === "object")
  const record = parsed as Record<string, unknown>
  assert.equal(record.sensitive, true)
  assert.deepEqual(record.hints, ["password field"])
  assert.equal("thumbnailDataUrl" in record, false)
  assert.equal("previousThumbnailDataUrl" in record, false)
})
