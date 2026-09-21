import assert from "node:assert/strict"
import { test } from "node:test"
import { collectThreadFindMatches, normalizeFindQuery, stepFindIndex } from "./thread-find.logic.ts"

const docs = [
  { id: "u1", role: "user", content: "fix the login form" },
  { id: "a1", role: "assistant", content: "I will patch login.tsx" },
  { id: "u2", role: "user", content: "also login tests" }
]

test("空查询不搜；1 个字符即可", () => {
  assert.deepEqual(collectThreadFindMatches(docs, "   "), [])
  assert.equal(collectThreadFindMatches(docs, "f").length, 1)
  assert.equal(normalizeFindQuery("  login  "), "login")
})

test("最近的在前，同一条只记一次", () => {
  assert.deepEqual(
    collectThreadFindMatches(docs, "login").map((hit) => hit.messageId),
    ["u2", "a1", "u1"]
  )
})

test("不拿引用协议头当命中", () => {
  const hits = collectThreadFindMatches(
    [{ id: "u1", role: "user", content: "> [引用自文件: login.ts]\n> const x\n\nplease refactor" }],
    "引用自文件"
  )
  assert.deepEqual(hits, [])
  assert.equal(collectThreadFindMatches(
    [{ id: "u1", role: "user", content: "> [引用自文件: login.ts]\n> const x\n\nplease refactor" }],
    "refactor"
  ).length, 1)
})

test("下一条循环", () => {
  assert.equal(stepFindIndex(0, 1, 3), 1)
  assert.equal(stepFindIndex(2, 1, 3), 0)
  assert.equal(stepFindIndex(0, -1, 3), 2)
  assert.equal(stepFindIndex(0, 1, 0), 0)
})
