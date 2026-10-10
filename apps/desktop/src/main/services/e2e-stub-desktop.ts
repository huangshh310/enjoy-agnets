/**
 * E2E 桌面铬夹具：只在 stub 流里吐 desktop_act 审批 / 硬拒结果，不改审批闸。
 * 每个 run 换新 approvalId / toolCallId，贴近真实 SDK；闸门不得依赖这点。
 * Allow once 要能真执行：审批入参必须先种进观察账本，否则 resume 会 stale_observation。
 */
import type { Observation } from "@enjoy-agents/agent-core/computer-use"
import { DESKTOP_ACT_BARE_COORDS_DISABLED } from "@enjoy-agents/ipc-contract/desktop-act-codes"

let stubDesktopSeq = 0

function nextStubIds(kind: string): { approvalId: string; toolCallId: string } {
  stubDesktopSeq += 1
  return { approvalId: `apr_${kind}_${stubDesktopSeq}`, toolCallId: `tool_${kind}_${stubDesktopSeq}` }
}

export function isE2eCuReady(): boolean {
  return process.env.ENJOY_E2E_STUB === "1" && process.env.ENJOY_E2E_CU_READY === "1"
}

/** 仅 stub：给补跑 Dock 挂上来源句，不改生产审批闸。 */
export function e2eAutomationSourceFromPrompt(prompt: string) {
  if (/desktop catchup terminal/i.test(prompt)) {
    return {
      automationId: "auto_term",
      automationName: "晨间类型检查",
      scheduledAt: Date.now() - 3_600_000,
      isCatchUp: true
    }
  }
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
    const ids = nextStubIds("cal")
    return [
      desktopApproval(ids, {
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
  if (/desktop catchup terminal/i.test(prompt)) {
    return [
      desktopApproval(nextStubIds("catchup_term"), {
        observationId: "obs_term_cu",
        action: "click",
        appName: "终端",
        appKey: "com.apple.Terminal",
        appKeySource: "bundleId",
        elementName: "提示符",
        sensitive: true
      })
    ]
  }
  if (/desktop catchup/i.test(prompt)) {
    return [
      desktopApproval(nextStubIds("catchup"), {
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
      desktopApproval(nextStubIds("term"), {
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
  ids: { approvalId: string; toolCallId: string },
  input: Record<string, unknown>
): Record<string, unknown> {
  return {
    type: "tool-approval-request",
    approvalId: ids.approvalId,
    toolCallId: ids.toolCallId,
    toolName: "desktop_act",
    input
  }
}

/** stub 审批入参对应的新鲜观察，供账本 put / 单测 take。 */
export function stubDesktopObservation(input: Record<string, unknown>): Observation {
  const id = String(input.observationId ?? "").trim() || "obs_stub"
  const appName = String(input.appName ?? "备忘录")
  const elementName = String(input.elementName ?? "今日")
  const appKey = typeof input.appKey === "string" ? input.appKey : undefined
  return {
    id,
    pid: 1,
    windowId: "win_stub",
    appName,
    appKey,
    bundleId: appKey,
    elements: [{ id: "el_stub", role: "AXButton", name: elementName, clickable: true }],
    createdAt: Date.now(),
    platform: process.platform
  }
}

export function applyStubDesktopObservation(
  put: (observation: Observation) => void,
  input: Record<string, unknown>
): Observation {
  const observation = stubDesktopObservation(input)
  put(observation)
  return observation
}

/** stub 且账本仍有该观察：允许一次直接成功，不打真实执行器。 */
export function stubFreshDesktopActResult(
  args: Record<string, unknown>,
  peek: (observationId: string) => unknown
): Record<string, unknown> | null {
  if (process.env.ENJOY_E2E_STUB !== "1") return null
  const id = typeof args.observationId === "string" ? args.observationId.trim() : ""
  if (!id || !peek(id)) return null
  return { success: true, observationId: id }
}
