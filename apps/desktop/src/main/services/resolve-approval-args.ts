/**
 * 审批 args 缺了就按 toolCallId 回填；回填不了禁止用 {} 冒充入参。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"
import {
  APPROVAL_ARGS_MISSING,
  APPROVAL_ARGS_MISSING_COPY
} from "@enjoy-agents/ipc-contract/approval-not-executed"

export { APPROVAL_ARGS_MISSING, APPROVAL_ARGS_MISSING_COPY as APPROVAL_ARGS_MISSING_MESSAGE }

/** 只有 undefined/null 算缺参。主循环 SDK 的 `{}`（零参工具）直接过。 */
export function isMissingApprovalArgs(args: unknown): boolean {
  return args == null
}

export function backfillApprovalArgs(
  tools: ThreadToolCall[],
  toolCallId: string,
  name?: string
): unknown {
  const tool = tools.find((item) => item.id === toolCallId)
  if (!tool) return undefined
  if (name && tool.name && tool.name !== name) return undefined
  return tool.args
}

export function resolveApprovalArgs(input: {
  name: string
  args: unknown
  toolCallId: string
  tools: ThreadToolCall[]
}): { ok: true; args: unknown } | { ok: false; code: string; message: string } {
  const filled = isMissingApprovalArgs(input.args)
    ? backfillApprovalArgs(input.tools, input.toolCallId, input.name)
    : input.args
  if (isMissingApprovalArgs(filled)) {
    return { ok: false, code: APPROVAL_ARGS_MISSING, message: APPROVAL_ARGS_MISSING_COPY }
  }
  return { ok: true, args: filled }
}
