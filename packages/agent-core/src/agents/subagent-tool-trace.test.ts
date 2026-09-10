/**
 * 子 Agent 工具追踪：start / 成功 / 失败都要上报，且带父 delegate id。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { traceSubagentTools, type SubagentToolTraceEvent } from "./subagent-tool-trace.ts"

test("成功执行上报 start 再 result", async () => {
  const events: SubagentToolTraceEvent[] = []
  const tools = traceSubagentTools(
    {
      read_file: {
        execute: async (args: unknown) => ({ path: (args as { path: string }).path })
      }
    },
    {
      parentToolCallId: "delegate-1",
      emit: (event) => events.push(event)
    }
  )
  const result = await tools.read_file.execute?.({ path: "a.ts" }, { toolCallId: "t1" })
  assert.deepEqual(result, { path: "a.ts" })
  assert.equal(events[0]?.type, "tool.start")
  assert.equal(events[0]?.parentToolCallId, "delegate-1")
  assert.equal(events[1]?.type, "tool.result")
  assert.equal(events[1]?.toolCallId, "t1")
})

test("失败仍发 result.error 再抛", async () => {
  const events: SubagentToolTraceEvent[] = []
  const tools = traceSubagentTools(
    {
      bash: {
        execute: async () => {
          throw new Error("denied")
        }
      }
    },
    { parentToolCallId: "d", emit: (event) => events.push(event) }
  )
  await assert.rejects(() => tools.bash.execute?.({}, { toolCallId: "b1" }), /denied/)
  assert.equal(events[1]?.error, "denied")
})
