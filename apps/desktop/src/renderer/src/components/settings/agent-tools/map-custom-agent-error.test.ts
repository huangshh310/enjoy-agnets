import assert from "node:assert/strict"
import { test } from "node:test"
import { mapCustomAgentFormError } from "./map-custom-agent-error.ts"

test("白名单拒绝映射成人话，不露出 Basename", () => {
  const raw = "Refusing to spawn 'bash'. Basename must be a known ACP CLI."
  const shown = mapCustomAgentFormError(raw, (_path, vars) => `无法使用「${vars?.command ?? ""}」。请改用支持的助手程序名。`)
  assert.equal(shown, "无法使用「bash」。请改用支持的助手程序名。")
  assert.doesNotMatch(shown, /Basename|stdio|spawn/i)
})

test("英文界面同样避开行话", () => {
  const raw = "Error: Refusing to spawn '/usr/bin/npx'. Basename must be a known ACP CLI."
  const shown = mapCustomAgentFormError(raw, (_path, vars) => `Can't use “${vars?.command ?? ""}”. Please pick a supported assistant name.`)
  assert.equal(shown, "Can't use “/usr/bin/npx”. Please pick a supported assistant name.")
})

test("其它错误原样返回", () => {
  assert.equal(mapCustomAgentFormError("Custom working directory does not exist.", (path) => path), "Custom working directory does not exist.")
})

test("钥匙串抛错走人话，不摊英文", () => {
  const shown = mapCustomAgentFormError(
    "Error invoking remote method 'agentTools.upsertCustom': Error: OS keychain encryption is not available on this machine.",
    (path) => path
  )
  assert.equal(shown, "settings.secretWrite.writeFailedKeychain")
  assert.doesNotMatch(shown, /keychain encryption|isEncryptionAvailable/i)
})
