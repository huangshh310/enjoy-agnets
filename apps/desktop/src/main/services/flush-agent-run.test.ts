/**
 * 终态必须 UPDATE 助手行并清检查点，禁止 assistantPersisted 挡住收工。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "flush-agent-run.ts"), "utf8")

test("终态清 checkpoint；checkpointActiveRun 不再被 assistantPersisted 挡住", () => {
  assert.match(src, /checkpoint: null/)
  assert.match(src, /FINISHED\.has\(status\)/)
  assert.doesNotMatch(src, /if \(run\.assistantPersisted\) return false/)
})
