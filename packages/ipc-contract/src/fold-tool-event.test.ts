import assert from "node:assert/strict"
import { test } from "node:test"
import { DESKTOP_ACT_BARE_COORDS_DISABLED, desktopActBareCoordsDeniedResult } from "./desktop-act-codes.ts"
import { APPROVAL_REPLAY_DENIED, APPROVAL_REPLAY_DENIED_COPY } from "./approval-not-executed.ts"
import { foldToolEvent } from "./fold-tool-event.ts"
import type { ThreadToolCall } from "./assistant-payload.ts"

test("探索 deny 的 tool.result error 折成 output-error", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "write_file",
    args: { path: "src/a.ts" },
    error: "Explore mode is read-only."
  })
  assert.equal(tools[0]?.state, "output-error")
  assert.equal(tools[0]?.errorText, "Explore mode is read-only.")
})

test("审批硬拒 tool.result 折进 ThreadToolCall.result.code", () => {
  const tools: ThreadToolCall[] = []
  const result = desktopActBareCoordsDeniedResult()
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "desktop_act",
    result,
    error: DESKTOP_ACT_BARE_COORDS_DISABLED
  })
  const folded = tools[0]
  assert.ok(folded)
  assert.equal(folded.name, "desktop_act")
  assert.equal(folded.state, "output-error")
  assert.equal(folded.errorText, DESKTOP_ACT_BARE_COORDS_DISABLED)
  assert.deepEqual(folded.result, result)
  assert.equal((folded.result as { code?: string }).code, result.code)
})

test("回放 fail closed 折成 output-denied，不是 output-error", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "desktop_act",
    result: { code: APPROVAL_REPLAY_DENIED },
    error: APPROVAL_REPLAY_DENIED_COPY
  })
  assert.equal(tools[0]?.state, "output-denied")
  assert.equal(tools[0]?.errorText, APPROVAL_REPLAY_DENIED_COPY)
})

test("带 resumeCode 的 tool.result 也折成 output-denied", () => {
  const tools: ThreadToolCall[] = []
  foldToolEvent(tools, {
    type: "tool.result",
    runId: "r1",
    toolCallId: "t1",
    name: "desktop_act",
    result: { resumeCode: "stale_observation" }
  })
  assert.equal(tools[0]?.state, "output-denied")
})
