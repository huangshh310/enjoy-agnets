import assert from "node:assert/strict"
import { test } from "node:test"
import { docDisplayName, mentionDocsFromKnowledge } from "./mention-docs.ts"

test("知识文档标题剥扩展名", () => {
  assert.equal(docDisplayName("docs/登录流程说明.md"), "登录流程说明")
  const docs = mentionDocsFromKnowledge([{ id: "d1", path: "notes/readme.md" }])
  assert.equal(docs[0]?.name, "readme")
})
