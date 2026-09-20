import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { collectRunLedger, groupRunLedger, lastAssistantTurn } from "./collect-run-ledger.ts"
import { ledgerGroupDefaultOpen, ledgerOpensSources } from "./format-ledger-entry.ts"

function tool(partial: Partial<ThreadToolCall> & Pick<ThreadToolCall, "id" | "name">): ThreadToolCall {
  return { state: "output-available", ...partial }
}

test("最后一条助手轮，没有则 null", () => {
  const last = lastAssistantTurn([
    { id: "u", role: "user", content: "hi", createdAt: 1 },
    { id: "a", role: "assistant", content: "ok", createdAt: 2 }
  ])
  assert.equal(last?.id, "a")
  assert.equal(lastAssistantTurn([]), null)
})

test("按 kind 收人话行：读/改/命令/错，不编造耗时，不带 stdout", () => {
  const rows = collectRunLedger({
    id: "a",
    tools: [
      tool({ id: "t1", name: "read_file", args: { path: "src/auth/LoginForm.tsx" } }),
      tool({ id: "t2", name: "bash", args: { command: "npm test" }, result: { stdout: "FAIL\nexpect(1).toBe(2)" } }),
      tool({
        id: "t3",
        name: "edit_file",
        args: { path: "src/auth/auth.ts" },
        state: "output-error",
        errorText: "boom\nstack"
      }),
      tool({ id: "t4", name: "edit_file", args: { path: "src/auth/LoginForm.tsx" } })
    ]
  })
  assert.deepEqual(
    rows.map((row) => [row.kind, row.title, row.fileName, row.durationMs, row.failed, row.output != null]),
    [
      ["command", "npm test", undefined, undefined, false, true],
      ["error", "auth.ts", "auth.ts", undefined, true, false],
      ["edit", "LoginForm.tsx", "LoginForm.tsx", undefined, false, false]
    ]
  )
  assert.equal(rows[2]?.pathHint, "src/auth/…")
  assert.equal(rows[0]?.title.includes("FAIL"), false)
  assert.equal(rows[1]?.detail, "boom")
})

test("失败命令留在命令组，摘要是 bash · 命令 · 失败，不是错误组 dump", () => {
  const rows = collectRunLedger({
    id: "a",
    tools: [
      tool({
        id: "t1",
        name: "bash",
        args: { command: "npm test" },
        result: { exitCode: 1, stdout: "AssertionError: expected true" }
      })
    ]
  })
  assert.equal(rows[0]?.kind, "command")
  assert.equal(rows[0]?.failed, true)
  assert.equal(rows[0]?.title, "npm test")
  assert.equal(rows[0]?.toolLabel, "bash")
  const grouped = groupRunLedger(rows)
  assert.deepEqual(
    grouped.groups.map((group) => [group.kind, group.entries.length]),
    [["command", 1]]
  )
})

test("没有真实 token 就不画用量行", () => {
  assert.equal(collectRunLedger({ id: "a", tools: [] }).length, 0)
  assert.equal(collectRunLedger({ id: "a", tools: [] }, 0).length, 0)
  assert.equal(collectRunLedger({ id: "a", tools: [] }, 1200)[0]?.kind, "usage")
})

test("读/命令默认折叠，改/错误默认展开；用量行不开 sheet", () => {
  assert.equal(ledgerGroupDefaultOpen("read"), false)
  assert.equal(ledgerGroupDefaultOpen("command"), false)
  assert.equal(ledgerGroupDefaultOpen("edit"), true)
  assert.equal(ledgerGroupDefaultOpen("error"), true)
  assert.equal(
    ledgerOpensSources({ id: "r", kind: "read", title: "a.ts", path: "a.ts" }),
    true
  )
  assert.equal(ledgerOpensSources({ id: "c", kind: "command", title: "npm test" }), false)
  assert.equal(ledgerOpensSources({ id: "u", kind: "usage", title: "12" }), false)
  assert.equal(
    ledgerOpensSources({ id: "e", kind: "edit", title: "todo_write" }),
    false
  )
})

test("todo_write 不进账本", () => {
  const rows = collectRunLedger({
    id: "a",
    tools: [
      tool({ id: "t1", name: "todo_write", args: { todos: [{ title: "改色板" }] } }),
      tool({ id: "t2", name: "edit_file", args: { path: "src/app.css" } })
    ]
  })
  assert.deepEqual(
    rows.map((row) => [row.kind, row.title]),
    [["edit", "app.css"]]
  )
})

test("弱名 command 按 path/diff 拆成读/改，有 shell 才进命令组", () => {
  const rows = collectRunLedger({
    id: "a",
    tools: [
      tool({ id: "t1", name: "command", args: { path: "src/page.tsx" } }),
      tool({
        id: "t2",
        name: "command",
        args: { path: "src/page.tsx", content: "<main />" }
      }),
      tool({ id: "t3", name: "command", args: { command: "pnpm lint" } }),
      tool({ id: "t4", name: "command", args: {} }),
      tool({
        id: "t5",
        name: "bash",
        args: { command: "apply", path: "src/theme.css", content: "body{}" }
      })
    ]
  })
  assert.deepEqual(
    rows.map((row) => [row.kind, row.title]),
    [
      ["edit", "page.tsx"],
      ["command", "pnpm lint"],
      ["edit", "theme.css"]
    ]
  )
})

test("只读的文件保留；同一 path 既读又改时只留改", () => {
  const rows = collectRunLedger({
    id: "a",
    tools: [
      tool({ id: "t1", name: "read_file", args: { path: "src/keep.ts" } }),
      tool({ id: "t2", name: "read_file", args: { path: "src/app.css" } }),
      tool({ id: "t3", name: "edit_file", args: { path: "src/app.css" } })
    ]
  })
  assert.deepEqual(
    rows.map((row) => [row.kind, row.title]),
    [
      ["read", "keep.ts"],
      ["edit", "app.css"]
    ]
  )
})
