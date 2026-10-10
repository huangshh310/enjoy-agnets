/**
 * 重启缺参：推 SDK deny 并续泵，禁止空 keep 停在 waiting_review。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "restore-waiting-runs.ts"), "utf8")

test("缺参 deny 写库、推 SDK approved:false、空 keep 续泵", () => {
  assert.ok(src.includes("setApprovalDecision(db, rowArgs.id, \"deny\")"))
  assert.ok(src.includes("approved: false"))
  assert.ok(src.includes("approvalResponseMessage"))
  assert.ok(src.includes("run.messages.push"))
  assert.ok(src.includes("if (keep.length === 0)"))
  assert.ok(src.includes("run.resumeAfterPump = true"))
  assert.ok(src.includes("void pumpStream(row.id)"))
  assert.ok(src.includes("const approvalId = rowArgs?.id ?? item.approvalId"))
  assert.ok(src.includes("recordSdkApprovalResponse(approvalId"))
})
