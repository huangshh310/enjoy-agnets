/**
 * 心跳滴答：忙则吃掉这一拍。开跑失败不记这一拍，下次到点再试。
 */
import type { BrowserWindow } from "electron"
import { isAcpHostRuntime } from "@enjoy-agents/agent-harness"
import type { SessionHeartbeat } from "@enjoy-agents/ipc-contract"
import { listActiveRuns } from "./agent-run-state"
import { resolveSessionBinding } from "./agent-run-helpers"
import { applyAutomationHostMode, resolveAutomationMode } from "./automations-mode"
import { getDatabase } from "./database"
import { createId } from "./ids"
import { readPreferences } from "./preferences"
import { runHeartbeatAgent } from "./agent-run-start"
import { heartbeatMessages } from "./session-heartbeat-history"
import { planHeartbeatTick } from "./session-heartbeat-plan"
import { disableHeartbeat, listEnabledHeartbeats, stampHeartbeat } from "./session-heartbeat-store"

export async function tickSessionHeartbeats(window: BrowserWindow, now = new Date()): Promise<void> {
  for (const beat of listEnabledHeartbeats()) {
    await tickOneHeartbeat(window, beat, now)
  }
}

async function tickOneHeartbeat(window: BrowserWindow, beat: SessionHeartbeat, now: Date): Promise<void> {
  const plan = planHeartbeatTick({
    enabled: beat.enabled,
    cronExpr: beat.cronExpr,
    timeZone: beat.timeZone,
    lastRunAt: beat.lastRunAt,
    runCount: beat.runCount,
    maxRuns: beat.maxRuns,
    blocked: sessionHeartbeatBlocked(beat.sessionId),
    now
  })
  if (plan === "retire") {
    disableHeartbeat(beat.id)
    return
  }
  if (plan === "skip") {
    stampHeartbeat(beat.id, now.getTime())
    return
  }
  if (plan !== "fire") return
  await launchHeartbeat(window, beat, now).catch(() => undefined)
}

/** 有活轮或待审批就不发，避免叠进排队。 */
export function sessionHeartbeatBlocked(sessionId: string): boolean {
  if (listActiveRuns().some((item) => item.run.input.sessionId === sessionId)) return true
  const row = getDatabase()
    .prepare(
      "SELECT 1 as hit FROM runs WHERE session_id = ? AND status IN ('running', 'waiting_review') LIMIT 1"
    )
    .get(sessionId)
  return Boolean(row)
}

async function launchHeartbeat(window: BrowserWindow, beat: SessionHeartbeat, now: Date): Promise<void> {
  const workspaceId = workspaceForHeartbeat(beat.sessionId)
  if (!workspaceId) return
  const prefs = readPreferences()
  const bound = resolveSessionBinding(beat.sessionId, prefs)
  const mode = resolveAutomationMode(prefs.defaultMode === "plan" || prefs.defaultMode === "ask" ? prefs.defaultMode : "agent")
  const prompt = applyAutomationHostMode(isAcpHostRuntime(bound.runtimeId), mode, beat.prompt)
  const messages = await heartbeatMessages(beat.sessionId, prompt)
  await runHeartbeatAgent(window, {
    sessionId: beat.sessionId,
    workspaceId,
    runtimeId: bound.runtimeId,
    modelId: bound.modelId || "",
    mode,
    persistUser: true,
    commandId: createId("hb"),
    messages
  })
  const runCount = beat.runCount + 1
  stampHeartbeat(beat.id, now.getTime(), runCount)
  if (beat.maxRuns != null && runCount >= beat.maxRuns) disableHeartbeat(beat.id)
}

/** 会话不在或已归档时不发、也不停用，下一拍再看。 */
function workspaceForHeartbeat(sessionId: string): string | null {
  const row = getDatabase()
    .prepare(
      "SELECT workspace_id as workspaceId, archived_at as archivedAt FROM sessions WHERE id = ?"
    )
    .get(sessionId) as { workspaceId?: string; archivedAt?: number | null } | undefined
  if (!row?.workspaceId || row.archivedAt) return null
  return row.workspaceId
}
