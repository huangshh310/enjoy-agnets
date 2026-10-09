/**
 * 拒绝 / 未执行不得写成红条。run.end 清掉 store.error。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { APPROVAL_REPLAY_DENIED, APPROVAL_REPLAY_DENIED_COPY } from "@enjoy-agents/ipc-contract/approval-not-executed"
import { reduceStreamEvent } from "./apply-stream-event.ts"
import type { ThreadMessage } from "./chat-store"

function assistantWithDeniedTool(): ThreadMessage[] {
  return [
    {
      id: "msg_1",
      role: "assistant",
      content: "",
      createdAt: 1,
      streaming: true,
      tools: [
        {
          id: "tool_1",
          name: "desktop_act",
          state: "output-error",
          result: { code: APPROVAL_REPLAY_DENIED },
          errorText: APPROVAL_REPLAY_DENIED_COPY
        }
      ]
    }
  ]
}

test("未执行类 run.error 不写红条，工具收成 output-denied", () => {
  const patch = reduceStreamEvent(assistantWithDeniedTool(), {
    type: "run.error",
    runId: "run_1",
    message: APPROVAL_REPLAY_DENIED_COPY
  }, "run_1")
  assert.equal(patch.error, null)
  assert.equal(patch.running, false)
  assert.equal(patch.messages[0]?.tools?.[0]?.state, "output-denied")
})

test("run.end 清掉红条，拒绝工具保持未执行", () => {
  const patch = reduceStreamEvent(assistantWithDeniedTool(), {
    type: "run.end",
    runId: "run_1"
  }, "run_1")
  assert.equal(patch.error, null)
  assert.equal(patch.messages[0]?.tools?.[0]?.state, "output-denied")
})
