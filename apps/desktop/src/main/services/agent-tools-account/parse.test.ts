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
import { parseOpenCodeAuth, parseProviderModelLines } from "./parse-cli-lines.ts"

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
