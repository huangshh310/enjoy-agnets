/**
 * 缺 Key 必须是可识别的机器错，禁止摊英文到 UI。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const helpers = readFileSync(join(dir, "agent-run-helpers.ts"), "utf8")
const start = readFileSync(join(dir, "agent-run-start.ts"), "utf8")

test("缺 Key 文案可被闸收成 no_chat_route", () => {
  assert.match(helpers, /MISSING_RUN_SECRET = "Add an API key in Settings/)
  assert.match(helpers, /export function isMissingRunSecretError/)
})

test("开跑把缺 Key 折成 ok:false 而不是 throw", () => {
  assert.match(start, /isMissingRunSecretError/)
  assert.match(start, /return \{ ok: false, code: NO_CHAT_ROUTE \}/)
})
