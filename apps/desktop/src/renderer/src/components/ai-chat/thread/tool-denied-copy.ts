/**
 * 未执行：拒绝 / fail closed / 参数不一致 / 观察过期。文案跟库里的码+决策走。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  APPROVAL_ARGS_MISMATCH,
  APPROVAL_ARGS_MISMATCH_COPY,
  isStaleObservationAfterAllow,
  isToolNotExecuted,
  readApprovalNotExecutedCode
} from "@enjoy-agents/ipc-contract/approval-not-executed"
import { toolAbortKind } from "@enjoy-agents/ipc-contract/desktop-notify"

type Translate = (key: string) => string

export function isDeniedTool(
  tool: Pick<ThreadToolCall, "state" | "result" | "errorText"> | undefined
): boolean {
  return isToolNotExecuted(tool) && !isStaleObservationAfterAllow(tool) && toolAbortKind(tool) !== "neutral"
}

export function isSkippedTool(
  tool: Pick<ThreadToolCall, "state" | "result" | "errorText"> | undefined
): boolean {
  return isStaleObservationAfterAllow(tool)
}

export function toolDeniedCopy(
  t: Translate,
  tool?: Pick<ThreadToolCall, "result" | "errorText">
): string {
  if (isStaleObservationAfterAllow(tool)) return t("chat.toolStaleObservation")
  const code = readApprovalNotExecutedCode(tool?.result) ?? readApprovalNotExecutedCode(tool?.errorText)
  if (code === APPROVAL_ARGS_MISMATCH || tool?.errorText === APPROVAL_ARGS_MISMATCH_COPY) {
    return t("chat.toolArgsMismatch")
  }
  return t("chat.toolDenied")
}
