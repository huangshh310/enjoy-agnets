import assert from "node:assert/strict"
import { test } from "node:test"
import {
  beginNewSessionCreate,
  failNewSessionCreate,
  finishNewSessionCreate,
  resetNewSessionCreateForTest
} from "./new-session-create.ts"
import {
  SEND_FAILED_RESTORE,
  SESSION_CREATE_TIMEOUT,
  sendFailureCopy,
  waitThenSendAfterCreate
} from "./queue-composer-send.ts"

test("创建窗内发送：等 create 回来再发，失败还文", async () => {
  resetNewSessionCreateForTest()
  const { token } = beginNewSessionCreate()
  const sent: string[] = []
  const pending = waitThenSendAfterCreate("hello", async (prepared) => {
    sent.push(prepared.content)
  })
  assert.deepEqual(sent, [])
  finishNewSessionCreate(token, "ses_1")
  await pending
  assert.deepEqual(sent, ["hello"])
})

test("创建失败：不发、还文码", async () => {
  resetNewSessionCreateForTest()
  const { token } = beginNewSessionCreate()
  let called = false
  const pending = waitThenSendAfterCreate("still here", async () => {
    called = true
  })
  failNewSessionCreate(token, new Error("boom"))
  await pending
  assert.equal(called, false)
  assert.equal(sendFailureCopy(new Error("SESSION_CREATE_TIMEOUT")), SESSION_CREATE_TIMEOUT)
  assert.equal(sendFailureCopy(new Error("boom")), SEND_FAILED_RESTORE)
})
