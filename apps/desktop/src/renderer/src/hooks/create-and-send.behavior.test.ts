/**
 * 新对话创建窗内发送：session.create 还没回来时不能 run，回来后自动发。
 * 不 import session-lifecycle（里面有 @renderer 别名，node:test 解析不了）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  beginNewSessionCreate,
  failNewSessionCreate,
  finishNewSessionCreate,
  resetNewSessionCreateForTest,
  shouldQueueComposerSend
} from "./new-session-create.ts"
import { waitThenSendAfterCreate } from "./queue-composer-send.ts"

test("创建窗内发送 hello：create 回来之前不 run，回来后自动发", async () => {
  resetNewSessionCreateForTest()
  const runs: Array<{ sessionId: string; content: string }> = []
  try {
    const { token } = beginNewSessionCreate()
    let sessionId: string | null = null
    assert.equal(shouldQueueComposerSend(sessionId, true), true)
    const sending = waitThenSendAfterCreate("hello", async (prepared) => {
      if (!sessionId) throw new Error("SESSION_NOT_READY")
      runs.push({ sessionId, content: prepared.content })
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.deepEqual(runs, [])
    sessionId = "ses_new"
    finishNewSessionCreate(token, sessionId)
    await sending
    assert.deepEqual(runs, [{ sessionId: "ses_new", content: "hello" }])
  } finally {
    resetNewSessionCreateForTest()
  }
})

test("创建失败：不 run，排队发送还文", async () => {
  resetNewSessionCreateForTest()
  const { token } = beginNewSessionCreate()
  let sent = false
  const sending = waitThenSendAfterCreate("hello", async () => {
    sent = true
  })
  failNewSessionCreate(token, new Error("create failed"))
  await sending
  assert.equal(sent, false)
})
