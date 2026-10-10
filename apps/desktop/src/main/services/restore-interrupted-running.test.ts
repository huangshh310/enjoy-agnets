/**
 * running 中途结清：封 restart_abandoned、发回挂家族、不清掉原 runs.error。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(dir, "restore-interrupted-running.ts"), "utf8")
const abandon = readFileSync(join(dir, "abandon-orphan-runs.ts"), "utf8")
const restore = readFileSync(join(dir, "restore-running-runs.ts"), "utf8")
const generation = readFileSync(join(dir, "ai-generation.ts"), "utf8")

test("中途 running 封 restart_abandoned 并发 restore_interrupted_running", () => {
  assert.match(src, /RESTORE_INTERRUPTED_RUNNING/)
  assert.match(src, /RESTART_ABANDONED_CODE/)
  assert.match(src, /sealAbandonedTools/)
  assert.match(src, /keep original run.error/)
  assert.match(abandon, /queueInterruptedRunningSettle/)
  assert.doesNotMatch(abandon, /Abandoned after process restart/)
  assert.match(restore, /emitQueuedInterruptedRunning/)
  assert.doesNotMatch(restore, /if \(isE2eStub\(\)\) return/)
})

test("标题 / 补全终态清掉 runs.checkpoint", () => {
  assert.match(generation, /status: "completed", checkpoint: null/)
  assert.match(generation, /status: "failed".*checkpoint: null/)
})
