import assert from "node:assert/strict"
import { test } from "node:test"
import {
  applySessionContextToOutgoing,
  prefixSessionContext,
  sessionSystemMessages,
  stripSessionContext
} from "./session-context-inject.ts"

test("有目标/总结才垫 system 句", () => {
  assert.deepEqual(sessionSystemMessages({}), [])
  assert.deepEqual(sessionSystemMessages({ goal: "  ", recap: null }), [])
  assert.deepEqual(sessionSystemMessages({ goal: "改登录", recap: "已拆模块" }), [
    { role: "system", content: "[Session Goal]: 改登录" },
    { role: "system", content: "[Session Recap]: 已拆模块" }
  ])
})

test("ACP 折进最后一条用户正文，Enjoy 只加 system", () => {
  const history = [
    { role: "user", content: "先看目录" },
    { role: "assistant", content: "好" },
    { role: "user", content: "继续" }
  ]
  const local = applySessionContextToOutgoing(false, { goal: "改登录" }, history)
  assert.equal(local[0]?.role, "system")
  assert.equal(local[local.length - 1]?.content, "继续")

  const acp = applySessionContextToOutgoing(true, { goal: "改登录", recap: "已拆" }, history)
  assert.equal(acp.some((row) => row.role === "system"), false)
  assert.match(acp[acp.length - 1]?.content ?? "", /\[Enjoy session context\]/)
  assert.match(acp[acp.length - 1]?.content ?? "", /Goal: 改登录/)
  assert.match(acp[acp.length - 1]?.content ?? "", /Recap: 已拆/)
})

test("围栏可剥，不重复叠加", () => {
  const once = prefixSessionContext("请改", { goal: "登录页" })
  const twice = prefixSessionContext(once, { goal: "登录页" })
  assert.equal(once, twice)
  assert.equal(stripSessionContext(once), "请改")
})
