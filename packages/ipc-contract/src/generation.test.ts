import assert from "node:assert/strict"
import { test } from "node:test"
import { AiGenerateInput } from "./generation.ts"

test("ai.generate 拒绝未知字段", () => {
  const parsed = AiGenerateInput.safeParse({
    kind: "text",
    sessionId: "s1",
    modelId: "gpt-4o",
    extra: true
  })
  assert.equal(parsed.success, false)
})

test("ai.generate 接受合法 text 请求", () => {
  const parsed = AiGenerateInput.safeParse({
    kind: "text",
    sessionId: "s1",
    modelId: "gpt-4o",
    prompt: "hi"
  })
  assert.equal(parsed.success, true)
})

test("kind=agent 必须带 workspaceId", () => {
  const missing = AiGenerateInput.safeParse({
    kind: "agent",
    sessionId: "s1",
    modelId: "gpt-4o",
    prompt: "hi"
  })
  assert.equal(missing.success, false)
  const ok = AiGenerateInput.safeParse({
    kind: "agent",
    sessionId: "s1",
    workspaceId: "ws1",
    modelId: "gpt-4o",
    prompt: "hi"
  })
  assert.equal(ok.success, true)
})
