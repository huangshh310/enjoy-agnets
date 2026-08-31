import assert from "node:assert/strict"
import { test } from "node:test"
import { otelEndpointAllowed, toOtlpJson } from "./otel.ts"

test("OTLP 载荷不含 prompt 或密钥", () => {
  const payload = JSON.stringify(
    toOtlpJson({
      runId: "run_1",
      kind: "agent",
      modelId: "gpt-4o",
      status: "completed",
      durationMs: 1200,
      ttfoMs: 180
    })
  )
  assert.ok(payload.includes("enjoy.ttfo_ms"))
  assert.equal(payload.includes("sk-"), false)
  assert.equal(payload.includes("prompt"), false)
})

test("未配置或非法 endpoint 不得出网", () => {
  assert.equal(otelEndpointAllowed(undefined), false)
  assert.equal(otelEndpointAllowed(""), false)
  assert.equal(otelEndpointAllowed("not-a-url"), false)
  assert.equal(otelEndpointAllowed("https://otel.example/v1/traces"), true)
})

test("拒绝本机与内网 OTLP，避免 main 被当成 SSRF 代理", () => {
  assert.equal(otelEndpointAllowed("http://127.0.0.1:4318/v1/traces"), false)
  assert.equal(otelEndpointAllowed("http://localhost/v1/traces"), false)
  assert.equal(otelEndpointAllowed("http://192.168.1.8/v1/traces"), false)
  assert.equal(otelEndpointAllowed("http://169.254.169.254/latest/meta-data"), false)
})
