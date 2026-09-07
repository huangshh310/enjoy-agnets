import assert from "node:assert/strict"
import { test } from "node:test"
import {
  editQueuedMessage,
  elevateToSteer,
  enqueueFollowup,
  listFollowups,
  moveFollowup,
  removeFollowup,
  takeFollowup,
  takeNextFollowup
} from "./followup-queue.ts"

test("排队按会话取出，先入先出", () => {
  while (takeNextFollowup("sess_q")) {
    /* drain */
  }
  enqueueFollowup({ sessionId: "sess_q", text: "第一件", assets: [] })
  enqueueFollowup({ sessionId: "sess_q", text: "第二件", assets: [] })
  enqueueFollowup({ sessionId: "other", text: "别的会话", assets: [] })
  assert.equal(listFollowups("sess_q").length, 2)
  assert.equal(takeNextFollowup("sess_q")?.text, "第一件")
  assert.equal(takeNextFollowup("sess_q")?.text, "第二件")
  const leftover = listFollowups("other")[0]
  assert.equal(takeFollowup(leftover?.id ?? "")?.text, "别的会话")
  assert.equal(listFollowups("other").length, 0)
  removeFollowup("missing")
})

test("同一会话可上移下移，不打乱其它会话", () => {
  while (takeNextFollowup("sess_m")) {
    /* drain */
  }
  while (takeNextFollowup("other_m")) {
    /* drain */
  }
  enqueueFollowup({ sessionId: "sess_m", text: "一", assets: [] })
  enqueueFollowup({ sessionId: "other_m", text: "别的", assets: [] })
  enqueueFollowup({ sessionId: "sess_m", text: "二", assets: [] })
  const second = listFollowups("sess_m")[1]
  moveFollowup(second?.id ?? "", -1)
  assert.deepEqual(
    listFollowups("sess_m").map((item) => item.text),
    ["二", "一"]
  )
  assert.equal(listFollowups("other_m")[0]?.text, "别的")
  while (takeNextFollowup("sess_m")) {
    /* drain */
  }
  while (takeNextFollowup("other_m")) {
    /* drain */
  }
})

test("prompt 与 text 同值；编辑取出；升级标 elevated_to_steer", () => {
  while (takeNextFollowup("sess_api")) {
    /* drain */
  }
  const queued = enqueueFollowup({ sessionId: "sess_api", prompt: "下一件", assets: [] })
  assert.equal(queued.prompt, "下一件")
  assert.equal(queued.text, "下一件")
  const edited = editQueuedMessage(queued.id)
  assert.equal(edited?.prompt, "下一件")
  assert.equal(listFollowups("sess_api").length, 0)

  const again = enqueueFollowup({ sessionId: "sess_api", text: "升上去", assets: [] })
  const elevated = elevateToSteer(again.id)
  assert.equal(elevated?.status, "elevated_to_steer")
  assert.equal(elevated?.prompt, "升上去")
  assert.equal(listFollowups("sess_api").length, 0)
})
