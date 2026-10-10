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
