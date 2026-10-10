/**
 * 拒绝删除提示：精选有「去作废」；无 keysURL / 自定义没有链接。不走 toast。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { deleteKeychainNoticeModel } from "./delete-keychain-notice.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

test("精选有 keysURL 带去作废；无密钥页只留供应商名", () => {
  const withLink = deleteKeychainNoticeModel({
    providerLabel: "OpenAI",
    revokeUrl: "https://platform.openai.com/api-keys"
  })
  assert.equal(withLink.hintKey, "settings.providers.deleteRevokeHint")
  assert.equal(withLink.provider, "OpenAI")
  assert.equal(withLink.linkKey, "settings.providers.deleteRevokeLink")
  assert.equal(withLink.revokeUrl, "https://platform.openai.com/api-keys")

  const homepageOnly = deleteKeychainNoticeModel({ providerLabel: "Ollama" })
  assert.equal(homepageOnly.hintKey, "settings.providers.deleteRevokeHint")
  assert.equal(homepageOnly.provider, "Ollama")
  assert.equal(homepageOnly.linkKey, undefined)
  assert.equal(homepageOnly.revokeUrl, undefined)
})

test("自定义走通用句，即使误带 revokeUrl 也不出链接", () => {
  const custom = deleteKeychainNoticeModel()
  assert.equal(custom.hintKey, "settings.providers.deleteRevokeHintGeneric")
  assert.equal(custom.linkKey, undefined)
  assert.equal(custom.revokeUrl, undefined)
  const strayUrl = deleteKeychainNoticeModel({ revokeUrl: "https://evil.example/keys" })
  assert.equal(strayUrl.hintKey, "settings.providers.deleteRevokeHintGeneric")
  assert.equal(strayUrl.linkKey, undefined)
})

test("删档案拒绝提示在确认框里，外链只开 openExternal", () => {
  const hook = readFileSync(join(root, "components/settings/providers/use-provider-settings.ts"), "utf8")
  const dialog = readFileSync(join(root, "components/settings/providers/provider-remove-dialog.tsx"), "utf8")
  const notice = readFileSync(join(root, "components/settings/providers/delete-keychain-notice.tsx"), "utf8")
  const settings = readFileSync(join(root, "components/settings/providers/providers-settings.tsx"), "utf8")
  assert.doesNotMatch(hook, /showDeleteBlockedToast|deleteBlockedToastModel/)
  assert.match(settings, /ProviderRemoveDialog/)
  assert.match(dialog, /closeOnConfirm=\{false\}/)
  assert.match(dialog, /DeleteKeychainNotice/)
  assert.match(notice, /data-testid="delete-keychain-unavailable"/)
  assert.match(notice, /data-testid="delete-revoke-hint"/)
  assert.match(notice, /data-testid="delete-revoke-link"/)
  assert.match(notice, /requestOpenExternalQuiet/)
  assert.doesNotMatch(notice, /window\.open\s*\(/)
  assert.doesNotMatch(notice, /<Button/)
  assert.doesNotMatch(notice, /KEYCHAIN_UNAVAILABLE/)
})
