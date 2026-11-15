/**
 * jojo 门 #226@87aa14b0 阻塞项 1：回执 → 工单。
 * 回执 maybe_partial / completed 一律和有写入一样进待验收（needs_review + stopped）；
 * none_confirmed 照旧（in_progress + stopped，不进验收）。
 * 不依赖 run.tools 的封口形态：审批放行后被停的 bash 在 run.tools 里曾被封成 decision=cancelled。
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import type { BrowserWindow } from "electron"
import type { RunAgentInput, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { decideTurnOutcome } from "@enjoy-agents/ipc-contract/turn-outcome"
import { resetTreeLivenessForTest, setTreeLivenessProbeForTest } from "./command.ts"
import {
  armSettleWatch,
  begin,
  blocked,
  resetRunSideEffectsForTest,
  settle,
  spawned,
  startedToolCallIds
} from "./run-side-effects.ts"
import { sealStartedAsStopped } from "./seal-started-as-stopped.ts"

type Stopped = {
  type: string
  phase: string
  receipt?: { write?: string }
  turn?: { workflow?: string; attention?: string }
}

let seq = 0
function inputFor(): RunAgentInput {
  seq += 1
  return {
    sessionId: `ses_receipt_turn_${seq}`,
    workspaceId: "ws_receipt_turn",
    modelId: "m",
    mode: "agent",
    attachments: [],
    messages: [{ role: "user", content: "hi" }]
  }
}

function fakeWindow(events: unknown[]): BrowserWindow {
  return {
    isDestroyed: () => false,
    webContents: { send: (_ch: string, event: unknown) => void events.push(event) }
  } as unknown as BrowserWindow
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve))
}

function finalOf(events: unknown[]): Stopped | undefined {
  return (events as Stopped[]).find((event) => event.type === "run.stopped" && event.phase !== "stuck")
}

/** 旧封口：审批放行后正在 executeStoredTool 里跑的 bash 被 sealAbandonedTools 封成「未执行」。 */
function approvalSealedBash(id: string, command: string): ThreadToolCall {
  return {
    id,
    name: "bash",
    state: "output-error",
    args: { command },
    result: { code: "user_aborted", decision: "cancelled" }
  } as ThreadToolCall
}

function armWith(runId: string, tools: ThreadToolCall[], events: unknown[]) {
  const input = inputFor()
  armSettleWatch({ runId, sessionId: input.sessionId, window: fakeWindow(events), tools, input, abortAt: Date.now() })
}

afterEach(() => {
  resetRunSideEffectsForTest()
  resetTreeLivenessForTest()
})

test("bash 被停、回执 maybe_partial：这一轮进待验收（即便 run.tools 把它封成了 cancelled）", async () => {
  setTreeLivenessProbeForTest(() => false)
  const events: unknown[] = []
  const runId = "run_rt_bash"
  const entry = begin("bash", { runId, toolCallId: "tool_bash" })
  spawned(entry.id, 4242)
  const tools = [approvalSealedBash("tool_bash", "node stop-probe.js")]
  // 前提：只看 run.tools 的旧判定会把它当没写过。
  assert.equal(decideTurnOutcome({ ended: "abort", tools }).workflow, "in_progress")
  armWith(runId, tools, events)
  settle(entry.id, "killed")
  await flush()
  const end = finalOf(events)
  assert.equal(end?.receipt?.write, "maybe_partial")
  assert.equal(end?.turn?.workflow, "needs_review")
  assert.equal(end?.turn?.attention, "stopped")
})

test("只读 bash（ls）被停、回执 maybe_partial：同样进待验收（回执说可能写过就按写过）", async () => {
  setTreeLivenessProbeForTest(() => false)
  const events: unknown[] = []
  const runId = "run_rt_ls"
  const entry = begin("bash", { runId, toolCallId: "tool_ls" })
  spawned(entry.id, 4343)
  const tools = [
    { id: "tool_ls", name: "bash", state: "output-error", args: { command: "ls" }, result: { code: "user_aborted" } } as ThreadToolCall
  ]
  assert.equal(decideTurnOutcome({ ended: "abort", tools }).workflow, "in_progress")
  armWith(runId, tools, events)
  settle(entry.id, "killed")
  await flush()
  const end = finalOf(events)
  assert.equal(end?.receipt?.write, "maybe_partial")
  assert.equal(end?.turn?.workflow, "needs_review")
})

test("回执 completed（原子写恰好写完）：和有写入一样进待验收", async () => {
  const events: unknown[] = []
  const runId = "run_rt_completed"
  const entry = begin("write_file", { runId, toolCallId: "tool_write" })
  const tools = [
    { id: "tool_write", name: "write_file", state: "approval-requested", args: { path: "a.txt" } } as ThreadToolCall
  ]
  armWith(runId, tools, events)
  settle(entry.id, "ok")
  await flush()
  const end = finalOf(events)
  assert.equal(end?.receipt?.write, "completed")
  assert.equal(end?.turn?.workflow, "needs_review")
  assert.equal(end?.turn?.attention, "stopped")
})

test("回执 none_confirmed（闸前拦下）：照旧不进验收，in_progress + stopped", async () => {
  const events: unknown[] = []
  const runId = "run_rt_none"
  const pending = begin("bash", { runId, toolCallId: "tool_other" })
  blocked("write_file", { runId, toolCallId: "tool_blocked" })
  const tools = [approvalSealedBash("tool_blocked", "node x.js")]
  armWith(runId, tools, events)
  // 闸前拦下的条目 + 一个在途项收尾为「拦下」：整轮 none_confirmed。
  const { markBlocked } = await import("./run-side-effects.ts")
  markBlocked(pending.id)
  await flush()
  const end = finalOf(events)
  assert.equal(end?.receipt?.write, "none_confirmed")
  assert.equal(end?.turn?.workflow, "in_progress")
  assert.equal(end?.turn?.attention, "stopped")
})

test("startedToolCallIds：只认过了闸的条目", () => {
  const runId = "run_rt_ids"
  begin("bash", { runId, toolCallId: "tool_started" })
  blocked("write_file", { runId, toolCallId: "tool_blocked" })
  begin("write_file", { runId })
  assert.deepEqual([...startedToolCallIds(runId)], ["tool_started"])
  assert.equal(startedToolCallIds("run_unknown").size, 0)
})

test("sealStartedAsStopped：已过闸的工具去掉 cancelled 封成已停止，未过闸 / 其他状态原样", () => {
  const tools = [
    approvalSealedBash("tool_started", "node a.js"),
    approvalSealedBash("tool_never", "node b.js"),
    { id: "tool_done", name: "bash", state: "output-available", args: { command: "ls" }, result: { exitCode: 0 } } as ThreadToolCall
  ]
  const sealed = sealStartedAsStopped(tools, new Set(["tool_started", "tool_done"]))
  assert.equal(sealed[0]?.state, "output-error")
  assert.deepEqual(sealed[0]?.result, { code: "user_aborted" })
  assert.equal(decideTurnOutcome({ ended: "abort", tools: [sealed[0]!] }).workflow, "needs_review")
  assert.deepEqual(sealed[1]?.result, { code: "user_aborted", decision: "cancelled" }, "没过闸的仍是未执行")
  assert.equal(sealed[2], tools[2], "已有结果的不动")
  assert.equal(sealStartedAsStopped(tools, new Set()), tools)
})
