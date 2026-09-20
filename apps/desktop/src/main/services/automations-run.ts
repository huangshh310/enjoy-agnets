/**
 * 执行自动化：新建或复用会话，再走同一条 Agent 循环（含 P0-S 注入）。
 * 失败只发 run.error，进 Inbox「失败」，不标 needs_review。
 */
import type { BrowserWindow } from "electron"
import type { Automation, RunAutomationInput } from "@enjoy-agents/ipc-contract"
import { listActiveRuns, waitForRunSettle } from "./agent-run-state"
import {
  isAutomationRunning,
  markAutomationIdle,
  markAutomationRunning,
  patchStoredAutomation,
  readAutomations
} from "./automations-store"
import { emitAutomationsChanged } from "./automations-notify"
import {
  openAutomationSession,
  resolveAutomationWorkspaceId,
  startAutomationRun
} from "./automations-launch"
import { scheduleOnSaveFire, cancelOnSaveFire } from "./automations-onsave"
import { createId } from "./ids"
import { stampAndSend } from "./event-bus"

export { cancelOnSaveFire }

export async function runAutomation(window: BrowserWindow, input: RunAutomationInput) {
  const item = readAutomations().find((row) => row.id === input.id)
  if (!item) throw new Error("Automation not found.")
  if (!item.enabled) throw new Error("Automation is disabled.")
  return launchAutomationAgent(window, item, input.sessionId, input.workspaceId)
}

/** 工作区任意保存后防抖开一轮。无 session 则新建会话。关应用取消未发的点。 */
export function fireOnSaveAutomations(
  window: BrowserWindow | undefined,
  workspaceId: string,
  sessionId?: string,
  debounceMs?: number
): void {
  scheduleOnSaveFire(() => runOnSaveJobs(window, workspaceId, sessionId), debounceMs)
}

async function runOnSaveJobs(
  window: BrowserWindow | undefined,
  workspaceId: string,
  sessionId?: string
): Promise<void> {
  if (!window || window.isDestroyed()) return
  if (
    sessionId &&
    listActiveRuns().some((item) => item.run.input.sessionId === sessionId)
  ) {
    return
  }
  const jobs = readAutomations().filter(
    (item) => item.enabled && (item.trigger === "on_save" || Boolean(item.triggers?.includes("on_save")))
  )
  for (const item of jobs) {
    await launchAutomationAgent(window, item, sessionId, workspaceId).catch(() => {
      // 失败已 stamp run.error；其余保存后规则继续。
    })
  }
}

export async function launchAutomationAgent(
  window: BrowserWindow,
  item: Automation,
  sessionId?: string,
  workspaceId?: string
) {
  if (isAutomationRunning(item.id)) {
    return { id: item.id, sessionId: item.lastSessionId ?? "", workspaceId: workspaceId ?? "" }
  }
  let openedSessionId = sessionId ?? ""
  let openedWorkspaceId = workspaceId ?? ""
  markAutomationRunning(item.id)
  emitAutomationsChanged("run", item.id)
  try {
    openedWorkspaceId = await resolveAutomationWorkspaceId(workspaceId)
    const opened = await openAutomationSession(item, openedWorkspaceId, sessionId)
    openedSessionId = opened.sessionId
    openedWorkspaceId = opened.workspaceId
    patchStoredAutomation(item.id, {
      lastRunAt: Date.now(),
      lastSessionId: openedSessionId,
      lastError: undefined
    })
    emitAutomationsChanged("status", item.id)
    const started = await startAutomationRun(window, item, openedSessionId, openedWorkspaceId)
    const settled = await waitForRunSettle(started.runId)
    finishAutomationRun(item.id, settled.status === "end" ? "ok" : "failed", settled.summary)
    return {
      id: item.id,
      sessionId: openedSessionId,
      workspaceId: openedWorkspaceId,
      runId: started.runId
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (openedSessionId) {
      stampAndSend(window, { type: "run.error", runId: createId("run"), message }, openedSessionId)
    }
    finishAutomationRun(item.id, "failed", message)
    throw error
  } finally {
    markAutomationIdle(item.id)
    emitAutomationsChanged("status", item.id)
  }
}

function finishAutomationRun(id: string, status: "ok" | "failed", summary: string): void {
  const current = readAutomations().find((row) => row.id === id)
  const fails = status === "failed" ? (current?.consecutiveFails ?? 0) + 1 : 0
  patchStoredAutomation(id, {
    lastRunStatus: status,
    lastError: status === "failed" ? summary || "Automation failed." : undefined,
    consecutiveFails: fails
  })
}
