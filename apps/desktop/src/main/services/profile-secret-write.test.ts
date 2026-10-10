/**
 * 删档案：多把时钥匙串挂了拒绝且不写明文；最后一把整行清掉。
 * vault 读写动态 import secrets-vault（避免一跳撞 ACP / providers 桶）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { afterEach, test } from "node:test"
import { fileURLToPath } from "node:url"
import { isSecretStorageAvailable } from "./secret-storage.ts"
import { planVaultDelete, type VaultDeleteState } from "./vault-delete.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const KEY_A = "sk-AAAA-secret"
const KEY_B = "sk-BBBB-secret"
const PREV = {
  stub: process.env.ENJOY_E2E_STUB,
  userdata: process.env.ENJOY_E2E_USERDATA,
  keychain: process.env.ENJOY_E2E_KEYCHAIN
}

afterEach(() => {
  restoreEnv("ENJOY_E2E_STUB", PREV.stub)
  restoreEnv("ENJOY_E2E_USERDATA", PREV.userdata)
  restoreEnv("ENJOY_E2E_KEYCHAIN", PREV.keychain)
})

test("removeProvider 不走钥匙串预检；activate / enable 先看是否要写", () => {
  const settings = readFileSync(join(root, "ipc-settings.ts"), "utf8")
  const secrets = readFileSync(join(root, "services/secrets.ts"), "utf8")
  const vault = readFileSync(join(root, "services/secrets-vault.ts"), "utf8")
  const probe = readFileSync(join(root, "ipc-provider-probe.ts"), "utf8")
  assert.match(settings, /SecretWriteFailure/)
  assert.match(settings, /removeProfile/)
  assert.match(settings, /不走 runSecretWrite 预检/)
  assert.match(settings, /active\?\.id === id/)
  assert.match(settings, /\(current\.enabled !== false\) === input\.enabled/)
  assert.match(settings, /scheduleChatReadinessPush/)
  assert.doesNotMatch(settings, /pushChatReadinessNow/)
  assert.doesNotMatch(secrets, /allowInsecure/)
  assert.match(secrets, /planVaultDelete/)
  assert.doesNotMatch(vault, /allowInsecure/)
  assert.match(vault, /clearVault/)
  assert.match(vault, /writeVaultQuiet/)
  assert.match(vault, /读路径不得因钥匙串抛/)
  assert.match(probe, /saved: false/)
})

test("probe / upsert 进写密钥通道", () => {
  const probe = readFileSync(join(root, "ipc-provider-probe.ts"), "utf8")
  const tools = readFileSync(join(root, "ipc-agent-tools.ts"), "utf8")
  assert.match(probe, /runSecretWrite/)
  assert.match(tools, /agentTools\.upsert[\s\S]*runSecretWrite/)
})

test("钥匙串挂了：多把拒绝且不写明文，恢复后都在；最后一把整行清掉", async () => {
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = "/tmp/e2e-ud"
  delete process.env.ENJOY_E2E_KEYCHAIN
  const { writeVault, readVault, clearVault } = await import("./secrets-vault.ts")
  const { getDatabase } = await import("./database.ts")
  const db = getDatabase()
  const seeded = twoProfileVault()
  clearVault()
  await writeVault(seeded)
  const before = readBlob(db)
  assert.ok(before, "seed vault")
  assert.ok(String(before).includes(KEY_A) || String(before).includes("e2e-plain:"))

  process.env.ENJOY_E2E_KEYCHAIN = "unavailable"
  const refused = planVaultDelete(seeded, "prv_a", isSecretStorageAvailable())
  assert.equal(refused.kind, "refuse")
  assert.equal(readBlob(db), before, "refuse must leave the existing vault untouched")

  delete process.env.ENJOY_E2E_KEYCHAIN
  const recovered = await readVault()
  assert.equal(recovered.profiles.length, 2)
  assert.ok(recovered.profiles.some((row) => row.apiKey === KEY_A))
  assert.ok(recovered.profiles.some((row) => row.apiKey === KEY_B))

  const lastOnly = { activeId: "prv_a", profiles: seeded.profiles.filter((row) => row.id === "prv_a") }
  await writeVault(lastOnly)
  process.env.ENJOY_E2E_KEYCHAIN = "unavailable"
  const last = planVaultDelete(lastOnly, "prv_a", isSecretStorageAvailable())
  assert.equal(last.kind, "clear")
  clearVault()
  assert.equal(readBlob(db), undefined)
  assert.equal(dbText(db).includes(KEY_A), false)
  assert.equal(dbText(db).includes(KEY_B), false)
  delete process.env.ENJOY_E2E_KEYCHAIN
  assert.deepEqual((await readVault()).profiles, [])
})

function twoProfileVault(): VaultDeleteState<{
  id: string
  name: string
  kind: "openai"
  apiKey: string
  baseURL: string
  modelId: string
  enabled: boolean
  keys: Array<{ id: string; name: string; apiKey: string; enabled: boolean }>
}> {
  return {
    activeId: "prv_a",
    profiles: [
      keyedProfile("prv_a", "A", KEY_A),
      keyedProfile("prv_b", "B", KEY_B)
    ]
  }
}

function keyedProfile(id: string, name: string, apiKey: string) {
  return {
    id,
    name,
    kind: "openai" as const,
    apiKey,
    baseURL: "https://api.openai.com/v1",
    modelId: "gpt-4o",
    enabled: true,
    keys: [{ id: `${id}-key`, name: "default", apiKey, enabled: true }]
  }
}

function readBlob(db: { prepare: (sql: string) => { get: (key: string) => { value?: string } | undefined } }) {
  return db.prepare("SELECT value FROM secrets_vault WHERE key = ?").get("provider.vault")?.value
}

function dbText(db: { prepare: (sql: string) => { all: () => Array<{ value?: string }> } }) {
  const vault = db.prepare("SELECT value FROM secrets_vault").all()
  const settings = db.prepare("SELECT value FROM settings").all()
  return [...vault, ...settings].map((row) => String(row.value ?? "")).join("\n")
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}
