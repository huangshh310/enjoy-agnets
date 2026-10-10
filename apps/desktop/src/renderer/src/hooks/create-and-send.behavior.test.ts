/**
 * 新对话创建窗内发送：session.create 还没回来时不能 run，回来后自动发。
 * 不 import session-lifecycle / chat-store（里面有 @renderer 或无后缀 import，node:test 解析不了）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  beginNewSessionCreate,
  currentCreateToken,
  failNewSessionCreate,
  finishNewSessionCreate,
  resetNewSessionCreateForTest,
  shouldPublishCreatedSession,
  shouldQueueComposerSend
} from "./new-session-create.ts"
import { resetQueuedComposerSendForTest, waitThenSendAfterCreate } from "./queue-composer-send.ts"

function resetAll() {
  resetNewSessionCreateForTest()
  resetQueuedComposerSendForTest()
}

test("创建窗内发送 hello：create 回来之前不 run，回来后自动发", async () => {
  resetAll()
  const runs: Array<{ sessionId: string; content: string }> = []
  try {
    const { token } = beginNewSessionCreate()
    let sessionId: string | null = null
    assert.equal(shouldQueueComposerSend(sessionId, true), true)
    const sending = waitThenSendAfterCreate(
      "hello",
      async (prepared) => {
        if (!sessionId) throw new Error("SESSION_NOT_READY")
        runs.push({ sessionId, content: prepared.content })
      },
      undefined,
      { readSessionId: () => sessionId }
    )
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.deepEqual(runs, [])
    sessionId = "ses_new"
    finishNewSessionCreate(token, sessionId)
    await sending
    assert.deepEqual(runs, [{ sessionId: "ses_new", content: "hello" }])
  } finally {
    resetAll()
  }
})

test("创建失败：不 run，排队发送还文", async () => {
  resetAll()
  const { token } = beginNewSessionCreate()
  let sent = false
  let restored = ""
  const sending = waitThenSendAfterCreate(
    "hello",
    async () => {
      sent = true
    },
    undefined,
    { onFail: (text) => { restored = text } }
  )
  failNewSessionCreate(token, new Error("create failed"))
  await sending
  assert.equal(sent, false)
  assert.equal(restored, "hello")
})

test("连点新对话：第一次 create 不得 publish，第二次才进前台", () => {
  resetAll()
  const first = beginNewSessionCreate()
  const second = beginNewSessionCreate()
  assert.equal(
    shouldPublishCreatedSession({
      token: first.token,
      pendingToken: currentCreateToken(),
      createdWorkspaceId: "ws_a",
      storeWorkspaceId: "ws_a"
    }),
    false
  )
  assert.equal(
    shouldPublishCreatedSession({
      token: second.token,
      pendingToken: currentCreateToken(),
      createdWorkspaceId: "ws_a",
      storeWorkspaceId: "ws_a"
    }),
    true
  )
})

test("创建未完成就切走工作区：不得 publish 到旧工作区", () => {
  resetAll()
  const { token } = beginNewSessionCreate()
  assert.equal(
    shouldPublishCreatedSession({
      token,
      pendingToken: currentCreateToken(),
      createdWorkspaceId: "ws_a",
      storeWorkspaceId: "ws_b"
    }),
    false
  )
})

test("create 返回的 id 与前台不一致：排队发送还文", async () => {
  resetAll()
  const { token } = beginNewSessionCreate()
  let sent = false
  let restored = ""
  const sending = waitThenSendAfterCreate(
    "hello",
    async () => {
      sent = true
    },
    undefined,
    {
      readSessionId: () => "ses_foreground",
      onFail: (text) => { restored = text }
    }
  )
  finishNewSessionCreate(token, "ses_created")
  await sending
  assert.equal(sent, false)
  assert.equal(restored, "hello")
})
