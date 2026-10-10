/**
 * 种子会话首发：启动 loadSession 晚到时不能把乐观气泡洗成欢迎页。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { pickHydratedMessages } from "./pick-hydrated-messages.ts"

const user = { role: "user" as const, content: "hello" }
const assistant = { role: "assistant" as const, content: "", streaming: true }

test("空库回灌保住进行中的乐观气泡", () => {
  const live = [user, assistant]
  const next = pickHydratedMessages({
    dbMessages: [],
    liveMessages: live,
    sameSession: true,
    running: true
  })
  assert.equal(next.length, 2)
  assert.equal(next[0]?.content, "hello")
})

test("切走再切回：库行还停在 approval-requested 时保住已经折过的拒绝", () => {
  const db = [
    {
      id: "msg_asst",
      role: "assistant" as const,
      content: "",
      tools: [{ id: "tool_1", state: "approval-requested" }]
    }
  ]
  const live = [
    {
      id: "msg_asst",
      role: "assistant" as const,
      content: "",
      tools: [{ id: "tool_1", state: "output-denied" }]
    }
  ]
  const next = pickHydratedMessages({
    dbMessages: db,
    liveMessages: live,
    sameSession: false,
    running: true
  })
  assert.equal(next[0]?.tools?.[0]?.state, "output-denied")
})

test("切走会话不得把上一会话的 live 当成当前乐观泡", () => {
  const next = pickHydratedMessages({
    dbMessages: [],
    liveMessages: [user],
    sameSession: false,
    running: false
  })
  assert.equal(next.length, 0)
})

test("同会话已落库且更长时用库行并保住附件", () => {
  const live = [{ role: "user" as const, content: "看图" }]
  const db = [
    {
      role: "user" as const,
      content: "看图",
      assets: [{ assetId: "ast", mediaType: "image/png", name: "a.png" }]
    }
  ]
  const next = pickHydratedMessages({
    dbMessages: db,
    liveMessages: live,
    sameSession: true,
    running: false
  })
  assert.equal(next[0]?.assets?.[0]?.name, "a.png")
})
