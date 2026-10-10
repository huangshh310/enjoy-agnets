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
import { getActiveRun, holdAgentRun } from "./agent-run-state"
import { claimRestoreWaitingOnce } from "./restore-once"
import { readPreferences } from "./preferences"
import { parseWaitingExtras } from "./persist-waiting-run"
import { toModelMessages } from "./to-model-messages"
import { assertApprovalHmac } from "./approval-hmac"
import { hydrateActiveRunUsage } from "./run-usage"
import { restoreHeldWaitingApprovals } from "./restore-waiting-approvals"

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
    if (!row.workspaceId) {
      updateRun(db, row.id, { status: "cancelled", error: "No pending approval after restart." })
      continue
    }
    const checkpoint = parseGenerationCheckpoint(row.checkpoint)
    if (!checkpoint?.request) {
      updateRun(db, row.id, { status: "cancelled", error: "Missing generation checkpoint." })
      continue
    }
    const checkpointPendings = extras.pendingApprovals ?? []
    if (pending.length === 0 && checkpointPendings.length === 0) {
      updateRun(db, row.id, { status: "cancelled", error: "No pending approval after restart." })
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
      const restored = restoreHeldWaitingApprovals({
        runId: row.id,
        hmacPending: pending,
        items: run.pendingApprovals,
        window
      })
      if (restored.ended) continue
      run.pendingApprovals = restored.keep
      if (restored.keep.length === 0) {
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

