/**
 * 删档案不挡钥匙串；激活 / 启用只在真要写 vault 时过闸。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

test("removeProvider 不走钥匙串闸；activate / enable 先看是否要写", () => {
  const settings = readFileSync(join(root, "ipc-settings.ts"), "utf8")
  const secrets = readFileSync(join(root, "services/secrets.ts"), "utf8")
  const vault = readFileSync(join(root, "services/secrets-vault.ts"), "utf8")
  assert.match(settings, /snapshotWithoutSecretWrite/)
  assert.match(settings, /removeProfile/)
  assert.match(settings, /active\?\.id === id/)
  assert.match(settings, /\(current\.enabled !== false\) === input\.enabled/)
  assert.match(settings, /scheduleChatReadinessPush/)
  assert.doesNotMatch(settings, /pushChatReadinessNow/)
  assert.match(secrets, /allowInsecure: true/)
  assert.match(vault, /writeVaultQuiet/)
  assert.match(vault, /读路径不得因钥匙串抛/)
})

test("probe / upsert 进写密钥通道", () => {
  const probe = readFileSync(join(root, "ipc-provider-probe.ts"), "utf8")
  const tools = readFileSync(join(root, "ipc-agent-tools.ts"), "utf8")
  assert.match(probe, /runSecretWrite/)
  assert.match(tools, /agentTools\.upsert[\s\S]*runSecretWrite/)
})
