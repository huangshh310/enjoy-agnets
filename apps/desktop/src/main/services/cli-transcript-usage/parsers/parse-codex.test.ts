/**
 * Codex 模型列：custom provider 不是模型名；拆分全 0 保持 0。
 */
import assert from "node:assert/strict"
import test from "node:test"
import { CUSTOM_UPSTREAM_MODEL_KEY } from "./parse-usage.ts"
import { parseCodexTranscript } from "./parse-codex.ts"

test("有真实 model 时行为不变", () => {
  const text = [
    JSON.stringify({
      timestamp: "2026-09-08T06:32:11.040Z",
      type: "session_meta",
      payload: { cwd: "/Users/x/demo", model: "gpt-5" }
    }),
    JSON.stringify({
      timestamp: "2026-09-08T06:32:12.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: { total_token_usage: { input_tokens: 40, cached_input_tokens: 5, output_tokens: 8, total_tokens: 53 } }
      }
    })
  ].join("\n")
  const usage = parseCodexTranscript(text)
  assert.equal(usage.model, "gpt-5")
  assert.equal(usage.inputTokens, 40)
})

test("custom provider 且无 model → custom-upstream，拆分保持 0", () => {
  const text = [
    JSON.stringify({
      timestamp: "2026-09-10T21:22:46.000Z",
      type: "session_meta",
      payload: { cwd: "/Users/x/enjoy-agnets", model: "", model_provider: "custom" }
    }),
    JSON.stringify({
      timestamp: "2026-09-10T21:22:47.000Z",
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 0,
            cached_input_tokens: 0,
            cache_write_input_tokens: 0,
            output_tokens: 0,
            reasoning_output_tokens: 0,
            total_tokens: 286812
          }
        }
      }
    })
  ].join("\n")
  const usage = parseCodexTranscript(text)
  assert.equal(usage.model, CUSTOM_UPSTREAM_MODEL_KEY)
  assert.notEqual(usage.model, "custom")
  assert.equal(usage.inputTokens, 0)
  assert.equal(usage.outputTokens, 0)
  assert.equal(usage.cacheTokens, 0)
  assert.equal(usage.totalTokens, 286812)
  assert.equal(usage.project, "enjoy-agnets")
})
