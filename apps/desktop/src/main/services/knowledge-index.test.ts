import assert from "node:assert/strict"
import { test } from "node:test"
import { hashText, skipIfUnchanged } from "./knowledge-skip.ts"

test("相同文本 hash 稳定，未变 ready 文档跳过", () => {
  assert.equal(hashText("hello"), hashText("hello"))
  assert.notEqual(hashText("hello"), hashText("hello!"))
  assert.equal(
    skipIfUnchanged({ path: "a.md", hash: hashText("hello"), status: "ready" }, hashText("hello")),
    true
  )
  assert.equal(
    skipIfUnchanged({ path: "a.md", hash: hashText("old"), status: "ready" }, hashText("hello")),
    false
  )
  assert.equal(skipIfUnchanged(undefined, hashText("hello")), false)
})
