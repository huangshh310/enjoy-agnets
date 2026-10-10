/**
 * 重启缺参：推 SDK deny 并续泵，禁止空 keep 停在 waiting_review。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(dir, "restore-waiting-runs.ts"), "utf8")
const cards = readFileSync(join(dir, "restore-waiting-approvals.ts"), "utf8")

test("缺参 deny 写库、推 SDK approved:false、空 keep 续泵", () => {
  assert.ok(cards.includes("setApprovalDecision(db, row.id, \"deny\")"))
  assert.ok(cards.includes("approved: false"))
  assert.ok(cards.includes("approvalResponseMessage"))
  assert.ok(cards.includes("run?.messages.push"))
  assert.ok(src.includes("if (restored.keep.length === 0)"))
  assert.ok(src.includes("run.resumeAfterPump = true"))
  assert.ok(src.includes("void pumpStream(row.id)"))
  assert.ok(cards.includes("recordSdkApprovalResponse(row.id"))
  assert.ok(cards.includes("applyRestoredOrphanApprovals"))
  assert.ok(src.includes("restoreHeldWaitingApprovals"))
  const orphanAt = cards.indexOf("applyRestoredOrphanApprovals")
  const cardAt = cards.indexOf('type: "approval.required"')
  assert.ok(orphanAt >= 0 && cardAt > orphanAt)
})
