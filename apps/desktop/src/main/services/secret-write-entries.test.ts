/**
 * 每条写密钥通道在钥匙串不可用时都是同一失败形状。
 * 写原语动态 import，避免静态拉进 ACP 桶（strip-types 不认 private readonly）。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { SECRET_WRITE_CHANNELS, secretWriteBlockedCode } from "@enjoy-agents/ipc-contract"
import { SecretWriteFailure } from "./secret-storage.ts"
import { runSecretWrite } from "./secret-write-guard.ts"

const PREV_STUB = process.env.ENJOY_E2E_STUB
const PREV_KEYCHAIN = process.env.ENJOY_E2E_KEYCHAIN

afterEach(() => {
  restoreEnv("ENJOY_E2E_STUB", PREV_STUB)
  restoreEnv("ENJOY_E2E_KEYCHAIN", PREV_KEYCHAIN)
})

test("名单覆盖全部写密钥 IPC", () => {
  assert.deepEqual(
    [...SECRET_WRITE_CHANNELS].sort(),
    [
      "agentTools.upsert",
      "agentTools.upsertCustom",
      "settings.activateProvider",
      "settings.duplicateProvider",
      "settings.probeProvider",
      "settings.saveSecret",
      "settings.setActiveModel",
      "settings.setDefaultModel",
      "settings.setHarness",
      "settings.setProviderEnabled",
      "settings.upsertProvider",
      "workspace.openSsh",
      "workspace.sshHosts.upsert"
    ]
  )
})

test("fixture 下 vault / ssh 密码都抛 KEYCHAIN_UNAVAILABLE", async () => {
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_KEYCHAIN = "unavailable"
  const { writeVault } = await import("./secrets-vault.ts")
  const { setSshPassword } = await import("./ssh/ssh-password-vault.ts")
  await assert.rejects(
    () => writeVault({ activeId: null, profiles: [] }),
    (error: unknown) => error instanceof SecretWriteFailure && error.code === "KEYCHAIN_UNAVAILABLE"
  )
  assert.throws(
    () => setSshPassword("host_1", "pw"),
    (error: unknown) => error instanceof SecretWriteFailure && error.code === "KEYCHAIN_UNAVAILABLE"
  )
})

test("每条写通道在不可用时都回同一 { ok:false, code }", async () => {
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_KEYCHAIN = "unavailable"
  for (const channel of SECRET_WRITE_CHANNELS) {
    const result = await runSecretWrite(async () => ({ channel }))
    assert.equal(secretWriteBlockedCode(result), "KEYCHAIN_UNAVAILABLE", channel)
    assert.deepEqual(result, { ok: false, code: "KEYCHAIN_UNAVAILABLE" })
  }
})

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}
