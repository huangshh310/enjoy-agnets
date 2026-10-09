/**
 * Agent 内存态：活跃 run、事件推送。泵与审批都走这里，不回指 runner。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { snapshotConversationDesktopAllow, stripAnyDesktopSessionAllow } from "@enjoy-agents/agent-core/computer-use"
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
  sessionApprovedBashPrefixes: Set<string>
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
  noCacheTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  reportedCostUsd?: number
  /** 多泵里有一轮没 usage.updated，整次估算未知。 */
  usageIncomplete?: boolean
  maxPumpInputTokens?: number
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
  /** 用户点 Stop。与超时 abort 共用 AbortController，必须单独记。 */
  userCancelled?: boolean
  /** 补跑 Dock 超时：abort 前同步打上，谁先 fail 都写超时码。 */
  catchUpApprovalTimedOut?: boolean
}

const activeRuns = new Map<string, ActiveRun>()
const runWaiters = new Map<string, Array<(result: RunSettleResult) => void>>()
const settledRuns = new Map<string, RunSettleResult>()

/** waitForRunSettle 的收工结果：end 带真实产出摘要，error 带失败原因。 */
export type RunSettleResult = { status: "end" | "error"; summary: string }

/** settledRuns 只为晚到的 waiter 兜底；上限防长进程内存缓涨。 */
const SETTLED_RUNS_CAP = 200

export function emitEvent(window: BrowserWindow, event: StreamEvent) {
  const next = withAutomationApprovalSource(event)
  const sessionId = next.sessionId ?? sessionIdOfRun(next)
  if (sessionId) {
    stampAndSend(window, next, sessionId)
    settleRunWaiters(next)
    return
  }
  if (window.isDestroyed()) return
  window.webContents.send("agent.event", next)
  settleRunWaiters(next)
}

function withAutomationApprovalSource(event: StreamEvent): StreamEvent {
  if (event.type !== "approval.required" || event.automationSource) return event
  const source = getActiveRun(event.runId)?.input.automationSource
  return source ? { ...event, automationSource: source } : event
}

/** Workflow / Automation 等待同一 run 收工。 */
export function waitForRunSettle(runId: string): Promise<RunSettleResult> {
  const already = settledRuns.get(runId)
  if (already) return Promise.resolve(already)
  return new Promise((resolve) => {
    const queued = runWaiters.get(runId) ?? []
    queued.push(resolve)
    runWaiters.set(runId, queued)
  })
}

/** 带摘要的显式收工：completeAgentRun / failPump 在 emit 前调用。 */
export function settleRun(runId: string, result: RunSettleResult): void {
  if (settledRuns.has(runId) && !runWaiters.has(runId)) return
  settledRuns.set(runId, result)
  while (settledRuns.size > SETTLED_RUNS_CAP) {
    const oldest = settledRuns.keys().next().value
    if (oldest === undefined) break
    settledRuns.delete(oldest)
  }
  const waiters = runWaiters.get(runId)
  if (!waiters?.length) return
  runWaiters.delete(runId)
  for (const resolve of waiters) resolve(result)
}

/** 兜底：没有显式 settleRun 的发射点（prepare 失败 / 生成类 run）在这里收口。 */
function settleRunWaiters(event: StreamEvent): void {
  if (event.type !== "run.end" && event.type !== "run.error") return
  if (!settledRuns.has(event.runId)) {
    settledRuns.set(event.runId, {
      status: event.type === "run.end" ? "end" : "error",
      summary: ""
    })
    while (settledRuns.size > SETTLED_RUNS_CAP) {
      const oldest = settledRuns.keys().next().value
      if (oldest === undefined) break
      settledRuns.delete(oldest)
    }
  }
  const waiters = runWaiters.get(event.runId)
  if (!waiters?.length) return
  runWaiters.delete(event.runId)
  const result = settledRuns.get(event.runId) ?? { status: "error" as const, summary: "" }
  for (const resolve of waiters) resolve(result)
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

/** Dock / overlay 兜底：当前标了 pumping 的 run。审批续跑优先走 ALS。 */
export function currentPumpingRunId(): string | undefined {
  return listActiveRuns().find((item) => item.run.pumping)?.runId
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
    // P1-S：从会话表复制，不是空 Set。run 结束不清表。
    sessionApprovedTools: initialSessionApprovedTools(patch.input),
    sessionApprovedBashPrefixes: new Set(),
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

function initialSessionApprovedTools(input: RunAgentInput): Set<string> {
  const snapshot = snapshotConversationDesktopAllow(input.sessionId)
  return input.denyAnyDesktop ? stripAnyDesktopSessionAllow(snapshot) : snapshot
}
