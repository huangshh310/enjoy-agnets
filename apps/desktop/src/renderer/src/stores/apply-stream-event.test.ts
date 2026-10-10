/**
 * 拒绝 / 未执行不得写成红条。run.end 清掉 store.error。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { APPROVAL_REPLAY_DENIED, APPROVAL_REPLAY_DENIED_COPY } from "@enjoy-agents/ipc-contract/approval-not-executed"
import { isStaleObservationAfterAllow, isToolNotExecuted } from "@enjoy-agents/ipc-contract/approval-not-executed"
import { mapToolStatus } from "../components/ai-chat/thread/thinking/extract-step-fields.ts"
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

test("用户停 run.error 不写红条，工具封成已停止", () => {
  const messages: ThreadMessage[] = [
    {
      id: "msg_1",
      role: "assistant",
      content: "one two",
      createdAt: 1,
      streaming: true,
      tools: [
        {
          id: "tool_1",
          name: "write_file",
          state: "input-available",
          args: { path: "e2e-stub.txt" }
        }
      ]
    }
  ]
  const patch = reduceStreamEvent(
    messages,
    {
      type: "run.error",
      runId: "run_1",
      message: "Aborted by user.",
      code: "user_aborted",
      turn: { workflow: "needs_review", attention: "neutral" }
    },
    "run_1"
  )
  assert.equal(patch.error, null)
  assert.equal(patch.notice, "user_aborted")
  assert.equal(patch.running, false)
  assert.equal(patch.messages[0]?.tools?.[0]?.state, "output-error")
  assert.equal(
    (patch.messages[0]?.tools?.[0]?.result as { code?: string } | undefined)?.code,
    "user_aborted"
  )
})

test("补跑超时走中性 notice，不写红条", () => {
  const patch = reduceStreamEvent(
    [],
    {
      type: "run.error",
      runId: "run_1",
      message: "catch_up_approval_timeout",
      turn: { workflow: "in_progress", attention: "neutral" }
    },
    "run_1"
  )
  assert.equal(patch.error, null)
  assert.equal(patch.notice, "catch_up_approval_timeout")
  assert.equal(patch.running, false)
})

test("未执行类 run.error 不写红条，库里 output-error 不改写", () => {
  const patch = reduceStreamEvent(assistantWithDeniedTool(), {
    type: "run.error",
    runId: "run_1",
    message: APPROVAL_REPLAY_DENIED_COPY
  }, "run_1")
  assert.equal(patch.error, null)
  assert.equal(patch.running, false)
  assert.equal(patch.messages[0]?.tools?.[0]?.state, "output-error")
})

test("run.end 清掉红条，拒绝工具保持库里的 output-error", () => {
  const patch = reduceStreamEvent(assistantWithDeniedTool(), {
    type: "run.end",
    runId: "run_1"
  }, "run_1")
  assert.equal(patch.error, null)
  assert.equal(patch.messages[0]?.tools?.[0]?.state, "output-error")
})

function hydratedPendingAssistant(): ThreadMessage[] {
  return [
    { id: "msg_user_back", role: "user", content: "desktop catchup", createdAt: 1 },
    {
      id: "msg_asst_back",
      role: "assistant",
      content: "",
      createdAt: 2,
      tools: [
        {
          id: "tool_catchup_4",
          name: "desktop_act",
          state: "approval-requested",
          args: { action: "click", appName: "备忘录", elementName: "今日" }
        }
      ]
    }
  ]
}

test("泵出错结清 cancelled + run_failed：工具行走出错，不是已停止", () => {
  const patch = reduceStreamEvent(hydratedPendingAssistant(), {
    type: "approval.resolved",
    runId: "run_catchup",
    toolCallId: "tool_catchup_4",
    decision: "cancelled",
    code: "run_failed"
  }, "run_catchup")
  const tool = patch.messages[1]?.tools?.[0]
  assert.ok(tool)
  assert.equal(tool.state, "output-error")
  assert.equal(mapToolStatus(tool.state, tool), "error")
  assert.notEqual(mapToolStatus(tool.state, tool), "stopped")
  assert.notEqual(mapToolStatus(tool.state, tool), "denied")
})

test("Stop 结清 cancelled：工具行走已停止，不是已拒绝", () => {
  const patch = reduceStreamEvent(hydratedPendingAssistant(), {
    type: "approval.resolved",
    runId: "run_catchup",
    toolCallId: "tool_catchup_4",
    decision: "cancelled"
  }, "run_catchup")
  const tool = patch.messages[1]?.tools?.[0]
  assert.ok(tool)
  assert.equal(patch.pendingApproval, null)
  assert.equal(tool.state, "output-error")
  assert.equal(mapToolStatus(tool.state, tool), "stopped")
  assert.notEqual(mapToolStatus(tool.state, tool), "denied")
})

test("切走再切回后的非流式助手：deny 立刻折成未执行，不转圈、不计入已运行", () => {
  const hydrated = hydratedPendingAssistant()
  assert.equal(hydrated[1]?.streaming, undefined)
  const patch = reduceStreamEvent(hydrated, {
    type: "approval.resolved",
    runId: "run_catchup",
    toolCallId: "tool_catchup_4",
    decision: "deny"
  }, "run_catchup")
  const tool = patch.messages[1]?.tools?.[0]
  assert.ok(tool)
  assert.equal(patch.pendingApproval, null)
  assert.equal(patch.heldResolved, undefined)
  assert.equal(tool.state, "output-denied")
  assert.equal(isToolNotExecuted(tool), true)
  assert.equal(mapToolStatus(tool.state, tool), "denied")
  assert.notEqual(mapToolStatus(tool.state, tool), "running")
  assert.equal([tool].filter((row) => !isToolNotExecuted(row)).length, 0)
})

test("切回后允许一次但观察过期：tool.result 折到非流式助手，文案不是已拒绝", () => {
  const patch = reduceStreamEvent(hydratedPendingAssistant(), {
    type: "tool.result",
    runId: "run_catchup",
    toolCallId: "tool_catchup_4",
    name: "desktop_act",
    result: { code: "stale_observation", decision: "allow" },
    error: "stale_observation"
  }, "run_catchup")
  const tool = patch.messages[1]?.tools?.[0]
  assert.ok(tool)
  assert.equal(isToolNotExecuted(tool), true)
  assert.equal(isStaleObservationAfterAllow(tool), true)
  assert.equal(mapToolStatus(tool.state, tool), "skipped")
  assert.notEqual(mapToolStatus(tool.state, tool), "denied")
  assert.equal([tool].filter((row) => !isToolNotExecuted(row)).length, 0)
})

test("主 run 结束后标题补全 run.start 不认领、text.delta 不打开助手气泡", () => {
  const afterMain: ThreadMessage[] = [
    { id: "msg_user", role: "user", content: "写一段摘要", createdAt: 1 },
    { id: "msg_asst", role: "assistant", content: "好的", createdAt: 2, streaming: false }
  ]
  const start = reduceStreamEvent(
    afterMain,
    { type: "run.start", runId: "run_title", sessionId: "ses_a", kind: "completion" },
    null
  )
  assert.equal(start.runId, undefined)
  assert.equal(start.running, undefined)
  const delta = reduceStreamEvent(
    start.messages,
    { type: "text.delta", runId: "run_title", text: "精炼标题" },
    start.runId ?? null
  )
  assert.equal(
    delta.messages.some((row) => row.role === "assistant" && row.streaming && row.content.includes("精炼")),
    false
  )
  assert.equal(delta.messages.at(-1)?.content, "好的")
})

test("首发失败稳定码写回 error 并留下草稿", () => {
  const messages: ThreadMessage[] = [
    { id: "msg_user_1", role: "user", content: "hello draft", createdAt: 1 },
    { id: "msg_1", role: "assistant", content: "", createdAt: 2, streaming: true }
  ]
  const invalid = reduceStreamEvent(
    messages,
    { type: "run.error", runId: "run_1", message: "401 Unauthorized", code: "credential_invalid" },
    "run_1"
  )
  assert.equal(invalid.error, "credential_invalid")
  assert.equal(invalid.composer, "hello draft")
  const unreachable = reduceStreamEvent(
    messages,
    { type: "run.error", runId: "run_1", message: "ECONNREFUSED", code: "provider_unreachable" },
    "run_1"
  )
  assert.equal(unreachable.error, "provider_unreachable")
  assert.equal(unreachable.composer, "hello draft")
  assert.equal(JSON.stringify(invalid).includes("Unauthorized"), false)
})

test("回灌前消息为空：deny 先挂住，不得假装已经折进工具行", () => {
  const patch = reduceStreamEvent([], {
    type: "approval.resolved",
    runId: "run_catchup",
    toolCallId: "tool_catchup_4",
    decision: "deny"
  }, "run_catchup")
  assert.equal(patch.messages.length, 0)
  assert.equal(patch.pendingApproval, null)
  assert.equal(patch.heldResolved?.type, "approval.resolved")
  assert.equal(patch.heldResolved?.toolCallId, "tool_catchup_4")
})
