/**
 * 已决 HMAC 通过：文件/命令续泵；desktop_act allow 先重拍，禁止直接 act。
 */
import type { BrowserWindow } from "electron"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { getApproval } from "@enjoy-agents/db"
import { getActiveRun } from "./agent-run-state"
import { recordSdkApprovalResponse } from "./approval-hmac"
import { getDatabase } from "./database"
import { resolveInsideWorkspace } from "./paths"
import { parseStoredApprovalArgs } from "./restore-approval-args"
import { endRestoredRunWithoutSdkReply } from "./restore-checkpoint-approval"
import { RESTART_UNVERIFIABLE_DECISION } from "./settle-run-approvals"

type RestoredAllow = {
  approvalId: string
  toolCallId: string
  name: string
  args?: unknown
}

export type DesktopRestoreVerdict = "second_confirm" | "unavailable" | "unchanged"

type DesktopRestoreOverride = (item: RestoredAllow) => Promise<DesktopRestoreVerdict>

let desktopRestoreOverride: DesktopRestoreOverride | undefined

/** 仅测试：覆盖 desktop_act 重启重拍，避免拉真执行器 / ACP。 */
export function overrideRestoreDesktopActAllowForTest(fn: DesktopRestoreOverride | null): void {
  desktopRestoreOverride = fn ?? undefined
}

export function markResumeAndPump(runId: string): boolean {
  const run = getActiveRun(runId)
  if (!run) return false
  run.resumeAfterPump = true
  void import("./agent-pump")
    .then(({ pumpStream }) => pumpStream(runId))
    .catch((error) => {
      console.error("[restore] resumeAfterPump failed", { runId, error })
    })
  return true
}

export async function executeRestoredAllows(runId: string, items: RestoredAllow[]): Promise<void> {
  const run = getActiveRun(runId)
  if (!run || items.length === 0) return
  for (const pending of items) {
    if (pending.name === "desktop_act") continue
    const args = storedAllowArgs(pending)
    if (pending.name === "write_file" && typeof args.path === "string" && typeof args.content === "string") {
      await writeRestoredFile(run.workspaceRoot, args.path, args.content)
      continue
    }
    try {
      const { executeStoredTool } = await import("./execute-stored-tool")
      const { runWithActiveRunId } = await import("./active-run-id")
      await runWithActiveRunId(runId, () => executeStoredTool(run, { ...pending, args }))
    } catch (error) {
      if (isTestModuleStripError(error)) {
        console.error("[restore] skip stored tool in strip-only test", { name: pending.name })
        continue
      }
      throw error
    }
  }
}

async function writeRestoredFile(root: string, relativePath: string, content: string): Promise<void> {
  const absolute = resolveInsideWorkspace(root, relativePath)
  await mkdir(dirname(absolute), { recursive: true })
  await writeFile(absolute, content, "utf8")
}

function isTestModuleStripError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : ""
  const text = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error)
  return (
    code === "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX" ||
    text.includes("ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX") ||
    text.includes("TypeScript parameter property")
  )
}

function storedAllowArgs(pending: RestoredAllow): Record<string, unknown> {
  const direct = asArgs(pending.args)
  if (typeof direct.path === "string" || typeof direct.content === "string") return direct
  const row = getApproval(getDatabase(), pending.approvalId)
  return asArgs(row ? parseStoredApprovalArgs(row) : undefined)
}

/**
 * desktop_act 已决 allow：禁止直接执行。能重拍则二次确认卡；不能则 fail closed。
 */
export async function reverifyRestoredDesktopAllows(
  runId: string,
  items: RestoredAllow[],
  window: BrowserWindow
): Promise<"parked" | "abandoned" | "none"> {
  const run = getActiveRun(runId)
  if (!run || items.length === 0) return "none"
  for (const item of items) {
    const verdict = desktopRestoreOverride
      ? await desktopRestoreOverride(item)
      : await defaultDesktopRestoreVerdict()
    if (verdict === "unavailable") {
      recordSdkApprovalResponse(item.approvalId, {
        approved: false,
        reason: RESTART_UNVERIFIABLE_DECISION,
        resumeCode: "executor_missing"
      })
      endRestoredRunWithoutSdkReply(getDatabase(), runId, window, run.input.sessionId)
      return "abandoned"
    }
    if (verdict === "second_confirm") {
      const { reparkDesktopSecondConfirm } = await import("./repark-desktop-second-confirm")
      const parked = await reparkDesktopSecondConfirm({
        run,
        runId,
        window,
        pending: { approvalId: item.approvalId, toolCallId: item.toolCallId, name: "desktop_act", args: item.args },
        result: { success: false, code: "needs_second_confirm" }
      })
      if (!parked) {
        endRestoredRunWithoutSdkReply(getDatabase(), runId, window, run.input.sessionId)
        return "abandoned"
      }
      return "parked"
    }
  }
  return "none"
}

async function defaultDesktopRestoreVerdict(): Promise<DesktopRestoreVerdict> {
  return "second_confirm"
}

function asArgs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
