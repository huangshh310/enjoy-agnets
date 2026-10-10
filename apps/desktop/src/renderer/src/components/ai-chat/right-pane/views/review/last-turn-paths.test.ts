import assert from "node:assert/strict"
import { test } from "node:test"
import { groupChangedPaths, lastTurnDeniedOnly, pathsFromLastTurn, pathsFromTools } from "./last-turn-paths.ts"
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

test("拒绝 / 未执行的写盘不算本轮改动", () => {
  const messages = [
    msg({ role: "user", content: "write a note" }),
    msg({
      role: "assistant",
      content: "",
      tools: [
        {
          id: "1",
          name: "write_file",
          args: { path: "e2e-stub.txt" },
          state: "output-denied",
          errorText: "已拒绝，本次未执行"
        }
      ]
    })
  ]
  assert.deepEqual(pathsFromLastTurn(messages), [])
  assert.deepEqual(
    pathsFromTools([
      { id: "1", name: "write_file", args: { path: "e2e-stub.txt" }, state: "output-denied" }
    ]),
    []
  )
  assert.equal(lastTurnDeniedOnly(messages), true)
})

test("还在审批的写盘也不算本轮改动", () => {
  assert.deepEqual(
    pathsFromTools([
      { id: "1", name: "write_file", args: { path: "e2e-stub.txt" }, state: "approval-requested" }
    ]),
    []
  )
})

test("已允许的 write_file 立刻用入参 path，不等 result", () => {
  assert.deepEqual(
    pathsFromTools([
      { id: "1", name: "write_file", args: { path: "e2e-stub.txt" }, state: "input-available" }
    ]),
    ["e2e-stub.txt"]
  )
})

test("用户停封口的 write_file 立刻列 path", () => {
  const messages = [
    msg({ role: "user", content: "write a note" }),
    msg({
      role: "assistant",
      content: "",
      tools: [
        {
          id: "1",
          name: "write_file",
          args: { path: "e2e-stub.txt" },
          state: "output-error",
          result: { code: "user_aborted" }
        }
      ]
    })
  ]
  assert.deepEqual(pathsFromLastTurn(messages), ["e2e-stub.txt"])
})

test("写盘 output-error 算本轮改动，进待验收", () => {
  const messages = [
    msg({ role: "user", content: "write a note" }),
    msg({
      role: "assistant",
      content: "",
      tools: [
        {
          id: "1",
          name: "write_file",
          args: { path: "half-written.txt" },
          state: "output-error",
          errorText: "EACCES"
        }
      ]
    })
  ]
  assert.deepEqual(pathsFromLastTurn(messages), ["half-written.txt"])
  assert.equal(lastTurnDeniedOnly(messages), false)
})

test("带未执行码的 output-error 仍不算本轮改动", () => {
  const messages = [
    msg({ role: "user", content: "write a note" }),
    msg({
      role: "assistant",
      content: "",
      tools: [
        {
          id: "1",
          name: "write_file",
          args: { path: "e2e-stub.txt" },
          state: "output-error",
          result: { code: "APPROVAL_REPLAY_DENIED" },
          errorText: "本次未执行。"
        }
      ]
    })
  ]
  assert.deepEqual(pathsFromLastTurn(messages), [])
  assert.equal(lastTurnDeniedOnly(messages), true)
})

test("纯聊天没有工具，不算拒绝收工", () => {
  assert.equal(
    lastTurnDeniedOnly([
      msg({ role: "user", content: "hello" }),
      msg({ role: "assistant", content: "stub-ok hello" })
    ]),
    false
  )
})

test("按目录分成两级改动树", () => {
  assert.deepEqual(groupChangedPaths(["src/a.ts", "src/b.ts", "readme.md"]), [
    { dir: "src", files: ["a.ts", "b.ts"] },
    { dir: ".", files: ["readme.md"] }
  ])
})
