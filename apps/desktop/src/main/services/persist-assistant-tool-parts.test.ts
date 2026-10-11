import assert from "node:assert/strict"
import { test } from "node:test"
import { partsFromExtras } from "./persist-parts.ts"

test("助手 parts 带上落库工具态，供冷启动回灌最新一轮", () => {
  const parts = partsFromExtras("再跑命令", {}, [
    { id: "tool_last", name: "bash", state: "output-available", result: { ok: true } }
  ])
  const tool = parts.find((part) => part.type === "tool")
  assert.ok(tool)
  assert.equal(tool.type, "tool")
  if (tool.type !== "tool") return
  assert.equal(tool.toolCallId, "tool_last")
  assert.equal(tool.name, "bash")
  assert.equal(tool.state, "output-available")
})
