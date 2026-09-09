import assert from "node:assert/strict"
import { test } from "node:test"
import {
  mergeCursorAbout,
  parseAgyModels,
  parseClaudeAuth,
  parseCodexLogin,
  parseCursorModels,
  parseCursorStatus,
  parseCodexDoctor,
  parseGrokInspect,
  parseGrokModels,
  parseJsonObject,
  parseUsagePercent
} from "./parse.ts"
import { parseOmpModels, parseOpenCodeAuth, parseProviderModelLines } from "./parse-cli-lines.ts"
import { mergeOmpProviders, parseOmpAuthBrokerList } from "./parse-omp-auth.ts"

test("Cursor status 只取邮箱与登录态，丢掉 token 布尔", () => {
  const account = parseCursorStatus(`{
    "status": "authenticated",
    "isAuthenticated": true,
    "hasAccessToken": true,
    "userInfo": { "email": "dev@example.com", "firstName": "Ada", "lastName": "Lovelace" }
  }`)
  assert.equal(account?.loggedIn, true)
  assert.equal(account?.email, "dev@example.com")
  assert.equal(account?.accountName, "Ada Lovelace")
  assert.equal(JSON.stringify(account).includes("hasAccessToken"), false)
})

test("Cursor about 补套餐、版本与当前模型", () => {
  const merged = mergeCursorAbout(
    { loggedIn: true, email: "dev@example.com", authMethod: "agent login" },
    `{ "cliVersion": "2026.09.02", "subscriptionTier": "Ultra", "model": "Composer 2.5", "userEmail": "dev@example.com" }`
  )
  assert.equal(merged.tier, "Ultra")
  assert.equal(merged.cliVersion, "2026.09.02")
  assert.equal(merged.currentModel, "Composer 2.5")
})

test("Cursor models 解析 id - label 行", () => {
  const models = parseCursorModels(`Available models

auto - Auto (default)
composer-2.5 - Composer 2.5
cursor-grok-4.6-xhigh-fast - Cursor Grok 4.6 Extra High Fast
`)
  assert.equal(models.length, 3)
  assert.deepEqual(models[0], { id: "auto", label: "Auto (default)" })
  assert.equal(models.at(-1)?.id, "cursor-grok-4.6-xhigh-fast")
})

test("Claude auth status JSON", () => {
  const account = parseClaudeAuth(`{ "loggedIn": false, "authMethod": "none", "apiProvider": "firstParty" }`)
  assert.equal(account?.loggedIn, false)
  assert.equal(account?.organization, "Anthropic")
})

test("Claude 登录态带邮箱与套餐", () => {
  const account = parseClaudeAuth(
    `{ "loggedIn": true, "email": "dev@example.com", "authMethod": "oauth", "tier": "Pro", "apiProvider": "firstParty" }`
  )
  assert.equal(account?.loggedIn, true)
  assert.equal(account?.email, "dev@example.com")
  assert.equal(account?.tier, "Pro")
})

test("用量百分比只认官方字段，不编造", () => {
  assert.equal(parseUsagePercent({}), undefined)
  assert.equal(parseUsagePercent({ usedPercent: 42 }), 42)
  assert.equal(parseUsagePercent({ utilization: 0.25 }), 25)
  assert.equal(parseUsagePercent({ usage: { used: 20, limit: 80 } }), 25)
  assert.equal(parseUsagePercent({ foo: 99 }), undefined)
})

test("Codex doctor 识别自定义供应商与版本", () => {
  const parsed = parseCodexDoctor(`{
    "codexVersion": "0.153.4",
    "checks": {
      "auth.credentials": {
        "details": { "model provider requires OpenAI auth": "false" }
      }
    }
  }`)
  assert.equal(parsed.customProvider, true)
  assert.equal(parsed.cliVersion, "0.153.4")
})

test("Codex login status 未登录", () => {
  const account = parseCodexLogin("Not logged in")
  assert.equal(account.loggedIn, false)
})

test("Grok models 未登录仍列出模型", () => {
  const parsed = parseGrokModels(`You are not authenticated.

Default model: grok-4.6

Available models:
  * grok-4.6 (default)
  - grok-4.5
`)
  assert.equal(parsed.authAccount.loggedIn, false)
  assert.deepEqual(parsed.models.map((item) => item.id), ["grok-4.6", "grok-4.5"])
})

test("Grok inspect 只取版本", () => {
  assert.equal(parseGrokInspect(`{ "grokVersion": "1.0.13", "cwd": "/tmp" }`).cliVersion, "1.0.13")
})

test("agy models 跳过 Fetching 行", () => {
  const models = parseAgyModels(`Fetching available models...
gemini-3.8-flash-high	Gemini 3.8 Flash (High)
`)
  assert.deepEqual(models, [{ id: "gemini-3.8-flash-high", label: "Gemini 3.8 Flash (High)" }])
})

test("非 JSON 不抛", () => {
  assert.equal(parseJsonObject("not json"), null)
})

test("OpenCode auth list 不把 token 当账号", () => {
  const account = parseOpenCodeAuth("anthropic\nopenai")
  assert.equal(account.loggedIn, true)
  assert.equal(account.accountName, "anthropic")
  assert.equal(JSON.stringify(account).includes("token"), false)
})

test("omp models JSON 用 selector，不把供应商当模型", () => {
  const models = parseOmpModels(`{
    "models": [
      { "provider": "google-antigravity", "id": "gemini-3.6-flash", "selector": "google-antigravity/gemini-3.6-flash", "name": "Gemini 3.6 Flash" },
      { "provider": "openai", "id": "gpt-5.4", "selector": "openai/gpt-5.4", "name": "GPT-5.4" }
    ]
  }`)
  assert.deepEqual(
    models.map((item) => [item.id, item.label]),
    [
      ["google-antigravity/gemini-3.6-flash", "Gemini 3.6 Flash"],
      ["openai/gpt-5.4", "GPT-5.4"]
    ]
  )
})

test("omp 分组表展开成 provider/model，忽略表头供应商行", () => {
  const models = parseOmpModels(`google-antigravity (2)
┌──────────────────┬─────────┐
│ model            │ context │
├──────────────────┼─────────┤
│ gemini-3.6-flash │ 128k    │
│ gemini-3.1-pro   │ 128k    │
└──────────────────┴─────────┘
`)
  assert.deepEqual(
    models.map((item) => item.id),
    ["google-antigravity/gemini-3.6-flash", "google-antigravity/gemini-3.1-pro"]
  )
})

test("omp 只有供应商名时不当成可选模型", () => {
  assert.deepEqual(parseOmpModels("google-antigravity\nopenai"), [])
})

test("omp auth-broker list 只收 id/name，丢掉 token", () => {
  const listed = parseOmpAuthBrokerList(`[
    {"id":"anthropic","name":"Anthropic (Claude Pro/Max)","accessToken":"SECRET"},
    {"id":"google-antigravity","name":"Antigravity"}
  ]`)
  assert.deepEqual(
    listed.map((item) => item.id),
    ["anthropic", "google-antigravity"]
  )
  assert.equal(JSON.stringify(listed).includes("SECRET"), false)
})

test("有模型 selector 的供应商算已登录，其余可点授权", () => {
  const rows = mergeOmpProviders(
    [
      { id: "google-antigravity", name: "Antigravity" },
      { id: "anthropic", name: "Anthropic" }
    ],
    [{ id: "google-antigravity/gemini-3-flash", label: "Flash" }]
  )
  assert.equal(rows[0]?.id, "google-antigravity")
  assert.equal(rows[0]?.loggedIn, true)
  assert.equal(rows[0]?.origin, "catalog")
  assert.equal(rows[0]?.loginKind, "oauth")
  assert.equal(rows[1]?.id, "anthropic")
  assert.equal(rows[1]?.loggedIn, false)
})

test("models.yml 自定义不进 auth-broker list，也不画成可登录", () => {
  const rows = mergeOmpProviders(
    [{ id: "anthropic", name: "Anthropic" }],
    [{ id: "my-openai-compatible/fast-chat", label: "Fast Chat" }],
    ["my-openai-compatible"]
  )
  const custom = rows.find((item) => item.id === "my-openai-compatible")
  assert.equal(custom?.origin, "custom")
  assert.equal(custom?.loggedIn, true)
  assert.equal(custom?.loginKind, undefined)
  assert.equal(rows.find((item) => item.id === "anthropic")?.origin, "catalog")
})

test("provider/model 行解析丢掉 secret", () => {
  const models = parseProviderModelLines(`anthropic/claude-sonnet-4
openai/gpt-5
api_key_token_secret
`)
  assert.deepEqual(
    models.map((item) => item.id),
    ["anthropic/claude-sonnet-4", "openai/gpt-5"]
  )
})
