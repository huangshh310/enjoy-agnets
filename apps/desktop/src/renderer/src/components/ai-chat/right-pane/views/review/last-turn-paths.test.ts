import assert from "node:assert/strict"
import { test } from "node:test"
import { pathsFromLastTurn } from "./last-turn-paths.ts"
import type { ThreadMessage } from "../../../../stores/chat-store.types.ts"

function msg(partial: Partial<ThreadMessage> & Pick<ThreadMessage, "role" | "content">): ThreadMessage {
  return {
    id: partial.id ?? "m",
    createdAt: 1,
    ...partial
  }
}

test("抽取最后一轮 write_file / edit_file 的 path", () => {
  const messages = [
    msg({ role: "user", content: "先改 a" }),
    msg({
      role: "assistant",
      content: "",
      tools: [{ id: "1", name: "write_file", args: { path: "old.ts" }, state: "output-available" }]
    }),
    msg({ role: "user", content: "再改 b" }),
    msg({
      role: "assistant",
      content: "",
      tools: [
        { id: "2", name: "edit_file", args: { path: "src/b.ts" }, state: "output-available" },
        { id: "3", name: "read_file", args: { path: "skip.ts" }, state: "output-available" }
      ]
    })
  ]
  assert.deepEqual(pathsFromLastTurn(messages), ["src/b.ts"])
})

test("续跑用户句不切断上一轮", () => {
  const messages = [
    msg({ role: "user", content: "做完" }),
    msg({
      role: "assistant",
      content: "",
      tools: [{ id: "1", name: "write_file", args: { path: "a.ts" }, state: "output-available" }]
    }),
    msg({ role: "user", content: "继续完成未完成的内容" })
  ]
  assert.deepEqual(pathsFromLastTurn(messages), ["a.ts"])
})

test("助手正文变长不改变上一轮 path", () => {
  const tools = [{ id: "1", name: "write_file", args: { path: "a.ts" }, state: "output-available" as const }]
  const before = [
    msg({ role: "user", content: "改" }),
    msg({ role: "assistant", content: "a", tools })
  ]
  const after = [
    msg({ role: "user", content: "改" }),
    msg({ role: "assistant", content: "a".repeat(4000), tools })
  ]
  assert.deepEqual(pathsFromLastTurn(before), pathsFromLastTurn(after))
})
