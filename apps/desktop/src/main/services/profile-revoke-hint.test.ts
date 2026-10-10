/**
 * 精选 preset 才有 revokeUrl；自定义端点没有。禁止用用户 baseURL。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { profileRevokeHint, type CuratedRevokePreset } from "./profile-revoke-hint.ts"

const OPENAI: CuratedRevokePreset = {
  kind: "openai",
  name: "OpenAI",
  keysURL: "https://platform.openai.com/api-keys",
  docsURL: "https://platform.openai.com/docs"
}

const CUSTOM: CuratedRevokePreset = {
  kind: "custom",
  name: "Custom endpoint"
}

const PRESETS = [OPENAI, CUSTOM]

test("精选供应商有 revokeUrl 与 providerLabel", () => {
  const hint = profileRevokeHint(
    { kind: "openai", baseURL: "https://my-proxy.example/v1" },
    PRESETS
  )
  assert.equal(hint.revokeUrl, "https://platform.openai.com/api-keys")
  assert.equal(hint.providerLabel, "OpenAI")
})

test("自定义端点没有 revokeUrl", () => {
  const hint = profileRevokeHint(
    { kind: "custom", baseURL: "https://evil.example/v1" },
    PRESETS
  )
  assert.deepEqual(hint, {})
})

test("用户 baseURL 即使是 https 也不当 revokeUrl；http 文档丢掉", () => {
  assert.equal(
    profileRevokeHint({ kind: "openai", baseURL: "https://stolen.keys.example" }, PRESETS).revokeUrl,
    "https://platform.openai.com/api-keys"
  )
  const httpOnly: CuratedRevokePreset = {
    kind: "openai",
    name: "OpenAI",
    keysURL: "http://platform.openai.com/api-keys",
    docsURL: "http://platform.openai.com/docs"
  }
  assert.deepEqual(profileRevokeHint({ kind: "openai" }, [httpOnly]), {
    providerLabel: "OpenAI"
  })
})

test("removeProvider 拒绝回执带精选 revokeUrl", () => {
  const ipc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../ipc-settings.ts"), "utf8")
  assert.match(ipc, /revokeHintForProfileId/)
  assert.match(ipc, /secretWriteBlocked\(error\.code, await revokeHintForProfileId/)
})

test("区域 keysURL 优先；没有密钥页回落文档首页", () => {
  const regional: CuratedRevokePreset = {
    kind: "kimi",
    name: "Kimi",
    keysURL: "https://platform.moonshot.cn/console/api-keys",
    docsURL: "https://platform.moonshot.cn/docs",
    regions: [
      { id: "intl", keysURL: "https://platform.moonshot.ai/console/api-keys" }
    ]
  }
  assert.equal(
    profileRevokeHint({ kind: "kimi", regionId: "intl" }, [regional]).revokeUrl,
    "https://platform.moonshot.ai/console/api-keys"
  )
  const homepageOnly: CuratedRevokePreset = {
    kind: "ollama",
    name: "Ollama",
    docsURL: "https://ollama.com/"
  }
  assert.equal(profileRevokeHint({ kind: "ollama" }, [homepageOnly]).revokeUrl, "https://ollama.com/")
})
