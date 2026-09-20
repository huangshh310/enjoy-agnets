import assert from "node:assert/strict"
import { test } from "node:test"
import { findExploreWriteIntercept, isWriteLikeTool } from "./write-intercept.ts"

test("只拦探索态被拒或待审的写工具", () => {
  assert.equal(isWriteLikeTool({ name: "write_file" }), true)
  assert.equal(isWriteLikeTool({ name: "str_replace" }), true)
  assert.equal(isWriteLikeTool({ name: "read_file" }), false)
  const hit = findExploreWriteIntercept([
    {
      id: "t1",
      name: "read_file",
      state: "output-available",
      args: { path: "src/a.ts" }
    },
    {
      id: "t2",
      name: "write_file",
      state: "output-denied",
      args: { path: "src/auth/login.ts" }
    }
  ])
  assert.equal(hit?.toolName, "write_file")
  assert.equal(hit?.path, "src/auth/login.ts")
})

test("读工具与已完成写入不触发拦截", () => {
  assert.equal(
    findExploreWriteIntercept([
      { id: "t", name: "write_file", state: "output-available", args: { path: "a.ts" } }
    ]),
    null
  )
  assert.equal(
    findExploreWriteIntercept([{ id: "t", name: "grep", state: "output-denied" }]),
    null
  )
})
