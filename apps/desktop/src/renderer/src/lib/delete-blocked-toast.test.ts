/**
 * 拒绝删除 toast：精选有「去作废」；自定义没有动作。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { deleteBlockedToastModel } from "./delete-blocked-toast.ts"

const COPY: Record<string, string> = {
  "settings.secretWrite.deleteBlockedKeychain": "钥匙串不可用，暂时删不了这把密钥，其余密钥不受影响",
  "settings.secretWrite.deleteBlockedRevokeHint": "如果担心这把密钥泄露，可以先到服务商后台作废它",
  "settings.secretWrite.deleteBlockedRevokeAction": "去作废"
}

test("精选供应商 toast 带去作废；自定义没有动作", () => {
  const t = (path: string) => COPY[path] ?? path
  const preset = deleteBlockedToastModel(t, "https://platform.openai.com/api-keys")
  assert.match(preset.message, /如果担心这把密钥泄露，可以先到服务商后台作废它/)
  assert.equal(preset.actionLabel, "去作废")
  assert.equal(preset.revokeUrl, "https://platform.openai.com/api-keys")
  const custom = deleteBlockedToastModel(t)
  assert.match(custom.message, /其余密钥不受影响/)
  assert.equal(custom.actionLabel, undefined)
  assert.equal(custom.revokeUrl, undefined)
})

test("删档案 toast 走统一出口，外链只开 openExternal", () => {
  const hook = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../components/settings/providers/use-provider-settings.ts"),
    "utf8"
  )
  assert.match(hook, /deleteBlockedToastModel/)
  assert.match(hook, /requestOpenExternalQuiet/)
  assert.doesNotMatch(hook, /window\.open\s*\(/)
})
