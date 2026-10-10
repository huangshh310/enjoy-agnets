/**
 * 删档案：生产加密路径 + 直接 removeProfile。
 * probe C / 解不开密文 / customHeaders 凭证；basic_text 只在删空才 clear。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { afterEach, test } from "node:test"
import { fileURLToPath } from "node:url"
import { safeStorage } from "electron"
import { SecretWriteFailure } from "./secret-storage.ts"
import { planVaultDelete, profileHasSecret } from "./vault-delete.ts"

const KEY_A = "sk-AAAA-secret"
const HEADER_TOKEN = "gw-header-token"
const root = join(dirname(fileURLToPath(import.meta.url)), "..")

type StubStorage = {
  setEncryptionAvailable?: (next: boolean) => void
  setSelectedStorageBackend?: (next: string) => void
  resetForTest?: () => void
}

const stub = safeStorage as typeof safeStorage & StubStorage

afterEach(() => {
  stub.resetForTest?.()
  delete process.env.ENJOY_E2E_STUB
  delete process.env.ENJOY_E2E_USERDATA
  delete process.env.ENJOY_E2E_KEYCHAIN
})

test("probe / upsert 进写密钥通道", () => {
  const probe = readFileSync(join(root, "ipc-provider-probe.ts"), "utf8")
  const tools = readFileSync(join(root, "ipc-agent-tools.ts"), "utf8")
  assert.match(probe, /runSecretWrite/)
  assert.match(tools, /agentTools\.upsert[\s\S]*runSecretWrite/)
})

test("profileHasSecret 认 customHeaders / customBody / proxy", () => {
  assert.equal(profileHasSecret({ id: "ollama" }), false)
  assert.equal(profileHasSecret({ id: "gw", customHeaders: '{"Authorization":"Bearer x"}' }), true)
  assert.equal(profileHasSecret({ id: "gw", customBody: '{"token":"abc"}' }), true)
  assert.equal(profileHasSecret({ id: "gw", customHeaders: "{}" }), false)
  assert.equal(profileHasSecret({ id: "px", proxy: "http://user:pass@127.0.0.1:8080" }), true)
  assert.equal(
    planVaultDelete(
      {
        activeId: "prv_key",
        profiles: [{ id: "prv_key", apiKey: "sk" }, { id: "prv_gw", customHeaders: '{"x":"t"}' }]
      },
      "prv_key",
      false
    ).kind,
    "refuse"
  )
})

test("probe C：basic_text 下还有 Ollama / 网关 header 时删 Key 档案必须拒绝", async () => {
  enableProductionKeychain()
  const { writeVault, readVault, clearVault } = await import("./secrets-vault.ts")
  const { removeProfile } = await import("./profile-remove.ts")
  const { getDatabase, setSetting } = await import("./database.ts")
  const db = getDatabase()
  clearVault()
  await writeVault(probeCVault())
  const before = readBlob(db)
  assert.ok(before)
  assert.equal(String(before).includes("e2e-plain:"), false)
  const decoded = Buffer.from(String(before), "base64").toString("utf8")
  assert.equal(decoded.includes(KEY_A), true)
  setSetting(
    "agentTools.overrides",
    JSON.stringify({
      claude: { providerId: "prv_gw" },
      cursor: { providerId: "prv_ollama" }
    })
  )

  hangWriteKeepReadable()
  await assert.rejects(() => removeProfile("prv_key"), (error: unknown) => {
    assert.ok(error instanceof SecretWriteFailure)
    assert.equal(error.code, "KEYCHAIN_UNAVAILABLE")
    return true
  })
  assert.equal(readBlob(db), before)
  assert.match(
    String(db.prepare("SELECT value FROM settings WHERE key = ?").get("agentTools.overrides")?.value),
    /prv_gw/
  )

  enableProductionKeychain()
  const recovered = await readVault()
  assert.equal(recovered.profiles.length, 3)
  assert.ok(recovered.profiles.some((row) => row.id === "prv_key" && row.apiKey === KEY_A))
  assert.ok(recovered.profiles.some((row) => row.id === "prv_ollama"))
  assert.ok(recovered.profiles.some((row) => row.id === "prv_gw" && String(row.customHeaders).includes(HEADER_TOKEN)))
})

test("密文解不开且钥匙串挂了：removeProfile 回 KEYCHAIN_UNAVAILABLE，不当成功", async () => {
  enableProductionKeychain()
  const { writeVault, clearVault } = await import("./secrets-vault.ts")
  const { removeProfile } = await import("./profile-remove.ts")
  const { getDatabase } = await import("./database.ts")
  const db = getDatabase()
  clearVault()
  await writeVault({
    activeId: "prv_key",
    profiles: [keyedProfile("prv_key", "A", KEY_A)]
  })
  const before = readBlob(db)
  assert.ok(before)
  hangDecrypt()
  await assert.rejects(() => removeProfile("prv_key"), (error: unknown) => {
    assert.ok(error instanceof SecretWriteFailure)
    assert.equal(error.code, "KEYCHAIN_UNAVAILABLE")
    return true
  })
  assert.equal(readBlob(db), before)
})

test("customHeaders 凭证算秘密：basic_text 不得 clear 整行", async () => {
  enableProductionKeychain()
  const { writeVault, readVault, clearVault } = await import("./secrets-vault.ts")
  const { removeProfile } = await import("./profile-remove.ts")
  clearVault()
  await writeVault({
    activeId: "prv_key",
    profiles: [
      keyedProfile("prv_key", "A", KEY_A),
      {
        ...keyedProfile("prv_gw", "Gateway", ""),
        kind: "gateway" as const,
        apiKey: "",
        keys: [],
        customHeaders: JSON.stringify({ Authorization: `Bearer ${HEADER_TOKEN}` })
      }
    ]
  })
  hangWriteKeepReadable()
  await assert.rejects(() => removeProfile("prv_key"), (error: unknown) => {
    assert.ok(error instanceof SecretWriteFailure)
    assert.equal(error.code, "KEYCHAIN_UNAVAILABLE")
    return true
  })
  enableProductionKeychain()
  const recovered = await readVault()
  assert.equal(recovered.profiles.length, 2)
})

test("basic_text 删完一张都不剩才 clear；恢复后没有档案", async () => {
  enableProductionKeychain()
  const { writeVault, readVault, clearVault } = await import("./secrets-vault.ts")
  const { removeProfile } = await import("./profile-remove.ts")
  const { getDatabase } = await import("./database.ts")
  const db = getDatabase()
  clearVault()
  await writeVault({
    activeId: "prv_key",
    profiles: [keyedProfile("prv_key", "A", KEY_A)]
  })
  hangWriteKeepReadable()
  await removeProfile("prv_key")
  assert.equal(readBlob(db), undefined)
  enableProductionKeychain()
  assert.deepEqual((await readVault()).profiles, [])
})

function enableProductionKeychain() {
  delete process.env.ENJOY_E2E_KEYCHAIN
  delete process.env.ENJOY_E2E_STUB
  stub.setEncryptionAvailable?.(true)
  stub.setSelectedStorageBackend?.("gnome_libsecret")
}

/** 三端都能读密文但不准重加密：KEYCHAIN=unavailable 比 linux basic_text 先闸。 */
function hangWriteKeepReadable() {
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_KEYCHAIN = "unavailable"
  stub.setEncryptionAvailable?.(true)
}

function hangDecrypt() {
  stub.setEncryptionAvailable?.(false)
}

function probeCVault() {
  return {
    activeId: "prv_key",
    profiles: [
      keyedProfile("prv_key", "OpenAI", KEY_A),
      {
        ...keyedProfile("prv_ollama", "Ollama", ""),
        kind: "ollama" as const,
        apiKey: "",
        keys: [],
        baseURL: "http://127.0.0.1:11434"
      },
      {
        ...keyedProfile("prv_gw", "Gateway", ""),
        kind: "gateway" as const,
        apiKey: "",
        keys: [],
        customHeaders: JSON.stringify({ Authorization: `Bearer ${HEADER_TOKEN}` })
      }
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
    keys: apiKey ? [{ id: `${id}-key`, name: "default", apiKey, enabled: true }] : []
  }
}

function readBlob(db: { prepare: (sql: string) => { get: (key: string) => { value?: string } | undefined } }) {
  return db.prepare("SELECT value FROM secrets_vault WHERE key = ?").get("provider.vault")?.value
}
