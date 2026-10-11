import assert from "node:assert/strict"
import { test } from "node:test"
import { ChatReadiness } from "./chat-readiness.ts"
import {
  SECRET_WRITE_CHANNELS,
  SecretWriteBlocked,
  SecretWriteErrorCode,
  isSecretWriteBlocked,
  secretWriteBlocked,
  secretWriteBlockedCode,
  secretWriteOk,
  secretWriteOkPayload
} from "./secret-write.ts"

test("SecretWriteErrorCode 只有 KEYCHAIN_UNAVAILABLE，不加 LOCKED", () => {
  assert.deepEqual(SecretWriteErrorCode.options, ["KEYCHAIN_UNAVAILABLE"])
  assert.equal(SecretWriteErrorCode.safeParse("KEYCHAIN_LOCKED").success, false)
})

test("失败只回 { ok:false, code }，多余字段拒收", () => {
  const blocked = secretWriteBlocked()
  assert.deepEqual(blocked, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
  assert.equal(isSecretWriteBlocked(blocked), true)
  assert.equal(secretWriteBlockedCode(blocked), "KEYCHAIN_UNAVAILABLE")
  assert.equal(SecretWriteBlocked.safeParse({ ok: false, code: "KEYCHAIN_UNAVAILABLE", extra: 1 }).success, false)
})

test("成功把既有 payload 摊在 ok:true 旁边", () => {
  const ok = secretWriteOk({ providers: [] as const, hasKey: false })
  assert.equal(ok.ok, true)
  assert.equal(ok.hasKey, false)
  assert.deepEqual(ok.providers, [])
  assert.equal(isSecretWriteBlocked(ok), false)
  assert.equal(secretWriteBlockedCode(ok), null)
  assert.deepEqual(secretWriteOkPayload(ok), { providers: [], hasKey: false })
})

test("快照缺 secretStorageAvailable 当 true，显式 false 保留", () => {
  const missing = ChatReadiness.parse({
    ready: false,
    engineCount: 1,
    engines: [],
    localModels: [],
    apiKeys: []
  })
  assert.equal(missing.secretStorageAvailable, true)
  const down = ChatReadiness.parse({
    ready: false,
    engineCount: 1,
    engines: [],
    localModels: [],
    apiKeys: [],
    secretStorageAvailable: false
  })
  assert.equal(down.secretStorageAvailable, false)
})

test("写密钥频道名单覆盖全部入口", () => {
  assert.ok(SECRET_WRITE_CHANNELS.includes("settings.upsertProvider"))
  assert.ok(SECRET_WRITE_CHANNELS.includes("settings.saveSecret"))
  assert.ok(SECRET_WRITE_CHANNELS.includes("settings.setHarness"))
  assert.ok(SECRET_WRITE_CHANNELS.includes("agentTools.upsertCustom"))
  assert.ok(SECRET_WRITE_CHANNELS.includes("workspace.openSsh"))
  assert.ok(SECRET_WRITE_CHANNELS.includes("workspace.sshHosts.upsert"))
})
