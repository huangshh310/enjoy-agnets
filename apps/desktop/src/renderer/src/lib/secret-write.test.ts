/**
 * 密钥写回：结构化码优先，抛错只认钥匙串句子，绝不把英文还给 UI。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  forceSecretWriteForE2e,
  isSecretWriteBlocked,
  readSecretWrite,
  runSecretWrite,
  secretWriteBlockedCode,
  secretWriteCodeFromThrown,
  secretWriteCopyKey,
  secretWriteOk,
  secretWriteSurfaceOf,
  secretWriteUi
} from "./secret-write.ts"

test("KEYCHAIN_UNAVAILABLE 结构化失败走红字文案", () => {
  const failed = readSecretWrite({ ok: false, code: "KEYCHAIN_UNAVAILABLE" })
  assert.deepEqual(failed, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
  assert.equal(secretWriteCopyKey("KEYCHAIN_UNAVAILABLE"), "settings.secretWrite.writeFailedKeychain")
  assert.equal(secretWriteSurfaceOf("KEYCHAIN_UNAVAILABLE"), "writeFail")
  assert.equal(secretWriteBlockedCode({ ok: false, code: "KEYCHAIN_UNAVAILABLE" }), "KEYCHAIN_UNAVAILABLE")
  assert.equal(isSecretWriteBlocked({ ok: false, code: "KEYCHAIN_UNAVAILABLE" }), true)
})

test("其它 code 和未知抛错都走没存上", () => {
  const other = readSecretWrite({ ok: false, code: "DISK_FULL" })
  assert.equal(other.ok, false)
  if (other.ok) return
  assert.equal(other.code, "UNKNOWN")
  assert.equal(secretWriteCopyKey("UNKNOWN"), "settings.secretWrite.failed")
  assert.equal(secretWriteCodeFromThrown(new Error("ECONNRESET")), "UNKNOWN")
  assert.equal(secretWriteBlockedCode({ ok: false, code: "DISK_FULL" }), null)
  assert.equal(secretWriteOk({ ok: true, providers: [] }), true)
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

test("快照 false 走黄条；写失败 KEYCHAIN 走红字；未来 NOT_INSTALLED 可切黄条", () => {
  assert.deepEqual(secretWriteUi(false, null), { preflight: true, errorCode: null })
  assert.deepEqual(secretWriteUi(false, "KEYCHAIN_UNAVAILABLE"), { preflight: true, errorCode: null })
  assert.deepEqual(secretWriteUi(true, "KEYCHAIN_UNAVAILABLE"), {
    preflight: false,
    errorCode: "KEYCHAIN_UNAVAILABLE"
  })
  assert.deepEqual(secretWriteUi(undefined, "UNKNOWN"), { preflight: false, errorCode: "UNKNOWN" })
  assert.deepEqual(secretWriteUi(true, null), { preflight: false, errorCode: null })
})

test("e2e 可强制下一次写失败", async () => {
  forceSecretWriteForE2e("KEYCHAIN_UNAVAILABLE")
  const forced = await runSecretWrite(async () => ({ ok: true }) as never)
  assert.deepEqual(forced, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
})
