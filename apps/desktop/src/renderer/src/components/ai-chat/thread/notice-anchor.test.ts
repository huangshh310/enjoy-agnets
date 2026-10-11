import assert from "node:assert/strict"
import { test } from "node:test"
import { noticeAnchorId } from "./notice-anchor.ts"

test("有提示且最后一条是助手：锚到那一轮下面", () => {
  const rows = [
    { id: "u1", role: "user" },
    { id: "a1", role: "assistant" }
  ]
  assert.equal(noticeAnchorId(rows, "restore_no_matching"), "a1")
})

test("没提示不定锚；最后一条是用户则退回线程末尾", () => {
  assert.equal(noticeAnchorId([{ id: "a1", role: "assistant" }], null), null)
  assert.equal(noticeAnchorId([{ id: "u1", role: "user" }], "user_aborted"), null)
  assert.equal(noticeAnchorId([], "restore_no_matching"), null)
})
