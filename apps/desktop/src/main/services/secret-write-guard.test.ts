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
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = "/tmp/enjoy-secret-write-ud"
  try {
    const result = await runSecretWrite(() => ({ hasKey: true }))
    assert.deepEqual(result, { ok: true, hasKey: true })
  } finally {
    restoreEnv("ENJOY_E2E_STUB", previousStub)
    restoreEnv("ENJOY_E2E_USERDATA", previousUd)
  }
})

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

test("没有密码时不挡 SSH 开档", () => {
  assert.equal(guardPasswordWrite(undefined), null)
  assert.equal(guardPasswordWrite(""), null)
})

test("写密钥频道名单给测试枚举用", () => {
  assert.equal(SECRET_WRITE_CHANNELS.length >= 6, true)
})
