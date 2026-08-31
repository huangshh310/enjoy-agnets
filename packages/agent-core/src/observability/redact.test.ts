import assert from "node:assert/strict"
import { test } from "node:test"
import { redactMetric, redactString } from "./redact.ts"

test("脱敏 API Key 与 Bearer", () => {
  assert.equal(redactString("sk-abcdefghijk"), "sk-[redacted]")
  assert.match(redactString("Bearer abc.def"), /\[redacted\]/)
})

test("prompt / runtimeContext / args 不进指标", () => {
  const redacted = redactMetric({
    modelId: "gpt-4o",
    prompt: "secret user text",
    runtimeContext: { workspaceRoot: "C:/proj" },
    args: { path: "a.ts" },
    apiKey: "sk-live"
  })
  assert.equal(redacted.prompt, "[redacted]")
  assert.equal(redacted.runtimeContext, "[redacted]")
  assert.equal(redacted.args, "[redacted]")
  assert.equal(redacted.apiKey, "[redacted]")
  assert.equal(redacted.modelId, "gpt-4o")
})
