import assert from "node:assert/strict"
import { test } from "node:test"
import {
  beginNewSessionCreate,
  currentCreateToken,
  failNewSessionCreate,
  finishNewSessionCreate,
  isCurrentCreateToken,
  isNewSessionCreatePending,
  resetNewSessionCreateForTest,
  shouldPublishCreatedSession,
  shouldQueueComposerSend,
  waitForNewSessionCreate
} from "./new-session-create.ts"

test("只有创建窗未结束才入队，sessionId 为空不得自动发", () => {
  assert.equal(shouldQueueComposerSend(null, true), true)
  assert.equal(shouldQueueComposerSend("ses_old", true), true)
  assert.equal(shouldQueueComposerSend(null, false), false)
  assert.equal(shouldQueueComposerSend("ses_ready", false), false)
})

test("finish 之后等待的发送拿到新 sessionId", async () => {
  resetNewSessionCreateForTest()
  const { token } = beginNewSessionCreate()
  assert.equal(isNewSessionCreatePending(), true)
  const waiting = waitForNewSessionCreate(1_000)
  finishNewSessionCreate(token, "ses_new")
  assert.equal(await waiting, "ses_new")
  assert.equal(isNewSessionCreatePending(), false)
})

test("创建失败或超时要让排队发送还文", async () => {
  resetNewSessionCreateForTest()
  const { token } = beginNewSessionCreate()
  const waiting = waitForNewSessionCreate(1_000)
  failNewSessionCreate(token, new Error("create failed"))
  await assert.rejects(waiting, /create failed/)

  resetNewSessionCreateForTest()
  beginNewSessionCreate()
  await assert.rejects(waitForNewSessionCreate(20), /SESSION_CREATE_TIMEOUT/)
})

test("过期 token 不得解开下一次创建", async () => {
  resetNewSessionCreateForTest()
  const first = beginNewSessionCreate()
  const second = beginNewSessionCreate()
  finishNewSessionCreate(first.token, "ses_old")
  assert.equal(isNewSessionCreatePending(), true)
  finishNewSessionCreate(second.token, "ses_new")
  assert.equal(await second.promise, "ses_new")
  assert.equal(isNewSessionCreatePending(), false)
})

test("过期 token 不得 publish，切走工作区也不得 publish", () => {
  resetNewSessionCreateForTest()
  const first = beginNewSessionCreate()
  const second = beginNewSessionCreate()
  assert.equal(isCurrentCreateToken(first.token), false)
  assert.equal(isCurrentCreateToken(second.token), true)
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
      storeWorkspaceId: "ws_b"
    }),
    false
  )
  assert.equal(
    shouldPublishCreatedSession({
      token: second.token,
      pendingToken: currentCreateToken(),
      createdWorkspaceId: "ws_b",
      storeWorkspaceId: "ws_b"
    }),
    true
  )
})
