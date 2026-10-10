import assert from "node:assert/strict"
import { test } from "node:test"
import { mapToolStatus } from "../components/ai-chat/thread/thinking/extract-step-fields.ts"
import { hydrateAssistantTools } from "./hydrate-assistant-tools.ts"

test("落库 output-available 封成完成，不得当 pending", () => {
  const [tool] = hydrateAssistantTools(
    [
      {
        id: "t1",
        name: "write_file",
        state: "output-available",
        result: { ok: true }
      }
    ],
    undefined,
    true
  ) ?? []
  assert.ok(tool)
  assert.equal(tool.state, "output-available")
  assert.equal(mapToolStatus(tool.state, tool), "completed")
  assert.notEqual(mapToolStatus(tool.state, tool), "running")
})

test("信封空、parts 有完成工具：补回最新一轮", () => {
  const tools = hydrateAssistantTools(undefined, [
    {
      type: "tool",
      toolCallId: "t_last",
      name: "bash",
      state: "output-available",
      result: { ok: true }
    }
  ], true)
  assert.equal(tools?.[0]?.id, "t_last")
  assert.equal(tools?.[0]?.state, "output-available")
  assert.equal(mapToolStatus(tools![0]!.state, tools![0]), "completed")
})

test("parts 有结果但没写 state：按完成封，不转圈", () => {
  const tools = hydrateAssistantTools([], [
    { type: "tool", toolCallId: "t2", name: "write_file", result: { ok: true } }
  ], true)
  assert.equal(tools?.[0]?.state, "output-available")
  assert.equal(mapToolStatus(tools![0]!.state, tools![0]), "completed")
})
