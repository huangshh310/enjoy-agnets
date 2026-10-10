/**
 * 收工判定走真实事件链：decideTurnOutcome → acceptStreamEvent → workflow + Attention。
 * 前台 / 后台会话必须得到同一结果。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { decideTurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import type { StreamEvent } from "@enjoy-agents/ipc-contract"
import { acceptStreamEvent } from "../../../main/services/accept-stream-event.ts"
import { ingestAttentionEvent } from "../stores/attention/ingest-attention.ts"
import { workflowAfterStreamEvent } from "../components/ai-chat/review-gate/review-gate-phase.ts"
import { omitCompleteFromTurn } from "../components/ai-chat/review-gate/turn-from-event.ts"

function applyChain(sessionId: string, event: StreamEvent) {
  const workflow = workflowAfterStreamEvent(event.type, { turn: "turn" in event ? event.turn : undefined })
  const items = ingestAttentionEvent([], {
    event,
    sessionId,
    sessionTitle: sessionId,
    now: 1,
    omitComplete: omitCompleteFromTurn(event, false)
  })
  return {
    workflow,
    complete: items.some((item) => item.kind === "complete" && item.status === "active"),
    error: items.some((item) => item.kind === "error" && item.status === "active")
  }
}

function sameFgBg(event: StreamEvent) {
  const accepted = acceptStreamEvent(event)
  assert.ok(accepted, "acceptStreamEvent dropped the event")
  const fg = applyChain("ses_fg", accepted)
  const bg = applyChain("ses_bg", accepted)
  assert.deepEqual(fg, bg)
  return fg
}

test("存储失败：前景后台都不完成、不进待验收，只出出错", () => {
  const turn = decideTurnOutcome({ ended: "error", tools: [] })
  const result = sameFgBg({
    type: "run.error",
    runId: "run_err",
    message: "INTERNAL_STORE_ERROR",
    turn
  })
  assert.deepEqual(result, { workflow: "in_progress", complete: false, error: true })
})

test("只读 hello：完成但不进待验收", () => {
  const turn = decideTurnOutcome({ ended: "end", tools: [] })
  const result = sameFgBg({ type: "run.end", runId: "run_hi", turn })
  assert.deepEqual(result, { workflow: "todo", complete: true, error: false })
})

test("全拒绝：中性、不进待验收、不弹已完成", () => {
  const turn = decideTurnOutcome({
    ended: "end",
    tools: [{ name: "write_file", state: "output-denied", errorText: "已拒绝，本次未执行" }]
  })
  const result = sameFgBg({ type: "run.end", runId: "run_deny", turn })
  assert.deepEqual(result, { workflow: "todo", complete: false, error: false })
})

test("允许写盘：待验收 + 已完成；ACP 已执行态也算", () => {
  const turn = decideTurnOutcome({
    ended: "end",
    tools: [{ name: "write_file", state: "output-available" }]
  })
  const result = sameFgBg({ type: "run.end", runId: "run_write", turn })
  assert.deepEqual(result, { workflow: "needs_review", complete: true, error: false })
})

test("用户停：写类已开始则待验收，已停止不是完成", () => {
  const turn = decideTurnOutcome({
    ended: "abort",
    tools: [{ name: "write_file", state: "input-available" }]
  })
  const result = sameFgBg({
    type: "run.error",
    runId: "run_stop",
    message: "Aborted by user.",
    turn
  })
  assert.deepEqual(result, { workflow: "needs_review", complete: false, error: true })
})
