/**
 * 未执行：拒绝 / fail closed / 参数不一致。对话写中性文案，不当作出错。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  APPROVAL_ARGS_MISMATCH,
  APPROVAL_ARGS_MISMATCH_COPY,
  isToolNotExecuted,
  readApprovalNotExecutedCode
} from "@enjoy-agents/ipc-contract/approval-not-executed"

type Translate = (key: string) => string

export function isDeniedTool(
  tool: Pick<ThreadToolCall, "state" | "result" | "errorText"> | undefined
): boolean {
  return isToolNotExecuted(tool)
}

export function toolDeniedCopy(
  t: Translate,
  tool?: Pick<ThreadToolCall, "result" | "errorText">
): string {
  const code = readApprovalNotExecutedCode(tool?.result) ?? readApprovalNotExecutedCode(tool?.errorText)
  if (code === APPROVAL_ARGS_MISMATCH || tool?.errorText === APPROVAL_ARGS_MISMATCH_COPY) {
    return t("chat.toolArgsMismatch")
  }
  return t("chat.toolDenied")
}
