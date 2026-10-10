/**
 * 缺 Key 必须是可识别的机器错，禁止摊英文到 UI。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { isMissingRunSecretError, MISSING_RUN_SECRET } from "./missing-run-secret.ts"
import { NO_CHAT_ROUTE } from "@enjoy-agents/ipc-contract/chat-readiness"

test("缺 Key 是可识别的机器错", () => {
  assert.equal(MISSING_RUN_SECRET.includes("Add an API key in Settings"), true)
  assert.equal(isMissingRunSecretError(new Error(MISSING_RUN_SECRET)), true)
  assert.equal(isMissingRunSecretError(new Error("other")), false)
  assert.equal(isMissingRunSecretError("nope"), false)
})

test("开跑把缺 Key 折成 ok:false 而不是 throw", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const start = readFileSync(join(dir, "agent-run-start.ts"), "utf8")
  const helpers = readFileSync(join(dir, "agent-run-helpers.ts"), "utf8")
  assert.match(helpers, /MISSING_RUN_SECRET/)
  assert.match(helpers, /isMissingRunSecretError/)
  assert.match(start, /isMissingRunSecretError/)
  assert.match(start, /return \{ ok: false, code: NO_CHAT_ROUTE \}/)
  assert.equal(NO_CHAT_ROUTE, "no_chat_route")
})
