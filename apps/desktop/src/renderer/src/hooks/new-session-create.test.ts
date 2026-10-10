import assert from "node:assert/strict"
import { test } from "node:test"
import {
  beginNewSessionCreate,
  failNewSessionCreate,
  finishNewSessionCreate,
  isNewSessionCreatePending,
  resetNewSessionCreateForTest,
  shouldQueueComposerSend,
  waitForNewSessionCreate
} from "./new-session-create.ts"

test("创建窗内没有 sessionId 也要入队，不能当发送成功", () => {
  assert.equal(shouldQueueComposerSend(null, true), true)
  assert.equal(shouldQueueComposerSend("ses_old", true), true)
  assert.equal(shouldQueueComposerSend(null, false), true)
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
