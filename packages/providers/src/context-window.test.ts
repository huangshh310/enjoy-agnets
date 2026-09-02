import assert from "node:assert/strict"
import test from "node:test"
import {
  lookupGatewayContextWindow,
  parseCatalogContextWindow,
  parseCatalogMaxOutput,
  resolveModelContextWindow
} from "./context-window.ts"

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

test("resolveModelContextWindow prefers catalog then gateway then profile", () => {
  assert.equal(
    resolveModelContextWindow({
      modelId: "grok-4.6",
      catalogWindow: 256_000,
      gatewayWindow: 1_000_000,
      profileWindow: 128_000
    }),
    256_000
  )
  assert.equal(
    resolveModelContextWindow({
      modelId: "grok-4.6",
      gatewayWindow: 1_000_000,
      profileWindow: 256_000
    }),
    1_000_000
  )
  assert.equal(
    resolveModelContextWindow({
      modelId: "custom-7b",
      profileWindow: 256_000
    }),
    256_000
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
})
