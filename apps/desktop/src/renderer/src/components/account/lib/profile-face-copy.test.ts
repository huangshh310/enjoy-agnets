/**
 * 资料页钥匙串句：macOS 与其它平台分开；短句不重复完整句。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { vaultChipKey, vaultCopyKey, vaultFace } from "./profile-face-copy.ts"

test("vaultFace: 没密钥是 empty，钥匙串可用才是 keychain", () => {
  assert.equal(vaultFace({ hasKey: false, secretStorageAvailable: true }), "empty")
  assert.equal(vaultFace({ hasKey: true, secretStorageAvailable: true }), "keychain")
  assert.equal(vaultFace({ hasKey: true, secretStorageAvailable: false }), "neutral")
})

test("vaultCopyKey: macOS 用钥匙串，Linux/Windows 用系统密钥库", () => {
  assert.equal(vaultCopyKey("keychain", true), "pages.account.security.vaultProtected")
  assert.equal(vaultCopyKey("keychain", false), "pages.account.security.vaultProtectedOther")
  assert.equal(vaultCopyKey("empty", false), "pages.account.security.vaultEmpty")
  assert.equal(vaultCopyKey("neutral", true), "pages.account.security.vaultNeutral")
})

test("vaultChipKey: 短句不带钥匙串 / 密钥库", () => {
  assert.equal(vaultChipKey("keychain"), "pages.account.security.vaultSavedShort")
  assert.equal(vaultChipKey("neutral"), "pages.account.security.vaultSavedShort")
  assert.equal(vaultChipKey("empty"), "pages.account.security.vaultEmpty")
})
