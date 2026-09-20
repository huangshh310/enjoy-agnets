import assert from "node:assert/strict"
import { test } from "node:test"
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { collectRunLedger, lastAssistantTurn } from "./collect-run-ledger.ts"

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

test("工具 / 命令 / 错误分行，不编造耗时", () => {
  const rows = collectRunLedger({
    id: "a",
    tools: [
      tool({ id: "t1", name: "read_file", args: { path: "login.ts" } }),
      tool({ id: "t2", name: "bash", args: { command: "pnpm test" } }),
      tool({ id: "t3", name: "edit_file", args: { path: "a.ts" }, state: "output-error", errorText: "boom" })
    ]
  })
  assert.deepEqual(
    rows.map((row) => [row.kind, row.title, row.durationMs, row.failed]),
    [
      ["tool", "login.ts", undefined, false],
      ["command", "$ pnpm test", undefined, false],
      ["error", "a.ts", undefined, true]
    ]
  )
})

test("没有真实 token 就不画用量行", () => {
  assert.equal(collectRunLedger({ id: "a", tools: [] }).length, 0)
  assert.equal(collectRunLedger({ id: "a", tools: [] }, 0).length, 0)
  assert.equal(collectRunLedger({ id: "a", tools: [] }, 1200)[0]?.kind, "usage")
})
