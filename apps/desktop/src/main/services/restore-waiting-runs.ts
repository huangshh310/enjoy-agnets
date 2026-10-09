/**
 * 启动后把 waiting_review 的审批重新挂到 ActiveRun，并发 approval.required。
 */
import type { BrowserWindow } from "electron"
import type { ModelMessage } from "ai"
import { parseGenerationCheckpoint } from "@enjoy-agents/agent-core"
import { listPendingApprovals, listRuns, updateRun } from "@enjoy-agents/db"
import { RunAgentInput } from "@enjoy-agents/ipc-contract"
import { shouldFailWaitingCatchUp } from "./automations-catchup-orphans"
import { failCatchUpWaitingOnRestart } from "./fail-catchup-waiting-restart"
import { getDatabase } from "./database"
import { emitEvent, getActiveRun, holdAgentRun } from "./agent-run-state"
import { claimRestoreWaitingOnce } from "./restore-once"
import { resolveRunSecret, resolveRuntimeId } from "./agent-run-helpers"
import { readPreferences } from "./preferences"
import { parseWaitingExtras } from "./persist-waiting-run"
import { getWorkspace } from "./workspace"
import { toModelMessages } from "./to-model-messages"
import { assertApprovalHmac } from "./approval-hmac"

export async function restoreWaitingRuns(window: BrowserWindow): Promise<void> {
  if (!claimRestoreWaitingOnce()) return
  const db = getDatabase()
  const waiting = listRuns(db, {}).filter((row) => row.status === "waiting_review")
  const prefs = readPreferences()
  for (const row of waiting) {
    const extras = parseWaitingExtras(row.checkpoint)
    if (shouldFailWaitingCatchUp(extras.automationSource, Boolean(getActiveRun(row.id)))) {
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
      const run = getActiveRun(row.id)
      if (!run) continue
      run.pendingApprovals = extras.pendingApprovals?.length
        ? extras.pendingApprovals
        : pending.map((item) => ({
            approvalId: item.id,
            toolCallId: item.toolCallId,
            name: item.name
          }))
      for (const item of run.pendingApprovals) {
        const rowArgs = pending.find((approval) => approval.id === item.approvalId)
        let args: unknown = {}
        try {
          args = rowArgs ? JSON.parse(rowArgs.args) : {}
        } catch {
          args = {}
        }
        emitEvent(window, {
          type: "approval.required",
          runId: row.id,
          approvalId: item.approvalId,
          toolCallId: item.toolCallId,
          name: item.name,
          args
        })
      }
    } catch (error) {
      updateRun(db, row.id, {
        status: "cancelled",
        error: error instanceof Error ? error.message : "Failed to restore waiting run."
      })
    }
  }
}

