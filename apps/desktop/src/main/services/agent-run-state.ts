/**
 * Agent 内存态：活跃 run、事件推送。泵与审批都走这里，不回指 runner。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import type { AskUserAnswers, RunAgentInput, StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { PendingApproval } from "./consume-stream"
import { createApprovalGate, type ApprovalGate } from "./approval-gate"
import type { CitedSource } from "./cite-knowledge"
import { emptyTranscript, type RunTranscript } from "./persist-session"
import type { StoredSecret } from "./secrets"
import { stampAndSend } from "./event-bus"

export type ActiveRun = {
  abort: AbortController
  messages: ModelMessage[]
  window: BrowserWindow
  input: RunAgentInput
  workspaceRoot: string
  secret?: StoredSecret
  pendingApprovals: PendingApproval[]
  sessionApprovedTools: Set<string>
  approvalGate: ApprovalGate
  pumping: boolean
  resumeAfterPump: boolean
  continuePump: boolean
  /** 因 Todo 未完成而同 run 再泵的次数，上限见 MAX_TODO_CONTINUES。 */
  todoContinues: number
  startedAt: number
  firstTokenAt?: number
  inputTokens?: number
  outputTokens?: number
  citedSources: CitedSource[]
  /** 跨审批泵累积，失败/中止也靠这份落库。 */
  transcript: RunTranscript
  tools: ThreadToolCall[]
  assistantPersisted: boolean
  /** 本轮已 INSERT 的助手消息 id；后续 checkpoint / 终态都 UPDATE 这一行。 */
  assistantMessageId?: string
  /** ask_user_questions 放行后 execute 读取。 */
  questionAnswers?: AskUserAnswers
  /** ACP / 本机写盘本轮已记过检查点。 */
  checkpointNoted?: boolean
}

const activeRuns = new Map<string, ActiveRun>()
const runWaiters = new Map<string, Array<(status: "end" | "error") => void>>()
const settledRuns = new Map<string, "end" | "error">()

export function emitEvent(window: BrowserWindow, event: StreamEvent) {
  const sessionId = event.sessionId ?? sessionIdOfRun(event)
  if (sessionId) {
    stampAndSend(window, event, sessionId)
    settleRunWaiters(event)
    return
  }
  if (window.isDestroyed()) return
  window.webContents.send("agent.event", event)
  settleRunWaiters(event)
}

/** Workflow / Automation 等待同一 run 收工。 */
export function waitForRunSettle(runId: string): Promise<"end" | "error"> {
  const already = settledRuns.get(runId)
  if (already) return Promise.resolve(already)
  return new Promise((resolve) => {
    const queued = runWaiters.get(runId) ?? []
    queued.push(resolve)
    runWaiters.set(runId, queued)
  })
}

function settleRunWaiters(event: StreamEvent): void {
  if (event.type !== "run.end" && event.type !== "run.error") return
  const status = event.type === "run.end" ? "end" : "error"
  settledRuns.set(event.runId, status)
  const waiters = runWaiters.get(event.runId)
  if (!waiters?.length) return
  runWaiters.delete(event.runId)
  for (const resolve of waiters) resolve(status)
}

function sessionIdOfRun(event: StreamEvent): string | undefined {
  const runId = "runId" in event ? event.runId : undefined
  if (!runId) return undefined
  return getActiveRun(runId)?.input.sessionId
}

export function getActiveRun(runId: string): ActiveRun | undefined {
  return activeRuns.get(runId)
}

export function deleteActiveRun(runId: string): void {
  activeRuns.delete(runId)
}

export function listActiveRuns(): Array<{ runId: string; run: ActiveRun }> {
  return [...activeRuns.entries()].map(([runId, run]) => ({ runId, run }))
}

/** 给 agent-run-start 挂内存态；citedSources 补丁复用同一 runId。 */
export function holdAgentRun(
  patch: Partial<ActiveRun> & { runId: string; window?: BrowserWindow; input?: RunAgentInput }
): void {
  const existing = activeRuns.get(patch.runId)
  if (existing) {
    if (patch.citedSources) existing.citedSources = patch.citedSources
    if (patch.messages) existing.messages = patch.messages
    return
  }
  if (!patch.window || !patch.input || !patch.workspaceRoot || !patch.messages) {
    throw new Error("holdAgentRun requires a full run on first call.")
  }
  activeRuns.set(patch.runId, {
    abort: new AbortController(),
    messages: patch.messages,
    window: patch.window,
    input: patch.input,
    workspaceRoot: patch.workspaceRoot,
    secret: patch.secret,
    pendingApprovals: [],
    sessionApprovedTools: new Set(),
    approvalGate: createApprovalGate(),
    pumping: false,
    resumeAfterPump: false,
    continuePump: false,
    todoContinues: 0,
    startedAt: Date.now(),
    citedSources: patch.citedSources ?? [],
    transcript: emptyTranscript(),
    tools: [],
    assistantPersisted: false
  })
}
