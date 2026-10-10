/**
 * 首字前失败：要不要回滚、Inbox 算不算前台。
 */
import {
  isPreOutputFailureCode,
  type PreOutputFailureCode
} from "@enjoy-agents/ipc-contract/pre-output-failure"
import type { TurnAttention } from "@enjoy-agents/ipc-contract/turn-outcome"
import { getFocusedSessionId } from "./session-focus"

export type RunBackgroundKind = "automation" | "heartbeat" | "workflow" | "catch-up"

export function backgroundKindOf(input: {
  automationSource?: { isCatchUp?: boolean } | null
  heartbeat?: boolean
  rememberMru?: boolean
}): RunBackgroundKind | undefined {
  if (input.automationSource?.isCatchUp) return "catch-up"
  if (input.automationSource) return "automation"
  if (input.heartbeat) return "heartbeat"
  if (input.rememberMru === false) return "workflow"
  return undefined
}

export function isForegroundPreOutputFailure(
  run: { input: { sessionId: string }; backgroundKind?: RunBackgroundKind },
  focusedId = getFocusedSessionId()
): boolean {
  if (run.backgroundKind) return false
  return focusedId === run.input.sessionId
}

export function preOutputAttention(foreground: boolean): TurnAttention {
  return foreground ? "neutral" : "error"
}

export function shouldRollbackPreOutput(input: {
  producedOutput: boolean
  code?: string
}): input is { producedOutput: false; code: PreOutputFailureCode } {
  return !input.producedOutput && isPreOutputFailureCode(input.code)
}
