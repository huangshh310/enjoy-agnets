import assert from "node:assert/strict"
import { test } from "node:test"
import { publicCredentialCheck } from "./credential-check-store.ts"

test("读校验时指纹对不上当 unverified，对得上才认落盘态", () => {
  const stored = { state: "ok" as const, fingerprint: "aaa" }
  assert.deepEqual(publicCredentialCheck(stored, "bbb"), { state: "unverified" })
  assert.equal(publicCredentialCheck(stored, "aaa").state, "ok")
  assert.equal(publicCredentialCheck({ state: "invalid", code: "auth_rejected" }).state, "invalid")
})
