/**
 * 启动后把 waiting_review 的审批重新挂到 ActiveRun，并发 approval.required。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { parseGenerationCheckpoint } from "@enjoy-agents/agent-core"
import {
  getRun,
  isSupersededSdkApprovalId,
  listApprovalsForRun,
  listPendingApprovals,
  listRuns,
  planSdkReplay,
  resolvedSdkApprovalId,
  updateRun,
  type ApprovalRow
} from "@enjoy-agents/db"
import { inferAgentRunOrigin, RunAgentInput } from "@enjoy-agents/ipc-contract"
import { shouldFailWaitingCatchUp } from "./automations-catchup-orphans"
import { failCatchUpWaitingOnRestart } from "./fail-catchup-waiting-restart"
import { getDatabase } from "./database"
import { getActiveRun, holdAgentRun } from "./agent-run-state"
import { claimRestoreWaitingOnce, markRestoreWaitingSettled } from "./restore-once"
import { readPreferences } from "./preferences"
import { parseWaitingExtras } from "./persist-waiting-run"
import { toModelMessages } from "./to-model-messages"
import { assertApprovalHmac, recordSdkApprovalResponse } from "./approval-hmac"
import { hydrateActiveRunUsage } from "./run-usage"
import { parseStoredApprovalArgs } from "./restore-approval-args"
import { endRestoredRunWithoutSdkReply } from "./restore-checkpoint-approval"
import { restoreHeldWaitingApprovals } from "./restore-waiting-approvals"
import { RESTART_UNVERIFIABLE_DECISION, settleListedApprovals } from "./settle-run-approvals"
import { executeRestoredAllows, markResumeAndPump, reverifyRestoredDesktopAllows } from "./restore-waiting-continue"
import { resolveRuntimeId } from "./resolve-runtime-id"
import { foldMissingRunSecret, isMissingRunSecretError } from "./missing-run-secret"

export async function restoreWaitingRuns(window: BrowserWindow): Promise<void> {
  if (!claimRestoreWaitingOnce()) return
  try {
    await restoreWaitingRunsOnce(window)
  } finally {
    markRestoreWaitingSettled()
  }
}

async function restoreWaitingRunsOnce(window: BrowserWindow): Promise<void> {
  const db = getDatabase()
  // 只捡还在等审批的。completed / denied / cancelled 即使检查点残留也不得回挂。
  const waiting = listRuns(db, {}).filter((row) => row.status === "waiting_review")
  const prefs = readPreferences()
  for (const row of waiting) {
    const extras = parseWaitingExtras(row.checkpoint)
    if (getActiveRun(row.id)) continue
    if (shouldFailWaitingCatchUp(extras.automationSource, false)) {
      failCatchUpWaitingOnRestart(row.id)
      continue
    }
    const partitioned = partitionHmacRows(row.id, listApprovalsForRun(db, row.id))
    if (partitioned.hmacFailed.length > 0) {
      for (const item of partitioned.hmacFailed) {
        recordSdkApprovalResponse(item.id, {
          approved: false,
          reason: RESTART_UNVERIFIABLE_DECISION
        })
      }
      settleListedApprovals(
        partitioned.hmacFailed
          .filter((item) => item.decision == null)
          .map((item) => ({ runId: row.id, approvalId: item.id, toolCallId: item.toolCallId })),
        window,
        "restart",
        { writeSdkResponse: false }
      )
      abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
      continue
    }
    const checkpoint = parseGenerationCheckpoint(row.checkpoint)
    const decidable = partitioned.pending.filter((item) => parseStoredApprovalArgs(item) != null)
    const decidedReplayable = partitioned.decidedPassed.filter(canReplayOrContinueDecided)
    if (!row.workspaceId || !checkpoint?.request) {
      abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
      continue
    }
    if (decidable.length === 0 && decidedReplayable.length === 0) {
      abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
      continue
    }
    try {
      await restoreOneWaiting({
        row,
        extras,
        checkpoint,
        prefs,
        window,
        decidable,
        decidedReplayable
      })
    } catch (error) {
      abandonWaitingRestore(row.id, window, { sessionId: row.sessionId, cause: error })
    }
  }
}

async function restoreOneWaiting(input: {
  row: { id: string; sessionId: string; workspaceId: string | null; modelId: string | null }
  extras: ReturnType<typeof parseWaitingExtras>
  checkpoint: NonNullable<ReturnType<typeof parseGenerationCheckpoint>>
  prefs: ReturnType<typeof readPreferences>
  window: BrowserWindow
  decidable: ApprovalRow[]
  decidedReplayable: ApprovalRow[]
}): Promise<void> {
  const { row, extras, checkpoint, prefs, window, decidable, decidedReplayable } = input
  const { getWorkspace } = await import("./workspace")
  const workspace = await getWorkspace(row.workspaceId!)
  const parsed = RunAgentInput.parse({
    sessionId: row.sessionId,
    workspaceId: row.workspaceId,
    modelId: row.modelId ?? checkpoint.request.modelId,
    runtimeId: extras.runtimeId,
    denyAnyDesktop: extras.denyAnyDesktop,
    automationSource: extras.automationSource,
    origin: inferAgentRunOrigin(extras.origin, extras.automationSource),
    messages: (checkpoint.request.messages ?? []).map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content : ""
    }))
  })
  const runtimeId = resolveRuntimeId(
    { sessionId: row.sessionId, runtimeId: extras.runtimeId ?? parsed.runtimeId },
    prefs
  )
  const secret = await resolveRestoreSecret(runtimeId, prefs)
  const messages = Array.isArray(extras.modelMessages)
    ? (extras.modelMessages as ModelMessage[])
    : toModelMessages(parsed.messages)
  holdAgentRun({
    runId: row.id,
    window,
    input: parsed,
    workspaceRoot: workspace.rootPath,
    secret,
    messages
  })
  hydrateActiveRunUsage(row.id)
  const run = getActiveRun(row.id)
  if (!run) {
    abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
    return
  }
  run.pendingApprovals = extras.pendingApprovals?.length
    ? extras.pendingApprovals
    : [
        ...decidable.map((item) => ({
          approvalId: item.id,
          toolCallId: item.toolCallId,
          name: item.name
        })),
        ...decidedReplayable.map((item) => ({
          approvalId: item.id,
          toolCallId: item.toolCallId,
          name: item.name
        }))
      ]
  const restored = restoreHeldWaitingApprovals({
    runId: row.id,
    hmacPending: decidable,
    items: run.pendingApprovals,
    window
  })
  if (restored.ended) return
  run.pendingApprovals = restored.keep
  if (restored.keep.length > 0) return
  // 已决 HMAC 通过：文件/命令执行；desktop_act allow 先重拍，禁止直接 act。
  await executeRestoredAllows(row.id, restored.continueAllows)
  const desktop = await reverifyRestoredDesktopAllows(row.id, restored.desktopReverify, window)
  if (desktop === "abandoned" || desktop === "parked") return
  if (!markResumeAndPump(row.id)) {
    abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
  }
}

function partitionHmacRows(
  runId: string,
  rows: ApprovalRow[]
): { pending: ApprovalRow[]; hmacFailed: ApprovalRow[]; decidedPassed: ApprovalRow[] } {
  const pending: ApprovalRow[] = []
  const hmacFailed: ApprovalRow[] = []
  const decidedPassed: ApprovalRow[] = []
  for (const item of rows) {
    if (isSupersededSdkApprovalId(item.sdkApprovalId)) continue
    try {
      assertApprovalHmac({ runId, approvalId: item.id, toolCallId: item.toolCallId })
      if (item.decision == null) pending.push(item)
      else decidedPassed.push(item)
    } catch {
      hmacFailed.push(item)
    }
  }
  return { pending, hmacFailed, decidedPassed }
}

function canReplayOrContinueDecided(row: ApprovalRow): boolean {
  const plan = planSdkReplay(row, row.id, resolvedSdkApprovalId(row), row.decision ?? "deny")
  if (plan.action === "replay") return true
  return (
    (row.decision === "allow" || row.decision === "deny") &&
    plan.action === "fail_closed" &&
    plan.cause === "unsent"
  )
}

/** 回挂对不上：未决 cancelled（restart），run 记停止，发诚实收工码。 */
export function abandonWaitingRestore(
  runId: string,
  window: BrowserWindow,
  input?: { sessionId?: string; cause?: unknown }
): void {
  if (input?.cause) {
    console.error("[restore] abandon waiting restore", { runId, cause: input.cause })
    persistAbandonCause(runId, input.cause)
  }
  endRestoredRunWithoutSdkReply(getDatabase(), runId, window, input?.sessionId)
}

function persistAbandonCause(runId: string, cause: unknown): void {
  const db = getDatabase()
  if (getRun(db, runId)?.error) return
  const text = cause instanceof Error ? cause.message : String(cause ?? "").trim()
  if (!text) return
  updateRun(db, runId, { error: text.slice(0, 2000) })
}

export async function resolveRestoreSecret(
  runtimeId: string,
  prefs: ReturnType<typeof readPreferences>
) {
  try {
    const { resolveRunSecret } = await import("./agent-run-helpers")
    return await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId)
  } catch (error) {
    if (isMissingRunSecretError(error) || foldMissingRunSecret(error)) return undefined
    if (isTestModuleStripError(error)) return undefined
    throw error
  }
}

/** node:test strip-only 加载 ACP 客户端会炸；当缺密钥，生产不会走这条。 */
function isTestModuleStripError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : ""
  const text = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error)
  return (
    code === "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX" ||
    code === "ERR_MODULE_NOT_FOUND" ||
    text.includes("ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX") ||
    text.includes("TypeScript parameter property")
  )
}
