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
import {
  auditUnsentIfNeeded,
  endRestoredRunWithoutSdkReply
} from "./restore-checkpoint-approval"
import { restoreHeldWaitingApprovals } from "./restore-waiting-approvals"
import { RESTART_UNVERIFIABLE_DECISION, settleListedApprovals } from "./settle-run-approvals"
import { markResumeAndPump } from "./restore-waiting-continue"
import { resolveRuntimeId } from "./resolve-runtime-id"
import { foldMissingRunSecret, isMissingRunSecretError } from "./missing-run-secret"
import { readLatestAssistantSnapshot } from "./restore-assistant-snapshot"

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
    const checkpointPendingIds = new Set(
      (extras.pendingApprovals ?? []).map((item) => item.approvalId)
    )
    const unverifiableDecided = partitioned.decidedPassed.filter((item) =>
      isUnverifiableCheckpointPending(item, checkpointPendingIds)
    )
    if (partitioned.hmacFailed.length > 0 || unverifiableDecided.length > 0) {
      // HMAC 失败：已决行的审计不盖。unsent：只补 restart_unverifiable_decision。
      for (const item of partitioned.hmacFailed) {
        if (item.decision != null) continue
        recordSdkApprovalResponse(item.id, {
          approved: false,
          reason: RESTART_UNVERIFIABLE_DECISION
        })
      }
      for (const item of unverifiableDecided) auditUnsentIfNeeded(item.id)
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
    const decidedReplayable = partitioned.decidedPassed.filter(canReplayDecided)
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
  // 自动化 / 补跑 / 用户同一套：回挂不上就 fail closed，禁止留下 waiting_review 死卡。
  sweepUnrestoredWaiting(window)
}

async function restoreOneWaiting(input: {
  row: { id: string; sessionId: string; workspaceId: string | null; modelId: string | null; createdAt: number }
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
    messages,
    ...readLatestAssistantSnapshot(row.sessionId, { runCreatedAt: row.createdAt })
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

function canReplayDecided(row: ApprovalRow): boolean {
  return planSdkReplay(row, row.id, resolvedSdkApprovalId(row), row.decision ?? "deny").action === "replay"
}

/** 只审检查点里仍等 SDK 的未决；历史已回 SDK 的 desktop_act allow 不得毒死整轮。 */
function isUnverifiableCheckpointPending(row: ApprovalRow, checkpointPendingIds: Set<string>): boolean {
  if (!checkpointPendingIds.has(row.id)) return false
  if (row.sdkApproved != null) return false
  return !canReplayDecided(row)
}

/** 扫完仍是 waiting_review 且没挂上 ActiveRun：一律结清，Inbox 不得留死角标。 */
function sweepUnrestoredWaiting(window: BrowserWindow): void {
  const db = getDatabase()
  for (const row of listRuns(db, {}).filter((item) => item.status === "waiting_review")) {
    if (getActiveRun(row.id)) continue
    abandonWaitingRestore(row.id, window, { sessionId: row.sessionId })
  }
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
  endRestoredRunWithoutSdkReply(runId, window, input?.sessionId)
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
