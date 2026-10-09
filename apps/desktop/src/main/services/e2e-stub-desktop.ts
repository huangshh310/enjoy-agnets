/**
 * E2E 桌面铬夹具：只在 stub 流里吐 desktop_act 审批 / 硬拒结果，不改审批闸。
 */
import { DESKTOP_ACT_BARE_COORDS_DISABLED } from "@enjoy-agents/ipc-contract/desktop-act-codes"

export function isE2eCuReady(): boolean {
  return process.env.ENJOY_E2E_STUB === "1" && process.env.ENJOY_E2E_CU_READY === "1"
}

/** 仅 stub：给补跑 Dock 挂上来源句，不改生产审批闸。 */
export function e2eAutomationSourceFromPrompt(prompt: string) {
  if (!/desktop catchup/i.test(prompt)) return undefined
  return {
    automationId: "auto_sleep",
    automationName: "晨间待办整理",
    scheduledAt: Date.now() - 3_600_000,
    isCatchUp: true
  }
}

export function stubDesktopStreamParts(prompt: string): Record<string, unknown>[] | null {
  if (/desktop calendar/i.test(prompt)) {
    return [
      desktopApproval("apr_cal", "tool_cal", {
        observationId: "obs_cal",
        action: "click",
        appName: "日历",
        appKey: "com.apple.iCal",
        appKeySource: "bundleId",
        elementName: "今天",
        sensitive: false
      })
    ]
  }
  if (/desktop catchup/i.test(prompt)) {
    return [
      desktopApproval("apr_catchup", "tool_catchup", {
        observationId: "obs_notes",
        action: "click",
        appName: "备忘录",
        appKey: "com.apple.notes",
        appKeySource: "bundleId",
        elementName: "今日",
        sensitive: false
      })
    ]
  }
  if (/desktop terminal/i.test(prompt)) {
    return [
      desktopApproval("apr_term", "tool_term", {
        observationId: "obs_term",
        action: "click",
        appName: "终端",
        appKey: "com.apple.Terminal",
        appKeySource: "bundleId",
        elementName: "提示符",
        sensitive: true
      })
    ]
  }
  if (/desktop coords/i.test(prompt)) {
    return [
      {
        type: "tool-call",
        toolCallId: "tool_xy",
        toolName: "desktop_act",
        input: { action: "click", x: 12, y: 34, observationId: "obs_xy" }
      },
      {
        type: "tool-output-denied",
        toolCallId: "tool_xy",
        toolName: "desktop_act",
        input: { action: "click", x: 12, y: 34, observationId: "obs_xy" },
        output: {
          type: "denied",
          code: DESKTOP_ACT_BARE_COORDS_DISABLED,
          reason: "Bare pixel coordinates are disabled. Capture desktop_snapshot and act with elementId."
        }
      }
    ]
  }
  return null
}

function desktopApproval(
  approvalId: string,
  toolCallId: string,
  input: Record<string, unknown>
): Record<string, unknown> {
  return {
    type: "tool-approval-request",
    approvalId,
    toolCallId,
    toolName: "desktop_act",
    input
  }
}
