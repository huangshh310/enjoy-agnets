/**
 * 终态必须 UPDATE 助手行并清检查点，禁止 assistantPersisted 挡住收工。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { shouldFlushRunsOnWindowAllClosed } from "./flush-on-window-all-closed.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(dir, "flush-agent-run.ts"), "utf8")
const indexSrc = readFileSync(join(dir, "../index.ts"), "utf8")

test("终态清 checkpoint；checkpointActiveRun 不再被 assistantPersisted 挡住", () => {
  assert.match(src, /checkpoint: null/)
  assert.match(src, /FINISHED\.has\(status\)/)
  assert.doesNotMatch(src, /if \(run\.assistantPersisted\) return false/)
})

test("will-quit fail-closed 走 settle restart + 常量码，并打日志", () => {
  assert.match(src, /settlePendingApprovalsForRun\(runId, undefined, "restart"\)/)
  assert.match(src, /writeCancelledRestoreError\(runId, RESTORE_NO_MATCHING_CODE\)/)
  assert.match(src, /console\.error\("\[flush\] will-quit persist failed"/)
  assert.doesNotMatch(src, /setApprovalDecision/)
})

test("macOS 关光窗口不 flush；真退出才 fail-closed", () => {
  assert.equal(shouldFlushRunsOnWindowAllClosed("darwin"), false)
  assert.equal(shouldFlushRunsOnWindowAllClosed("linux"), true)
  assert.equal(shouldFlushRunsOnWindowAllClosed("win32"), true)
  assert.match(indexSrc, /shouldFlushRunsOnWindowAllClosed\(process\.platform\)/)
  assert.match(indexSrc, /flush-on-window-all-closed/)
  assert.match(indexSrc, /flushActiveRuns\(\{ failClosed: true \}\)/)
})
