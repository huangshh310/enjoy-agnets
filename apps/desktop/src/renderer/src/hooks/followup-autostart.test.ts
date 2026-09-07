import assert from "node:assert/strict"
import { test } from "node:test"
import { resetFollowupAutostart, tryStartNextFollowup } from "./followup-autostart.ts"
import { enqueueFollowup, listFollowups, takeNextFollowup } from "./followup-queue.ts"

function drain(sessionId: string) {
  while (takeNextFollowup(sessionId)) {
    /* empty */
  }
}

test("已 idle 入队立刻取出并发送", async () => {
  resetFollowupAutostart()
  drain("sess_idle")
  const sent: string[] = []
  enqueueFollowup({ sessionId: "sess_idle", text: "下一件", assets: [] })
  const started = tryStartNextFollowup({
    sessionId: "sess_idle",
    running: false,
    send: async (item) => {
      sent.push(item.text)
    }
  })
  assert.equal(started, true)
  await Promise.resolve()
  assert.deepEqual(sent, ["下一件"])
  assert.equal(listFollowups("sess_idle").length, 0)
})

test("审批等待不取排队", () => {
  resetFollowupAutostart()
  drain("sess_review")
  enqueueFollowup({ sessionId: "sess_review", prompt: "等审批", assets: [] })
  const started = tryStartNextFollowup({
    sessionId: "sess_review",
    running: false,
    pendingApproval: true,
    send: async () => undefined
  })
  assert.equal(started, false)
  assert.equal(listFollowups("sess_review").length, 1)
  drain("sess_review")
})

test("仍在跑不取排队", () => {
  resetFollowupAutostart()
  drain("sess_run")
  enqueueFollowup({ sessionId: "sess_run", text: "等结束", assets: [] })
  const started = tryStartNextFollowup({
    sessionId: "sess_run",
    running: true,
    send: async () => undefined
  })
  assert.equal(started, false)
  assert.equal(listFollowups("sess_run").length, 1)
  drain("sess_run")
})

test("发送中不再取下一项", async () => {
  resetFollowupAutostart()
  drain("sess_lock")
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  enqueueFollowup({ sessionId: "sess_lock", text: "第一", assets: [] })
  enqueueFollowup({ sessionId: "sess_lock", text: "第二", assets: [] })
  const started = tryStartNextFollowup({
    sessionId: "sess_lock",
    running: false,
    send: async () => gate
  })
  assert.equal(started, true)
  assert.equal(
    tryStartNextFollowup({
      sessionId: "sess_lock",
      running: false,
      send: async () => undefined
    }),
    false
  )
  assert.equal(listFollowups("sess_lock").length, 1)
  release()
  await gate
  drain("sess_lock")
  resetFollowupAutostart()
})
