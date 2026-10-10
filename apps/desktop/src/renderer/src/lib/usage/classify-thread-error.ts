/**
 * 线程错误分层：402/额度走 L4，429 仍是限流，鉴权走打开登录。
 */
import { NO_CHAT_ROUTE } from "@enjoy-agents/ipc-contract/chat-readiness"

export { NO_CHAT_ROUTE }

export type ThreadErrorKind =
  | "credit"
  | "rate_limit"
  | "auth"
  | "authorizing"
  | "login_failed"
  | "needs_key"
  | "needs_model"
  | "no_chat_route"
  | "inspecting"
  | "outdated"
  | "remote_cli_missing"
  | "remote_disconnected"
  | "resume_fallback"
  | "store"
  | "send_restore"
  | "stopped"
  | "restore_no_matching"
  | "run_failed"
  | "catch_up_timeout"
  | "generic"

export const NEED_PROVIDER_KEY = "NEED_PROVIDER_KEY"
export const NEED_MODEL = "NEED_MODEL"
export const NEED_CLI_LOGIN = "NEED_CLI_LOGIN"
export const NEED_CLI_INSPECTING = "NEED_CLI_INSPECTING"
export const NEED_CLI_AUTHORIZING = "NEED_CLI_AUTHORIZING"
export const NEED_CLI_LOGIN_FAILED = "NEED_CLI_LOGIN_FAILED"
export const NEED_CLI_OUTDATED = "NEED_CLI_OUTDATED"
export const HANDOFF_CONFIRM_FAILED = "HANDOFF_CONFIRM_FAILED"
export const NEED_REMOTE_CONNECTED = "NEED_REMOTE_CONNECTED"
export const ACP_RESUME_FALLBACK = "ACP_RESUME_FALLBACK"
export const INTERNAL_STORE_ERROR = "INTERNAL_STORE_ERROR"
export const SEND_FAILED_RESTORE = "SEND_FAILED_RESTORE"
export const SESSION_CREATE_TIMEOUT = "SESSION_CREATE_TIMEOUT"
export const SESSION_NOT_READY = "SESSION_NOT_READY"
export const USER_STOPPED = "user_aborted"
export const RESTORE_NO_MATCHING = "restore_no_matching_approval"
export const RUN_FAILED = "run_failed"
export const CATCH_UP_APPROVAL_TIMEOUT = "catch_up_approval_timeout"

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
    message === USER_STOPPED ||
    lower.trim().replace(/\.+$/, "") === "aborted by user"
  ) {
    return "stopped"
  }
  if (message === RESTORE_NO_MATCHING) return "restore_no_matching"
  if (message === RUN_FAILED) return "run_failed"
  if (message === CATCH_UP_APPROVAL_TIMEOUT) return "catch_up_timeout"
  if (
    message === INTERNAL_STORE_ERROR ||
    lower.includes("unique constraint") ||
    lower.includes("constraint failed")
  ) {
    return "store"
  }
  if (
    message === SEND_FAILED_RESTORE ||
    message === SESSION_CREATE_TIMEOUT ||
    message === SESSION_NOT_READY
  ) {
    return "send_restore"
  }
  if (message.startsWith(ACP_RESUME_FALLBACK)) return "resume_fallback"
  if (message === NO_CHAT_ROUTE || message.includes(NO_CHAT_ROUTE)) return "no_chat_route"
  if (message === NEED_MODEL || lower.includes("choose a model") || message.includes("先选一个模型")) {
    return "needs_model"
  }
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

type Translate = (path: string, vars?: Record<string, string | number>) => string

/** 机器码走人话键；禁止把 restore_no_matching_approval / run_failed 等原文摊进横幅。 */
export function threadErrorDetailKey(kind: ThreadErrorKind): string | undefined {
  if (kind === "restore_no_matching") return "chat.restoreNoMatching"
  if (kind === "run_failed") return "chat.runFailed"
  if (kind === "catch_up_timeout") return "studio.automations.catchUpTimeout"
  if (kind === "store") return "chat.errorGenericHint"
  if (kind === "send_restore") return "chat.sendFailedRestore"
  if (kind === "stopped") return "chat.runStopped"
  return undefined
}

export function humanizeThreadError(text: string | undefined, t: Translate): string {
  if (!text) return ""
  const kind = classifyThreadError(text)
  const key = threadErrorDetailKey(kind)
  if (key) return t(key)
  if (looksLikeMachineCode(text)) return t("chat.errorGenericHint")
  return text
}

function looksLikeMachineCode(text: string): boolean {
  return /^[a-z][a-z0-9_]{2,}$/.test(text.trim())
}
