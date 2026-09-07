import assert from "node:assert/strict"
import { test } from "node:test"
import { addQuotedContext, listQuotedContexts, removeQuotedContext, takeQuotedContexts } from "./quoted-context.ts"

test("引用可增删，同 id 覆盖，take 后清空", () => {
  takeQuotedContexts()
  addQuotedContext({
    id: "q1",
    type: "thought_step",
    title: "计划",
    snippet: "先改 layout"
  })
  addQuotedContext({
    id: "q1",
    type: "thought_step",
    title: "计划",
    snippet: "先改 layout"
  })
  assert.equal(listQuotedContexts().length, 1)
  removeQuotedContext("q1")
  assert.equal(takeQuotedContexts().length, 0)
})
