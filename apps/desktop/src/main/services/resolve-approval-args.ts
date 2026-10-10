/**
 * 审批 args 缺了就按 toolCallId 回填；回填不了禁止用 {} 冒充入参。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  APPROVAL_ARGS_MISSING,
  APPROVAL_ARGS_MISSING_COPY
} from "@enjoy-agents/ipc-contract/approval-not-executed"

export { APPROVAL_ARGS_MISSING, APPROVAL_ARGS_MISSING_COPY as APPROVAL_ARGS_MISSING_MESSAGE }

export function isMissingApprovalArgs(args: unknown): boolean {
  if (args == null) return true
  return typeof args === "object" && !Array.isArray(args) && Object.keys(args).length === 0
}

export function backfillApprovalArgs(tools: ThreadToolCall[], toolCallId: string): unknown {
  return tools.find((tool) => tool.id === toolCallId)?.args
}

export function resolveApprovalArgs(input: {
  name: string
  args: unknown
  toolCallId: string
  tools: ThreadToolCall[]
}): { ok: true; args: unknown } | { ok: false; code: string; message: string } {
  const filled = isMissingApprovalArgs(input.args)
    ? backfillApprovalArgs(input.tools, input.toolCallId)
    : input.args
  if (isMissingApprovalArgs(filled)) {
    return { ok: false, code: APPROVAL_ARGS_MISSING, message: APPROVAL_ARGS_MISSING_COPY }
  }
  return { ok: true, args: filled }
}
