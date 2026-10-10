import assert from "node:assert/strict"
import { test } from "node:test"
import { thinkingHeadline } from "./thinking-rows.ts"

const t = (path: string) => path

test("Stop 后过程折叠标题走已停止，不是已拒绝", () => {
  const headline = thinkingHeadline(
    false,
    [
      {
        id: "tool_stop",
        name: "write_file",
        state: "output-error",
        result: { code: "user_aborted", decision: "cancelled" }
      }
    ],
    null,
    t
  )
  assert.equal(headline, "chat.toolStopped")
  assert.notEqual(headline, "chat.toolDenied")
})

test("补跑超时工具行走中性文案，不是拒绝或出错", () => {
  const headline = thinkingHeadline(
    false,
    [
      {
        id: "t1",
        name: "write_file",
        state: "output-error",
        result: { code: "catch_up_approval_timeout", decision: "cancelled" }
      }
    ],
    null,
    (key) => key
  )
  assert.equal(headline, "studio.automations.catchUpTimeout")
  assert.notEqual(headline, "chat.toolDenied")
})
