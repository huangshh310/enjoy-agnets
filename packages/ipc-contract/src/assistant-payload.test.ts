import assert from "node:assert/strict"
import { test } from "node:test"
import { parseAssistantPayload, serializeAssistantPayload } from "./assistant-payload.ts"

test("纯文本不包信封", () => {
  assert.equal(serializeAssistantPayload({ content: "hello" }), "hello")
})

test("带来源时写入信封并回读", () => {
  const raw = serializeAssistantPayload({
    content: "cited",
    sources: [{ sourceId: "s1", title: "readme", path: "README.md", startLine: 1 }]
  })
  const parsed = parseAssistantPayload(raw)
  assert.equal(parsed.content, "cited")
  assert.equal(parsed.sources?.[0]?.path, "README.md")
})

test("生图 runKind 写入信封并回读", () => {
  const raw = serializeAssistantPayload({
    content: "",
    runKind: "image",
    assets: [{ assetId: "ast_1", mediaType: "image/png", name: "shot.png" }]
  })
  const parsed = parseAssistantPayload(raw)
  assert.equal(parsed.runKind, "image")
  assert.equal(parsed.assets?.[0]?.assetId, "ast_1")
  assert.equal(parseAssistantPayload("plain").runKind, undefined)
})

test("正文里的引导词块写入信封并剥离围栏", () => {
  const raw = serializeAssistantPayload({
    content: "好了。\n\n:::enjoy-actions\n- [queue] 补测试: 请补单测\n:::\n"
  })
  assert.notEqual(raw, "好了。")
  const parsed = parseAssistantPayload(raw)
  assert.equal(parsed.content.includes(":::"), false)
  assert.equal(parsed.actionChips?.[0]?.label, "补测试")
})

test("本轮模型 stamp 走信封，换模后旧泡能回读", () => {
  const raw = serializeAssistantPayload({
    content: "ok",
    modelId: "opus",
    runtimeId: "claude"
  })
  assert.notEqual(raw, "ok")
  const parsed = parseAssistantPayload(raw)
  assert.equal(parsed.modelId, "opus")
  assert.equal(parsed.runtimeId, "claude")
  assert.equal(parseAssistantPayload("plain").modelId, undefined)
})

test("agent runKind 即使纯文本也走信封", () => {
  const raw = serializeAssistantPayload({ content: "hello", runKind: "agent" })
  assert.notEqual(raw, "hello")
  assert.equal(parseAssistantPayload(raw).runKind, "agent")
  assert.equal(parseAssistantPayload(raw).content, "hello")
})
