/**
 * 未执行：拒绝、回放 fail closed、参数不一致、带 resumeCode。
 * 叶子文件，renderer / main / 折叠共用，禁止从合约入口再取。
 */

export const APPROVAL_ARGS_MISMATCH = "APPROVAL_ARGS_MISMATCH"
export const APPROVAL_REPLAY_DENIED = "APPROVAL_REPLAY_DENIED"
export const APPROVAL_ARGS_MISMATCH_COPY = "审批参数已变化，本次未执行。"
export const APPROVAL_REPLAY_DENIED_COPY = "本次未执行。"

const NOT_EXECUTED_CODES = new Set([
  APPROVAL_ARGS_MISMATCH,
  APPROVAL_REPLAY_DENIED,
  "stale_observation",
  "needs_foreground",
  "action_failed"
])

const NOT_EXECUTED_TEXT = new Set([
  APPROVAL_ARGS_MISMATCH_COPY,
  APPROVAL_REPLAY_DENIED_COPY,
  "已拒绝，本次未执行",
  "Declined, not run this time"
])

export function isApprovalNotExecutedCode(value: unknown): value is string {
  return typeof value === "string" && NOT_EXECUTED_CODES.has(value)
}

export function isApprovalNotExecutedText(value: unknown): boolean {
  return typeof value === "string" && NOT_EXECUTED_TEXT.has(value)
}

export function isApprovalNotExecutedMessage(value: unknown): boolean {
  return isApprovalNotExecutedCode(value) || isApprovalNotExecutedText(value)
}

export function readApprovalNotExecutedCode(value: unknown): string | undefined {
  if (isApprovalNotExecutedCode(value)) return value
  if (!value || typeof value !== "object") return undefined
  const row = value as Record<string, unknown>
  const nested = row.result && typeof row.result === "object" ? (row.result as Record<string, unknown>) : undefined
  for (const candidate of [row.code, row.error, row.errorText, row.reason, row.resumeCode, nested?.code]) {
    if (isApprovalNotExecutedCode(candidate)) return String(candidate)
  }
  return undefined
}

const APPROVAL_DECISIONS = new Set(["allow", "deny", "allow_session", "allow_always"])

export type NotExecutedTool = {
  state?: string
  result?: unknown
  errorText?: string
}

/** 库行 / 折叠结果上的决策，渲染层按码+决策映射文案，不得自行推断。 */
export function readApprovalDecision(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined
  const row = value as Record<string, unknown>
  const nested = row.result && typeof row.result === "object" ? (row.result as Record<string, unknown>) : undefined
  for (const candidate of [row.decision, nested?.decision]) {
    if (typeof candidate === "string" && APPROVAL_DECISIONS.has(candidate)) return candidate
  }
  return undefined
}

/** Allow 后观察过期：未执行，但不是用户拒绝。缺 decision 仍按码认（旧行只有 resumeCode）。 */
export function isStaleObservationAfterAllow(tool: NotExecutedTool | undefined): boolean {
  if (!tool) return false
  const code = readApprovalNotExecutedCode(tool.result) ?? readApprovalNotExecutedCode(tool.errorText)
  if (code !== "stale_observation") return false
  return readApprovalDecision(tool.result) !== "deny"
}

/** deny / fail closed / 参数不一致 / resumeCode，含旧库 output-error 行。 */
export function isToolNotExecuted(tool: NotExecutedTool | undefined): boolean {
  if (!tool) return false
  if (tool.state === "output-denied") return true
  if (isApprovalNotExecutedText(tool.errorText) || isApprovalNotExecutedCode(tool.errorText)) return true
  return Boolean(readApprovalNotExecutedCode(tool.result))
}
