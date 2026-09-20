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
  | "remote_cli_missing"
  | "remote_disconnected"
  | "resume_fallback"
  | "generic"

export const NEED_PROVIDER_KEY = "NEED_PROVIDER_KEY"
export const NEED_CLI_LOGIN = "NEED_CLI_LOGIN"
export const NEED_CLI_INSPECTING = "NEED_CLI_INSPECTING"
export const NEED_CLI_AUTHORIZING = "NEED_CLI_AUTHORIZING"
export const NEED_CLI_LOGIN_FAILED = "NEED_CLI_LOGIN_FAILED"
export const NEED_CLI_OUTDATED = "NEED_CLI_OUTDATED"
export const HANDOFF_CONFIRM_FAILED = "HANDOFF_CONFIRM_FAILED"
export const NEED_REMOTE_CONNECTED = "NEED_REMOTE_CONNECTED"
export const ACP_RESUME_FALLBACK = "ACP_RESUME_FALLBACK"

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
  if (message.startsWith(ACP_RESUME_FALLBACK)) return "resume_fallback"
  if (
    message === NEED_PROVIDER_KEY ||
    lower.includes("add a provider api key") ||
    lower.includes("before using this bound profile")
  ) {
    return "needs_key"
  }
  if (message === NEED_REMOTE_CONNECTED || lower.includes("remote_disconnected") || message.includes("REMOTE_DISCONNECTED")) {
    return "remote_disconnected"
  }
  if (message === NEED_CLI_INSPECTING) return "inspecting"
  if (message === NEED_CLI_AUTHORIZING) return "authorizing"
  if (message === NEED_CLI_LOGIN_FAILED) return "login_failed"
  if (message === NEED_CLI_OUTDATED) return "outdated"
  if (
    message.includes("远端未找到") ||
    lower.includes("remote binary not found") ||
    lower.includes("远端未安装")
  ) {
    return "remote_cli_missing"
  }
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
