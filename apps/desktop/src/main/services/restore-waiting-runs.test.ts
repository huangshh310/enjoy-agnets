/**
 * 重启缺参 / 对不上：结清停止，禁止空 keep 停在 waiting_review 或续泵。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(dir, "restore-waiting-runs.ts"), "utf8")
const cards = readFileSync(join(dir, "restore-waiting-approvals.ts"), "utf8")

test("缺参 / 对不上走 fail-closed 停止，不续泵", () => {
  assert.ok(src.includes("if (restored.keep.length === 0)"))
  assert.ok(src.includes("abandonWaitingRestore"))
  assert.ok(src.includes("endRestoredRunWithoutSdkReply"))
  assert.ok(src.includes("writeSdkResponse: false"))
  assert.ok(src.includes("restoreHeldWaitingApprovals"))
  assert.ok(cards.includes("applyRestoredOrphanApprovals"))
  assert.doesNotMatch(src, /run\.resumeAfterPump = true/)
  assert.doesNotMatch(src, /void pumpStream\(/)
  const orphanAt = cards.indexOf("applyRestoredOrphanApprovals")
  const cardAt = cards.indexOf('type: "approval.required"')
  assert.ok(orphanAt >= 0 && cardAt > orphanAt)
})
