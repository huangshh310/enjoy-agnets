import assert from "node:assert/strict"
import { test } from "node:test"
import {
  LINUX_INSECURE_SECRET_BACKEND,
  isE2eKeychainUnavailable,
  isSecretStorageAvailable
} from "./secret-storage.ts"

test("Linux basic_text 当不可用，其它后端可用", () => {
  assert.equal(
    isSecretStorageAvailable({
      encryptionAvailable: true,
      linuxBackend: LINUX_INSECURE_SECRET_BACKEND,
      platform: "linux"
    }),
    false
  )
  assert.equal(
    isSecretStorageAvailable({
      encryptionAvailable: true,
      linuxBackend: "gnome_libsecret",
      platform: "linux"
    }),
    true
  )
})

test("macOS / Windows 只看 isEncryptionAvailable", () => {
  assert.equal(
    isSecretStorageAvailable({ encryptionAvailable: true, platform: "darwin" }),
    true
  )
  assert.equal(
    isSecretStorageAvailable({ encryptionAvailable: false, platform: "win32" }),
    false
  )
})

test("未打包 stub 默认当可用，只有 KEYCHAIN=unavailable 才挂", () => {
  assert.equal(
    isSecretStorageAvailable({
      encryptionAvailable: false,
      env: { ENJOY_E2E_STUB: "1" },
      packaged: false
    }),
    true
  )
})

test("ENJOY_E2E_KEYCHAIN=unavailable 仅 stub 且未打包生效", () => {
  const env = { ENJOY_E2E_STUB: "1", ENJOY_E2E_KEYCHAIN: "unavailable" }
  assert.equal(isE2eKeychainUnavailable(env, false), true)
  assert.equal(isE2eKeychainUnavailable(env, true), false)
  assert.equal(isE2eKeychainUnavailable({ ENJOY_E2E_KEYCHAIN: "unavailable" }, false), false)
  assert.equal(
    isSecretStorageAvailable({
      encryptionAvailable: true,
      platform: "darwin",
      env,
      packaged: false
    }),
    false
  )
})
