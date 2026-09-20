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

test("ACP 没有用户句时垫一条带围栏的用户句，不丢到 system", () => {
  const acp = applySessionContextToOutgoing(true, { goal: "改登录" }, [])
  assert.equal(acp.some((row) => row.role === "system"), false)
  assert.equal(acp[0]?.role, "user")
  assert.match(acp[0]?.content ?? "", /Goal: 改登录/)
})

test("启发式 Recap 头标不进模型", () => {
  const stored = "[Enjoy recap kind: heuristic]\n已拆模块"
  const local = applySessionContextToOutgoing(false, { recap: stored }, [{ role: "user", content: "继续" }])
  assert.equal(local[0]?.content, "[Session Recap]: 已拆模块")
  const acp = applySessionContextToOutgoing(true, { recap: stored }, [{ role: "user", content: "继续" }])
  assert.match(acp[0]?.content ?? "", /Recap: 已拆模块/)
  assert.doesNotMatch(acp[0]?.content ?? "", /Enjoy recap kind/)
})

test("围栏可剥，不重复叠加", () => {
  const once = prefixSessionContext("请改", { goal: "登录页" })
  const twice = prefixSessionContext(once, { goal: "登录页" })
  assert.equal(once, twice)
  assert.equal(stripSessionContext(once), "请改")
})
