/**
 * stub 终态必须带 kind，失败走 run.error 同样带 kind。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "e2e-generate.ts"), "utf8")

test("e2e-generate 成功 run.end / 失败 run.error 都带 kind", () => {
  assert.match(src, /type: "run.end", runId, kind: request\.kind/)
  assert.match(src, /type: "run.error"/)
  assert.match(src, /kind: request\.kind/)
  assert.match(src, /status: "failed"/)
})
