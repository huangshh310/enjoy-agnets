/**
 * 从最近助手轮抽出引用与工具，供检查器使用。
 */
import type { CitedSource, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  isStaleObservationAfterAllow,
  isToolNotExecuted,
  readApprovalDecision
} from "@enjoy-agents/ipc-contract/approval-not-executed"
import {
  RESTART_ABANDONED_CODE,
  toolAbortKind,
  toolHasResultCode
} from "@enjoy-agents/ipc-contract/desktop-notify"

export type SliceMessage = {
  role: string
  sources?: CitedSource[]
  tools?: ThreadToolCall[]
}

export function citedSourcesFromMessages(messages: SliceMessage[], limit = 5): CitedSource[] {
  return messages
    .slice(-4)
    .flatMap((message) => (message.role === "assistant" ? (message.sources ?? []) : []))
    .slice(0, limit)
}

export function toolsFromMessages(messages: SliceMessage[], limit = 8): ThreadToolCall[] {
  const last = [...messages].reverse().find((message) => message.role === "assistant")
  return (last?.tools ?? []).slice(-limit)
}

export function toolRunKind(
  state: ThreadToolCall["state"],
  tool?: Pick<ThreadToolCall, "state" | "result" | "errorText">
): "running" | "ok" | "error" | "denied" | "skipped" | "stopped" | "catch_up" | "restart" {
  if (isStaleObservationAfterAllow(tool ?? { state })) return "skipped"
  if (state === "output-available") return "ok"
  if (toolHasResultCode(tool, RESTART_ABANDONED_CODE)) return "restart"
  const abort = toolAbortKind(tool)
  if (abort === "stopped") return "stopped"
  if (abort === "error") return "error"
  if (abort === "neutral") return "catch_up"
  if (readApprovalDecision(tool?.result) === "cancelled") return "skipped"
  if (isToolNotExecuted(tool ?? { state })) return "denied"
  if (state === "output-error") return "error"
  if (state === "output-denied") return "denied"
  return "running"
}
