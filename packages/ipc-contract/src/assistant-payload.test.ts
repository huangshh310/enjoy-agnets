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
