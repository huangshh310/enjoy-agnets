import assert from "node:assert/strict"
import { test } from "node:test"
import { mapUsageTokens } from "./map-usage.ts"

test("缓存和推理没返回时是未知而不是 0", () => {
  const mapped = mapUsageTokens({ inputTokens: 3, outputTokens: 5, totalTokens: 8 })
  assert.deepEqual(mapped, {
    inputTokens: 3,
    outputTokens: 5,
    totalTokens: 8
  })
  assert.equal(mapped && "cacheReadTokens" in mapped, false)
  assert.equal(mapped && "reasoningTokens" in mapped, false)
})

test("Anthropic cache_creation / cache_read 与 OpenAI cached / reasoning", () => {
  const anthropic = mapUsageTokens({
    inputTokens: 100,
    outputTokens: 20,
    cache_creation_input_tokens: 40,
    cache_read_input_tokens: 15
  })
  assert.equal(anthropic?.cacheWriteTokens, 40)
  assert.equal(anthropic?.cacheReadTokens, 15)
  assert.equal(anthropic?.reasoningTokens, undefined)

  const openai = mapUsageTokens({
    promptTokens: 80,
    completionTokens: 30,
    prompt_tokens_details: { cached_tokens: 12 },
    completion_tokens_details: { reasoning_tokens: 7 }
  })
  assert.equal(openai?.inputTokens, 80)
  assert.equal(openai?.cacheReadTokens, 12)
  assert.equal(openai?.reasoningTokens, 7)
})
