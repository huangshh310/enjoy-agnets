import assert from "node:assert/strict"
import { test } from "node:test"
import { readSecretWrite } from "./secret-write.ts"

test("setActiveModel 回 {ok:false} 认失败码，不能当快照", () => {
  const raw = { ok: false, code: "KEYCHAIN_UNAVAILABLE" }
  const outcome = readSecretWrite(raw)
  assert.deepEqual(outcome, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
  assert.equal("hasKey" in raw ? false : true, true)
  assert.equal((raw as { defaultModelId?: string }).defaultModelId, undefined)
})
