/**
 * Agent 内存态：活跃 run、事件推送。泵与审批都走这里，不回指 runner。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import type { RunAgentInput, StreamEvent, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import type { PendingApproval } from "./consume-stream"
import { createApprovalGate, type ApprovalGate } from "./approval-gate"
import type { CitedSource } from "./cite-knowledge"
import { emptyTranscript, type RunTranscript } from "./persist-session"
import type { StoredSecret } from "./secrets"

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
  startedAt: number
  firstTokenAt?: number
  inputTokens?: number
  outputTokens?: number
  citedSources: CitedSource[]
  /** 跨审批泵累积，失败/中止也靠这份落库。 */
  transcript: RunTranscript
  tools: ThreadToolCall[]
  assistantPersisted: boolean
}

const activeRuns = new Map<string, ActiveRun>()

export function emitEvent(window: BrowserWindow, event: StreamEvent) {
  if (window.isDestroyed()) return
  window.webContents.send("agent.event", event)
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
    startedAt: Date.now(),
    citedSources: patch.citedSources ?? [],
    transcript: emptyTranscript(),
    tools: [],
    assistantPersisted: false
  })
}
