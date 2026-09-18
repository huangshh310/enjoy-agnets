import assert from "node:assert/strict"
import { test } from "node:test"
import { groupChangedPaths, pathsFromLastTurn, pathsFromTools } from "./last-turn-paths.ts"
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

test("apply_patch 算写盘，web_search 不算", () => {
  const messages = [
    msg({ role: "user", content: "改" }),
    msg({
      role: "assistant",
      content: "",
      tools: [
        { id: "1", name: "apply_patch", args: { path: "a.ts" }, state: "output-available" },
        { id: "2", name: "web_search", args: { path: "https://example.com" }, state: "output-available" }
      ]
    })
  ]
  assert.deepEqual(pathsFromLastTurn(messages), ["a.ts"])
})

test("CLI 写盘工具名也能抽出 path", () => {
  const messages = [
    msg({ role: "user", content: "改" }),
    msg({
      role: "assistant",
      content: "",
      tools: [
        { id: "1", name: "Write", args: { path: "a.ts" }, state: "output-available" },
        { id: "2", name: "StrReplace", args: { path: "b.ts" }, state: "output-available" },
        { id: "3", name: "Read", args: { path: "skip.ts" }, state: "output-available" }
      ]
    })
  ]
  assert.deepEqual(pathsFromLastTurn(messages), ["a.ts", "b.ts"])
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

test("单轮工具 path 给气泡改动树", () => {
  assert.deepEqual(
    pathsFromTools([
      { id: "1", name: "write_file", args: { path: "a.ts" }, state: "output-available" },
      { id: "2", name: "read_file", args: { path: "skip.ts" }, state: "output-available" }
    ]),
    ["a.ts"]
  )
})

test("按目录分成两级改动树", () => {
  assert.deepEqual(groupChangedPaths(["src/a.ts", "src/b.ts", "readme.md"]), [
    { dir: "src", files: ["a.ts", "b.ts"] },
    { dir: ".", files: ["readme.md"] }
  ])
})
