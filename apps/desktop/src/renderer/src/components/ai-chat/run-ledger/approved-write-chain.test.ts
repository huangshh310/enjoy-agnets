/**
 * 真路径：SDK fullStream → map-part → fold / finalize → 账本。
 * 允许后的 write_file 若带 tool-result，收工应是 output-available + 成功改文件，
 * 证明 luna 在「本轮账本」看到的「1 个失败 · No result received.」只出在旧 stub。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { mapStreamPart } from "@enjoy-agents/agent-core"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { reduceStreamEvent } from "../../../stores/apply-stream-event.ts"
import type { ThreadMessage } from "../../../stores/chat-store"
import { collectRunLedger } from "./collect-run-ledger.ts"
import { ledgerKindCounts, ledgerSummarySegments } from "./run-ledger-summary.ts"

const RUN_ID = "run_write"
const TOOL_ID = "tool_write_1"

function t(path: string, vars?: { n?: number }): string {
  if (path === "sessionOps.ledgerSummaryError") return `${vars?.n ?? 0} 个失败`
  if (path === "sessionOps.ledgerSummaryEdit") return `改了 ${vars?.n ?? 0} 个文件`
  return path
}

function apply(messages: ThreadMessage[], event: StreamEvent | null): ThreadMessage[] {
  if (!event) return messages
  return reduceStreamEvent(messages, event, RUN_ID).messages
}

function afterApprovalCard(): ThreadMessage[] {
  let messages: ThreadMessage[] = []
  messages = apply(messages, { type: "run.start", runId: RUN_ID, prompt: "please write a note" })
  messages = apply(
    messages,
    mapStreamPart(
      {
        type: "tool-call",
        toolCallId: TOOL_ID,
        toolName: "write_file",
        input: { path: "note.txt", content: "hi" }
      },
      RUN_ID
    )
  )
  messages = apply(
    messages,
    mapStreamPart(
      {
        type: "tool-approval-request",
        toolCallId: TOOL_ID,
        approvalId: "apr_write_1",
        toolName: "write_file",
        input: { path: "note.txt", content: "hi" }
      },
      RUN_ID
    )
  )
  return apply(messages, {
    type: "approval.resolved",
    runId: RUN_ID,
    toolCallId: TOOL_ID,
    decision: "allow"
  })
}

test("真路径允许写盘：SDK tool-result 折成 output-available，账本是成功不是失败", () => {
  let messages = afterApprovalCard()
  assert.equal(messages.find((row) => row.role === "assistant")?.tools?.[0]?.state, "input-available")

  messages = apply(
    messages,
    mapStreamPart(
      {
        type: "tool-result",
        toolCallId: TOOL_ID,
        toolName: "write_file",
        input: { path: "note.txt", content: "hi" },
        output: { path: "note.txt", additions: 1, deletions: 0, bytes: 2 }
      },
      RUN_ID
    )
  )
  messages = apply(messages, { type: "run.end", runId: RUN_ID })
  const tool = messages.find((row) => row.role === "assistant")?.tools?.[0]
  assert.equal(tool?.state, "output-available")
  assert.equal(tool?.errorText, undefined)
  const entries = collectRunLedger(messages.find((row) => row.role === "assistant") ?? null)
  const counts = ledgerKindCounts(entries)
  assert.equal(counts.edit, 1)
  assert.equal(counts.error, 0)
  assert.equal(entries[0]?.failed, false)
  assert.equal(entries[0]?.fileName, "note.txt")
  assert.equal(
    ledgerSummarySegments(counts, t).some((part) => part.text.includes("个失败")),
    false
  )
})

test("允许后没有 tool-result：finalize 封成 No result received，账本失败（旧 stub）", () => {
  const sealed = apply(afterApprovalCard(), { type: "run.end", runId: RUN_ID })
  const leftover = sealed.find((row) => row.role === "assistant")?.tools?.[0]
  assert.equal(leftover?.state, "output-error")
  assert.equal(leftover?.errorText, "No result received.")
  const failed = collectRunLedger(sealed.find((row) => row.role === "assistant") ?? null)
  assert.equal(ledgerKindCounts(failed).error, 1)
  assert.equal(failed[0]?.failed, true)
  assert.equal(failed[0]?.detail, "No result received.")
})
