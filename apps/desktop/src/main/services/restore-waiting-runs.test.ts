/**
 * 缺参 / HMAC 失败走 fail-closed 停止；已决 HMAC 通过才 resumeAfterPump。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(dir, "restore-waiting-runs.ts"), "utf8")
const cards = readFileSync(join(dir, "restore-waiting-approvals.ts"), "utf8")
const cont = readFileSync(join(dir, "restore-waiting-continue.ts"), "utf8")

test("缺参 / 对不上走 fail-closed 停止；已决续泵走 markResumeAndPump", () => {
  assert.ok(src.includes("if (restored.keep.length > 0)"))
  assert.ok(src.includes("decidable.length === 0 && decidedReplayable.length === 0"))
  assert.ok(src.includes("abandonWaitingRestore"))
  assert.ok(src.includes("endRestoredRunWithoutSdkReply"))
  assert.ok(src.includes("writeSdkResponse: false"))
  assert.ok(src.includes("restoreHeldWaitingApprovals"))
  assert.ok(src.includes("markResumeAndPump"))
  assert.ok(!src.includes("executeRestoredAllows"))
  assert.ok(!src.includes("reverifyRestoredDesktopAllows"))
  assert.ok(src.includes("canReplayDecided"))
  assert.ok(src.includes("auditUnsentIfNeeded"))
  assert.ok(src.includes("readLatestAssistantSnapshot"))
  assert.ok(src.includes("RESTART_UNVERIFIABLE_DECISION"))
  assert.ok(src.includes("resolveRuntimeId"))
  assert.ok(src.includes("isMissingRunSecretError"))
  assert.ok(src.includes("isTestModuleStripError"))
  assert.ok(cards.includes("applyRestoredOrphanApprovals"))
  assert.match(cont, /run\.resumeAfterPump = true/)
  assert.match(cont, /pumpStream\(runId\)/)
  const orphanAt = cards.indexOf("applyRestoredOrphanApprovals")
  const cardAt = cards.indexOf('type: "approval.required"')
  assert.ok(orphanAt >= 0 && cardAt > orphanAt)
})
