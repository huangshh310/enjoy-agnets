/**
 * models.yml 只抽自定义供应商 id，禁止读 apiKey。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { parseOmpCustomProviderIds } from "./parse-omp-custom.ts"

const SAMPLE = `
providers:
  my-openai-compatible:
    baseUrl: https://api.example.com/v1
    api: openai-completions
    apiKey: SUPER_SECRET_KEY
    models:
      - id: fast-chat
        name: Fast Chat
  local-proxy:
    auth: none
    baseUrl: http://127.0.0.1:4000/v1
disabledProviders:
  - gone-gateway
providers_ignored:
  nope:
`

test("只抽 models.yml 自定义 id，丢掉密钥与已禁用", () => {
  const ids = parseOmpCustomProviderIds(SAMPLE)
  assert.deepEqual(ids, ["my-openai-compatible", "local-proxy"])
  assert.equal(JSON.stringify(ids).includes("SECRET"), false)
  assert.equal(SAMPLE.includes("SUPER_SECRET_KEY"), true)
})
