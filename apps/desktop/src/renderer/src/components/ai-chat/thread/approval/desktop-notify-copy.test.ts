/**
 * 通知文案接 kai 的 desktop-notify helpers，不在 renderer 另写一份。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  USER_ABORT_MESSAGE,
  noticeForAgentEvent,
  redactDesktopApprovalNotify
} from "../../../../../../../../../packages/ipc-contract/src/desktop-notify.ts"

const MAIN = join(dirname(fileURLToPath(import.meta.url)), "../../../../../../main/services/desktop-notify.ts")

test("四态通知走 kai helpers：待审批脱敏 + 已完成 / 已停止 / 出错", () => {
  const pending = noticeForAgentEvent(
    {
      type: "approval.required",
      name: "desktop_act",
      args: { action: "type", appName: "备忘录", text: "我的密码是 hunter2", elementName: "密码" }
    },
    true
  )
  assert.deepEqual(pending, { title: "待审批", body: "Enjoy 想在「备忘录」里输入，回 Enjoy 审批" })
  assert.equal(pending?.body.includes("hunter2"), false)
  assert.equal(pending?.body.includes("允许"), false)

  assert.deepEqual(noticeForAgentEvent({ type: "run.end", runId: "run_1" }, true), {
    title: "已完成",
    body: "这一轮已经结束。"
  })
  assert.deepEqual(noticeForAgentEvent({ type: "run.error", message: USER_ABORT_MESSAGE }, true), {
    title: "已停止",
    body: "你停止了这一轮。"
  })
  const errored = noticeForAgentEvent({ type: "run.error", message: "typed hunter2" }, true)
  assert.deepEqual(errored, { title: "出错", body: "这一轮没有完成。" })
  assert.equal(errored?.body.includes("hunter2"), false)
})

test("main 弹出与 renderer 测试都只调 noticeForAgentEvent", () => {
  const main = readFileSync(MAIN, "utf8")
  assert.match(main, /noticeForAgentEvent/)
  assert.match(main, /@enjoy-agents\/ipc-contract\/desktop-notify/)
  const payload = redactDesktopApprovalNotify({
    name: "desktop_act",
    args: { action: "click", appName: "日历", text: "secret", x: 9 }
  })
  assert.deepEqual(payload, { appName: "日历", actionKind: "click" })
})
