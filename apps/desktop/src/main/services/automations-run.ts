/**
 * 执行自动化：新建或复用会话，再走同一条 Agent 循环（含 P0-S 注入）。
 * 失败只发 run.error，进 Inbox「失败」，不标 needs_review。
 */
import type { BrowserWindow } from "electron"
import type { Automation, RunAutomationInput } from "@enjoy-agents/ipc-contract"
import { requireAgentRunId } from "@enjoy-agents/ipc-contract/chat-readiness"
import { scheduledAutomationCommandId } from "./automations-cron-points"
import { claimLaunchSlot } from "./automations-claim-slot"
import { reclassifyBlockedCatchUp } from "./automations-reclassify-catchup"
import { skippedRunPatch } from "./automations-fails"
import { finishAutomationRun } from "./automations-finish"
import { defaultSettingsIo, patchMissedPoint } from "./automations-missed-store"
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

export type LaunchAutomationOpts = {
  sessionId?: string
  workspaceId?: string
  scheduledAt?: number
  isCatchUp?: boolean
}

export async function launchAutomationAgent(
  window: BrowserWindow,
  item: Automation,
  sessionIdOrOpts?: string | LaunchAutomationOpts,
  workspaceId?: string
) {
  const opts = launchOpts(sessionIdOrOpts, workspaceId)
  if (isAutomationRunning(item.id)) {
    if (opts.isCatchUp && opts.scheduledAt != null) {
      const io = defaultSettingsIo()
      if (reclassifyBlockedCatchUp(io, item.id, opts.scheduledAt)) {
        patchStoredAutomation(item.id, {
          ...skippedRunPatch(item),
          lastSkipReason: "previous_still_running",
          lastRunAt: opts.scheduledAt
        })
      }
    }
    return { id: item.id, sessionId: item.lastSessionId ?? "", workspaceId: opts.workspaceId ?? "" }
  }
  if (!claimLaunchSlot(defaultSettingsIo(), item.id, opts)) {
    return { id: item.id, sessionId: item.lastSessionId ?? "", workspaceId: opts.workspaceId ?? "" }
  }
  let openedSessionId = opts.sessionId ?? ""
  markAutomationRunning(item.id)
  emitAutomationsChanged("run", item.id)
  try {
    const opened = await openLaunchedSession(item, opts)
    openedSessionId = opened.sessionId
    const started = await startLaunchedRun(window, item, opened, opts)
    const settled = await waitForRunSettle(started.runId)
    finishAutomationRun(item.id, settled.status === "end" ? "ok" : "failed", settled.summary, opts)
    return { id: item.id, ...opened, runId: started.runId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (openedSessionId) {
      stampAndSend(
        window,
        {
          type: "run.error",
          runId: createId("run"),
          message,
          turn: { workflow: "in_progress", attention: "error" }
        },
        openedSessionId
      )
    }
    finishAutomationRun(item.id, "failed", message, opts)
    throw error
  } finally {
    markAutomationIdle(item.id)
    emitAutomationsChanged("status", item.id)
  }
}

async function openLaunchedSession(item: Automation, opts: LaunchAutomationOpts) {
  const workspaceId = await resolveAutomationWorkspaceId(opts.workspaceId)
  const opened = await openAutomationSession(item, workspaceId, opts.sessionId)
  patchStoredAutomation(item.id, {
    lastRunAt: Date.now(),
    lastSessionId: opened.sessionId,
    lastError: undefined,
    lastRunErrorCode: undefined,
    lastRunCatchUp: opts.isCatchUp === true
  })
  emitAutomationsChanged("status", item.id)
  return opened
}

async function startLaunchedRun(
  window: BrowserWindow,
  item: Automation,
  opened: { sessionId: string; workspaceId: string },
  opts: LaunchAutomationOpts
) {
  const started = await startAutomationRun(window, item, opened.sessionId, opened.workspaceId, {
    commandId:
      opts.scheduledAt != null ? scheduledAutomationCommandId(item.id, opts.scheduledAt) : undefined,
    denyAnyDesktop: opts.isCatchUp === true,
    automationSource:
      opts.scheduledAt != null
        ? {
            automationId: item.id,
            automationName: item.name,
            scheduledAt: opts.scheduledAt,
            isCatchUp: opts.isCatchUp === true
          }
        : undefined
  })
  const runId = requireAgentRunId(started)
  if (opts.scheduledAt != null) {
    patchMissedPoint(defaultSettingsIo(), item.id, opts.scheduledAt, { runId })
  }
  return { runId }
}

function launchOpts(sessionIdOrOpts?: string | LaunchAutomationOpts, workspaceId?: string): LaunchAutomationOpts {
  if (sessionIdOrOpts && typeof sessionIdOrOpts === "object") return sessionIdOrOpts
  return { sessionId: sessionIdOrOpts, workspaceId }
}

