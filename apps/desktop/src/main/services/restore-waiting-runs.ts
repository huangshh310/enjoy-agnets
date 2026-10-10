/**
 * 启动后把 waiting_review 的审批重新挂到 ActiveRun，并发 approval.required。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { parseGenerationCheckpoint } from "@enjoy-agents/agent-core"
import { listPendingApprovals, listRuns, setApprovalDecision, updateRun } from "@enjoy-agents/db"
import { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { shouldFailWaitingCatchUp } from "./automations-catchup-orphans"
import { failCatchUpWaitingOnRestart } from "./fail-catchup-waiting-restart"
import { getDatabase } from "./database"
import { emitEvent, getActiveRun, holdAgentRun } from "./agent-run-state"
import { claimRestoreWaitingOnce } from "./restore-once"
import { readPreferences } from "./preferences"
import { parseWaitingExtras } from "./persist-waiting-run"
import { toModelMessages } from "./to-model-messages"
import { assertApprovalHmac, recordSdkApprovalResponse } from "./approval-hmac"
import { hydrateActiveRunUsage } from "./run-usage"
import { parseStoredApprovalArgs } from "./restore-approval-args"
import { APPROVAL_ARGS_MISSING, APPROVAL_ARGS_MISSING_MESSAGE } from "./resolve-approval-args"
import { approvalResponseMessage } from "./approval-response-message"
import { resolvedSdkApprovalId } from "@enjoy-agents/db"

export async function restoreWaitingRuns(window: BrowserWindow): Promise<void> {
  if (!claimRestoreWaitingOnce()) return
  const db = getDatabase()
  const waiting = listRuns(db, {}).filter((row) => row.status === "waiting_review")
  const prefs = readPreferences()
  for (const row of waiting) {
    const extras = parseWaitingExtras(row.checkpoint)
    if (getActiveRun(row.id)) continue
    if (shouldFailWaitingCatchUp(extras.automationSource, false)) {
      failCatchUpWaitingOnRestart(row.id)
      continue
    }
    const pending = listPendingApprovals(db, row.id).filter((item) => {
      try {
        assertApprovalHmac({ runId: row.id, approvalId: item.id, toolCallId: item.toolCallId })
        return true
      } catch {
        return false
      }
    })
    if (pending.length === 0 || !row.workspaceId) {
      updateRun(db, row.id, { status: "cancelled", error: "No pending approval after restart." })
      continue
    }
    const checkpoint = parseGenerationCheckpoint(row.checkpoint)
    if (!checkpoint?.request) {
      updateRun(db, row.id, { status: "cancelled", error: "Missing generation checkpoint." })
      continue
    }
    try {
      const { getWorkspace } = await import("./workspace")
      const workspace = await getWorkspace(row.workspaceId)
      const input = RunAgentInput.parse({
        sessionId: row.sessionId,
        workspaceId: row.workspaceId,
        modelId: row.modelId ?? checkpoint.request.modelId,
        runtimeId: extras.runtimeId,
        denyAnyDesktop: extras.denyAnyDesktop,
        automationSource: extras.automationSource,
        messages: (checkpoint.request.messages ?? []).map((message) => ({
          role: message.role,
          content: typeof message.content === "string" ? message.content : ""
        }))
      })
      const { resolveRunSecret, resolveRuntimeId } = await import("./agent-run-helpers")
      const runtimeId = resolveRuntimeId(input, prefs)
      const secret = await resolveRunSecret(runtimeId, prefs.codingRuntime, prefs.harnessId)
      const messages = Array.isArray(extras.modelMessages)
        ? (extras.modelMessages as ModelMessage[])
        : toModelMessages(input.messages)
      holdAgentRun({
        runId: row.id,
        window,
        input,
        workspaceRoot: workspace.rootPath,
        secret,
        messages
      })
      hydrateActiveRunUsage(row.id)
      const run = getActiveRun(row.id)
      if (!run) continue
      run.pendingApprovals = extras.pendingApprovals?.length
        ? extras.pendingApprovals
        : pending.map((item) => ({
            approvalId: item.id,
            toolCallId: item.toolCallId,
            name: item.name
          }))
      const keep: typeof run.pendingApprovals = []
      for (const item of run.pendingApprovals) {
        const rowArgs = pending.find((approval) => approval.id === item.approvalId)
        const args = parseStoredApprovalArgs(rowArgs)
        if (args == null) {
          if (rowArgs) {
            setApprovalDecision(db, rowArgs.id, "deny")
            recordSdkApprovalResponse(rowArgs.id, {
              approved: false,
              reason: APPROVAL_ARGS_MISSING_MESSAGE,
              resumeCode: APPROVAL_ARGS_MISSING
            })
            run.messages.push(
              approvalResponseMessage({
                approvalId: resolvedSdkApprovalId(rowArgs),
                approved: false,
                reason: APPROVAL_ARGS_MISSING_MESSAGE
              })
            )
            emitEvent(window, {
              type: "tool.result",
              runId: row.id,
              toolCallId: item.toolCallId,
              name: item.name,
              result: { code: APPROVAL_ARGS_MISSING },
              error: APPROVAL_ARGS_MISSING_MESSAGE
            })
          }
          continue
        }
        keep.push({ ...item, args })
        emitEvent(window, {
          type: "approval.required",
          runId: row.id,
          approvalId: item.approvalId,
          toolCallId: item.toolCallId,
          name: item.name,
          args
        })
      }
      run.pendingApprovals = keep
      if (keep.length === 0) {
        run.resumeAfterPump = true
        if (!run.pumping) {
          const { pumpStream } = await import("./agent-pump.ts")
          void pumpStream(row.id)
        }
      }
    } catch (error) {
      updateRun(db, row.id, {
        status: "cancelled",
        error: error instanceof Error ? error.message : "Failed to restore waiting run."
      })
    }
  }
}

