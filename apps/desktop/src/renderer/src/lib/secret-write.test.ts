/**
 * 密钥写回：结构化码优先，抛错只认钥匙串句子，绝不把英文还给 UI。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  readSecretWrite,
  runSecretWrite,
  secretWriteCodeFromThrown,
  secretWriteCopyKey
} from "./secret-write.ts"

test("KEYCHAIN_UNAVAILABLE 结构化失败不看英文句子", () => {
  const failed = readSecretWrite({ ok: false, code: "KEYCHAIN_UNAVAILABLE" })
  assert.deepEqual(failed, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
  assert.equal(secretWriteCopyKey("KEYCHAIN_UNAVAILABLE"), "settings.secretWrite.keychainUnavailable")
})

test("其它 code 和未知抛错都走没存上", () => {
  assert.equal(readSecretWrite({ ok: false, code: "DISK_FULL" }).ok, false)
  if (readSecretWrite({ ok: false, code: "DISK_FULL" }).ok) return
  assert.equal(readSecretWrite({ ok: false, code: "DISK_FULL" }).code, "UNKNOWN")
  assert.equal(secretWriteCopyKey("UNKNOWN"), "settings.secretWrite.failed")
  assert.equal(secretWriteCodeFromThrown(new Error("ECONNRESET")), "UNKNOWN")
})

test("抛错认 Electron 包装后的钥匙串句", () => {
  const err = new Error(
    "Error invoking remote method 'settings.upsertProvider': Error: OS keychain encryption is not available on this machine."
  )
  assert.equal(secretWriteCodeFromThrown(err), "KEYCHAIN_UNAVAILABLE")
  assert.deepEqual(readSecretWrite(undefined, err), { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
})

test("旧成功体没有 ok 仍当成功；ok:true 剥掉 ok", () => {
  const legacy = readSecretWrite({ hasKey: true, providers: [] })
  assert.deepEqual(legacy, { ok: true, value: { hasKey: true, providers: [] } })
  const wrapped = readSecretWrite({ ok: true, hasKey: true, providers: [] })
  assert.deepEqual(wrapped, { ok: true, value: { hasKey: true, providers: [] } })
})

test("runSecretWrite 接住 throw 和 ok:false", async () => {
  const thrown = await runSecretWrite(async () => {
    throw new Error("safeStorage.isEncryptionAvailable() is false")
  })
  assert.deepEqual(thrown, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
  const coded = await runSecretWrite(async () => ({ ok: false, code: "KEYCHAIN_UNAVAILABLE" }) as never)
  assert.deepEqual(coded, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
})
