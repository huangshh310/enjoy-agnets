/**
 * 立即运行不得把 Date.now() 写成 scheduledAt。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "automations-run.ts"), "utf8")

test("立即运行只写 startedAt，不伪造 scheduledAt", () => {
  assert.doesNotMatch(src, /scheduledAt: opts\.scheduledAt \?\? Date\.now\(\)/)
  assert.match(src, /startedAt: Date\.now\(\)/)
  assert.match(src, /\.\.\.\(opts\.scheduledAt != null \? \{ scheduledAt: opts\.scheduledAt \} : \{\}\)/)
})

test("自动化失败 turn 走 generationFailedTurn，不硬写 in_progress", () => {
  assert.match(src, /turn: generationFailedTurn\(openedSessionId\)/)
  assert.match(src, /from "\.\/generation-failed-turn"/)
  assert.doesNotMatch(src, /workflow: "in_progress", attention: "error"/)
})
