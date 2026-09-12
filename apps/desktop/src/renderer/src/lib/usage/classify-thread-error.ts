/**
 * 线程错误分层：402/额度走 L4，429 仍是限流，鉴权走打开登录。
 */
export type ThreadErrorKind =
  | "credit"
  | "rate_limit"
  | "auth"
  | "authorizing"
  | "login_failed"
  | "needs_key"
  | "inspecting"
  | "outdated"
  | "generic"

export const NEED_PROVIDER_KEY = "NEED_PROVIDER_KEY"
export const NEED_CLI_LOGIN = "NEED_CLI_LOGIN"
export const NEED_CLI_INSPECTING = "NEED_CLI_INSPECTING"
export const NEED_CLI_AUTHORIZING = "NEED_CLI_AUTHORIZING"
export const NEED_CLI_LOGIN_FAILED = "NEED_CLI_LOGIN_FAILED"
export const NEED_CLI_OUTDATED = "NEED_CLI_OUTDATED"
export const HANDOFF_CONFIRM_FAILED = "HANDOFF_CONFIRM_FAILED"

const CREDIT_MARKERS = [
  "402",
  "credit",
  "spend limit",
  "spendlimit",
  "quota exceeded",
  "quota exhausted",
  "insufficient credits",
  "usage limit",
  "billing"
]

export function classifyThreadError(message: string): ThreadErrorKind {
  const lower = message.toLowerCase()
  if (
    message === NEED_PROVIDER_KEY ||
    lower.includes("add a provider api key") ||
    lower.includes("before using this bound profile")
  ) {
    return "needs_key"
  }
  if (message === NEED_CLI_INSPECTING) return "inspecting"
  if (message === NEED_CLI_AUTHORIZING) return "authorizing"
  if (message === NEED_CLI_LOGIN_FAILED) return "login_failed"
  if (message === NEED_CLI_OUTDATED) return "outdated"
  if (
    message === NEED_CLI_LOGIN ||
    lower.includes("acp_auth_required") ||
    lower.includes("needs login before a session")
  ) {
    return "auth"
  }
  if (CREDIT_MARKERS.some((marker) => lower.includes(marker))) return "credit"
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return "rate_limit"
  }
  return "generic"
}
