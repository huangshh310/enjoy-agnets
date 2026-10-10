import assert from "node:assert/strict"
import { test } from "node:test"
import { SECRET_WRITE_CHANNELS } from "@enjoy-agents/ipc-contract"
import { SecretWriteFailure } from "./secret-storage.ts"
import { guardPasswordWrite, runSecretWrite } from "./secret-write-guard.ts"

test("runSecretWrite 把 SecretWriteFailure 收成 KEYCHAIN_UNAVAILABLE", async () => {
  const result = await runSecretWrite(() => {
    throw new SecretWriteFailure("KEYCHAIN_UNAVAILABLE")
  })
  assert.deepEqual(result, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
})

test("runSecretWrite 成功摊 payload", async () => {
  const previous = process.env.ENJOY_E2E_STUB
  process.env.ENJOY_E2E_STUB = "1"
  try {
    const result = await runSecretWrite(() => ({ hasKey: true }))
    assert.deepEqual(result, { ok: true, hasKey: true })
  } finally {
    if (previous === undefined) delete process.env.ENJOY_E2E_STUB
    else process.env.ENJOY_E2E_STUB = previous
  }
})

test("没有密码时不挡 SSH 开档", () => {
  assert.equal(guardPasswordWrite(undefined), null)
  assert.equal(guardPasswordWrite(""), null)
})

test("写密钥频道名单给测试枚举用", () => {
  assert.equal(SECRET_WRITE_CHANNELS.length >= 6, true)
})
