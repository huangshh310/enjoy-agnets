import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { splitReasoningAroundTools } from "./split-reasoning-around-tools.ts"

function tool(
  id: string,
  name: string,
  reasoningChars?: number
): ThreadToolCall {
  return {
    id,
    name,
    state: "output-available",
    ...(reasoningChars != null ? { reasoningChars } : {})
  }
}

test("没有 reasoningChars 的旧消息：全部思考放在工具前面", () => {
  const items = splitReasoningAroundTools("先想一遍", [
    tool("t1", "read_file"),
    tool("t2", "glob")
  ])
  assert.deepEqual(
    items.map((item) => item.kind),
    ["think", "tool", "tool"]
  )
  assert.equal(items[0]?.kind === "think" ? items[0].text : "", "先想一遍")
})

test("按工具开始时的字数切开，当前思考落在最后", () => {
  const reasoning = "AAAAABBBBBCCCCC"
  const items = splitReasoningAroundTools(reasoning, [
    tool("t1", "read_file", 5),
    tool("t2", "glob", 10)
  ])
  assert.equal(items.length, 5)
  assert.equal(items[0]?.kind === "think" ? items[0].text : "", "AAAAA")
  assert.equal(items[1]?.kind === "tool" ? items[1].tool.id : "", "t1")
  assert.equal(items[2]?.kind === "think" ? items[2].text : "", "BBBBB")
  assert.equal(items[3]?.kind === "tool" ? items[3].tool.id : "", "t2")
  assert.equal(items[4]?.kind === "think" ? items[4].text : "", "CCCCC")
})

test("工具之后新长出的 reasoning 作为当前思考段", () => {
  const items = splitReasoningAroundTools("AAAAABBBBB", [tool("t1", "read_file", 5)])
  assert.equal(items[0]?.kind === "think" ? items[0].text : "", "AAAAA")
  assert.equal(items[2]?.kind === "think" ? items[2].text : "", "BBBBB")
})

test("todo_write 不占用时间线切口", () => {
  const items = splitReasoningAroundTools("HELLO", [
    tool("todo", "todo_write", 2),
    tool("t1", "read_file", 5)
  ])
  assert.equal(items[0]?.kind === "think" ? items[0].text : "", "HELLO")
  assert.equal(items[1]?.kind === "tool" ? items[1].tool.id : "", "t1")
})
