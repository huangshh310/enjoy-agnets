import assert from "node:assert/strict"
import { test } from "node:test"
import { StreamEvent } from "./stream-event.ts"
import {
  USER_ABORT_MESSAGE,
  coarseDesktopNotifyAction,
  deriveRunNotifyKind,
  desktopApprovalNotifyCopy,
  isUserAbortMessage,
  noticeForAgentEvent,
  redactDesktopApprovalNotify
} from "./desktop-notify.ts"

const DIRTY_ARGS = {
  observationId: "obs_1",
  action: "type",
  appName: "备忘录",
  appKey: "com.apple.notes",
  text: "我的密码是 hunter2",
  elementName: "密码",
  elementRole: "text field",
  elementId: "AXTextField:0",
  x: 128,
  y: 64,
  thumbnailPath: "/thumbs/secret.png",
  thumbnailDataUrl: "data:image/png;base64,SECRET"
}

test("run.end 推出已完成，契约字段仍只有 runId", () => {
  const event = StreamEvent.parse({ type: "run.end", runId: "run_1" })
  assert.equal(deriveRunNotifyKind(event), "completed")
  assert.equal("message" in event, false)
  const copy = noticeForAgentEvent(event, true)
  assert.deepEqual(copy, { title: "已完成", body: "这一轮已经结束。" })
})

test("用户停 run.error 推出已停止，其它错误推出出错", () => {
  assert.equal(deriveRunNotifyKind({ type: "run.error", message: USER_ABORT_MESSAGE }), "stopped")
  assert.equal(deriveRunNotifyKind({ type: "run.error", message: "Aborted by user" }), "stopped")
  assert.equal(deriveRunNotifyKind({ type: "run.error", message: "  aborted by user.  " }), "stopped")
  assert.equal(deriveRunNotifyKind({ type: "run.error", message: "provider 500" }), "errored")
  assert.equal(deriveRunNotifyKind({ type: "run.error", message: "The operation was aborted" }), "errored")
  assert.equal(deriveRunNotifyKind({ type: "run.error", message: "Request timed out" }), "errored")
  assert.equal(deriveRunNotifyKind({ type: "text.delta", message: USER_ABORT_MESSAGE }), null)
})

test("isUserAbortMessage 只认整句，不靠 abort 子串", () => {
  assert.equal(isUserAbortMessage(USER_ABORT_MESSAGE), true)
  assert.equal(isUserAbortMessage("Aborted by user"), true)
  assert.equal(isUserAbortMessage("The operation was aborted"), false)
  assert.equal(isUserAbortMessage("aborted due to timeout"), false)
  assert.equal(isUserAbortMessage(""), false)
  assert.equal(isUserAbortMessage(undefined), false)
})

test("待审批通知只含应用名 + 粗动作，脱敏输入/控件/坐标/截图", () => {
  const payload = redactDesktopApprovalNotify({ name: "desktop_act", args: DIRTY_ARGS })
  assert.deepEqual(payload, { appName: "备忘录", actionKind: "type" })
  const copy = desktopApprovalNotifyCopy(payload!, true)
  assert.equal(copy.title, "待审批")
  assert.equal(copy.body, "Enjoy 想在「备忘录」里输入，回 Enjoy 审批")
  assertDoesNotLeak(copy.body)
  assert.equal(copy.body.includes("允许"), false)
})

test("英文待审批通知同样不泄输入，且不写 type 字段原文", () => {
  const payload = redactDesktopApprovalNotify({ name: "desktop_act", args: DIRTY_ARGS })
  const copy = desktopApprovalNotifyCopy(payload!, false)
  assert.match(copy.body, /Notes|备忘录/)
  assert.match(copy.body, /type/)
  assertDoesNotLeak(copy.body)
  assert.equal(copy.body.includes("allow"), false)
})

test("非 desktop_act 或未知动作走泛工具句", () => {
  assert.equal(redactDesktopApprovalNotify({ name: "bash", args: DIRTY_ARGS }), null)
  assert.equal(redactDesktopApprovalNotify({ name: "desktop_act", args: { action: "wait", appName: "备忘录" } }), null)
  assert.equal(coarseDesktopNotifyAction("wait"), null)
  const generic = noticeForAgentEvent({ type: "approval.required", name: "write_file", args: { path: "a.ts" } }, true)
  assert.deepEqual(generic, { title: "待审批", body: "有工具在等你决定。" })
})

test("出错通知不抄 run.error.message", () => {
  const copy = noticeForAgentEvent(
    { type: "run.error", message: "typed secret hunter2 into 密码 at 128,64" },
    true
  )
  assert.deepEqual(copy, { title: "出错", body: "这一轮没有完成。" })
  assert.equal(copy?.body.includes("hunter2"), false)
  assert.equal(copy?.body.includes("密码"), false)
})

test("用户停通知标题是已停止，不是已完成", () => {
  const copy = noticeForAgentEvent({ type: "run.error", message: USER_ABORT_MESSAGE }, true)
  assert.deepEqual(copy, { title: "已停止", body: "你停止了这一轮。" })
})

function assertDoesNotLeak(body: string): void {
  assert.equal(body.includes("hunter2"), false)
  assert.equal(body.includes("我的密码"), false)
  assert.equal(body.includes("密码"), false)
  assert.equal(body.includes("AXTextField"), false)
  assert.equal(body.includes("128"), false)
  assert.equal(body.includes("64"), false)
  assert.equal(body.includes("data:image"), false)
  assert.equal(body.includes("secret.png"), false)
}
