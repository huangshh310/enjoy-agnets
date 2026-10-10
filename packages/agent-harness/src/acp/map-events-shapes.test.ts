/**
 * jojo 探针：每种 ACP sessionUpdate 映射后都过 StreamEvent 白名单。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { SESSION_TITLE_MAX, StreamEvent } from "@enjoy-agents/ipc-contract/stream-event"
import { mapAcpUpdate } from "./map-events.ts"

const UPDATES: Array<{ kind: string; update: Record<string, unknown> }> = [
  { kind: "agent_thought_chunk", update: { sessionUpdate: "agent_thought_chunk", content: { text: "想" } } },
  { kind: "agent_thought", update: { sessionUpdate: "agent_thought", content: { text: "想" } } },
  { kind: "agent_message_chunk", update: { sessionUpdate: "agent_message_chunk", content: { text: "你好" } } },
  { kind: "agent_message", update: { sessionUpdate: "agent_message", content: { text: "你好" } } },
  { kind: "message", update: { sessionUpdate: "message", content: { text: "你好" } } },
  {
    kind: "tool_call",
    update: {
      sessionUpdate: "tool_call",
      toolCallId: "t1",
      title: "Read File",
      kind: "read",
      rawInput: { path: "a.ts" }
    }
  },
  {
    kind: "tool_call_update",
    update: {
      sessionUpdate: "tool_call_update",
      toolCallId: "t1",
      status: "completed",
      title: "Read File",
      kind: "read",
      rawInput: { path: "a.ts" }
    }
  },
  {
    kind: "plan",
    update: { sessionUpdate: "plan", entries: [{ content: "读入口", status: "completed" }] }
  },
  {
    kind: "plan_update",
    update: { sessionUpdate: "plan_update", entries: [{ content: "改 auth", status: "in_progress" }] }
  },
  { kind: "session_info_update", update: { sessionUpdate: "session_info_update", title: "Implement list" } },
  {
    kind: "config_option_update",
    update: {
      sessionUpdate: "config_option_update",
      configOptions: [
        {
          id: "reasoning_effort",
          name: "Effort",
          category: "thought_level",
          currentValue: "high",
          options: [
            { value: "low", name: "Low" },
            { value: "high", name: "High" }
          ]
        }
      ]
    }
  },
  { kind: "usage_update", update: { sessionUpdate: "usage_update", used: 12, size: 200000 } },
  {
    kind: "available_commands_update",
    update: { sessionUpdate: "available_commands_update", availableCommands: [{ name: "plan" }] }
  }
]

test("每种 ACP sessionUpdate 映射后过 StreamEvent 白名单", () => {
  for (const row of UPDATES) {
    const events = mapAcpUpdate(row.update, "run_1")
    assert.ok(events.length > 0, row.kind)
    for (const event of events) {
      assert.equal(StreamEvent.safeParse(event).success, true, `${row.kind} ${event.type}`)
    }
  }
})

test("ACP session.title 超过 200 截断后过闸", () => {
  const events = mapAcpUpdate(
    { sessionUpdate: "session_info_update", title: `T`.repeat(SESSION_TITLE_MAX + 30) },
    "run_1"
  )
  assert.equal(events[0]?.type, "session.title")
  if (events[0]?.type === "session.title") {
    assert.equal(events[0].title.length, SESSION_TITLE_MAX)
  }
  assert.equal(StreamEvent.safeParse(events[0]).success, true)
})
