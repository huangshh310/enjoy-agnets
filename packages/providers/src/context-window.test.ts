import assert from "node:assert/strict"
import test from "node:test"
import { publishedContextWindow } from "./published-context-window.ts"
import {
  lookupGatewayContextWindow,
  parseCatalogContextWindow,
  parseCatalogMaxOutput,
  resolveModelContextWindow
} from "./context-window.ts"

test("publishedContextWindow 只认厂商公开家族", () => {
  assert.equal(publishedContextWindow("claude-sonnet-4-5"), 200_000)
  assert.equal(publishedContextWindow("grok-4.6"), 2_000_000)
  assert.equal(publishedContextWindow("deepseek-flash"), 1_000_000)
  assert.equal(publishedContextWindow("deepseek-v4-flash"), 1_000_000)
  assert.equal(publishedContextWindow("deepseek-v4-pro"), 1_000_000)
  assert.equal(publishedContextWindow("deepseek-flash[1m]"), 1_000_000)
  assert.equal(publishedContextWindow("deepseek-chat"), undefined)
  assert.equal(publishedContextWindow("grok-4"), undefined)
  assert.equal(publishedContextWindow("grok-4-fast"), undefined)
  assert.equal(publishedContextWindow("not-a-model"), undefined)
})

test("parseCatalogContextWindow reads vendor field names", () => {
  assert.equal(parseCatalogContextWindow({ context_window: 256000 }), 256000)
  assert.equal(parseCatalogContextWindow({ max_model_len: "131072" }), 131072)
  assert.equal(parseCatalogContextWindow({ contextLength: 200000 }), 200000)
  assert.equal(parseCatalogContextWindow({ id: "grok-4.6" }), undefined)
  assert.equal(parseCatalogContextWindow({ context_window: 0 }), undefined)
})

test("parseCatalogMaxOutput reads max_tokens", () => {
  assert.equal(parseCatalogMaxOutput({ max_tokens: 8192 }), 8192)
  assert.equal(parseCatalogMaxOutput({ maxOutputTokens: 4096 }), 4096)
})

test("resolveModelContextWindow prefers profile then catalog then gateway", () => {
  // 用户手填 profileWindow 拥有最高优先级，覆盖 gateway 与 catalog
  assert.equal(
    resolveModelContextWindow({
      modelId: "grok-4.6",
      catalogWindow: 256_000,
      gatewayWindow: 1_000_000,
      profileWindow: 128_000
    }),
    128_000
  )
  assert.equal(
    resolveModelContextWindow({
      modelId: "grok-4.6",
      gatewayWindow: 1_000_000,
      profileWindow: 256_000
    }),
    256_000
  )
  // 未手填时，优先使用目录探测值
  assert.equal(
    resolveModelContextWindow({
      modelId: "grok-4.6",
      catalogWindow: 512_000,
      gatewayWindow: 1_000_000
    }),
    512_000
  )
  // 仅有网关预设时回落网关
  assert.equal(
    resolveModelContextWindow({
      modelId: "grok-4.6",
      gatewayWindow: 1_000_000
    }),
    1_000_000
  )
  assert.equal(resolveModelContextWindow({ modelId: "unknown" }), undefined)
})

test("lookupGatewayContextWindow matches exact, provider prefix, and suffix", () => {
  const entries = [
    { id: "xai/grok-4.6", contextWindow: 2_000_000 },
    { id: "anthropic/claude-sonnet-4", contextWindow: 200_000 }
  ]
  assert.equal(lookupGatewayContextWindow(entries, "xai/grok-4.6"), 2_000_000)
  assert.equal(lookupGatewayContextWindow(entries, "grok-4.6", "xai"), 2_000_000)
  assert.equal(lookupGatewayContextWindow(entries, "grok-4.6"), 2_000_000)
  assert.equal(lookupGatewayContextWindow(entries, "claude-sonnet-4", "anthropic"), 200_000)
  assert.equal(lookupGatewayContextWindow(entries, "no-such-model"), undefined)
  const deepseek = [
    { id: "deepseek/deepseek-v4.1-flash", contextWindow: 1_048_576 },
    { id: "deepseek/deepseek-v4-flash", contextWindow: 1_000_000 }
  ]
  assert.equal(lookupGatewayContextWindow(deepseek, "deepseek-flash"), 1_048_576)
  assert.equal(lookupGatewayContextWindow(deepseek, "deepseek-flash[1m]"), 1_048_576)
  assert.equal(
    lookupGatewayContextWindow([{ id: "deepseek/deepseek-v4-flash", contextWindow: 1_000_000 }], "deepseek-flash"),
    1_000_000
  )
})
