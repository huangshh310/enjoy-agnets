/**
 * 统一运行时错误分类，供 UI 区分重试与配置问题。
 */
import { unwrapErrorMessage } from "./unwrap-error.ts"

export type RuntimeErrorClass =
  | "config"
  | "capability"
  | "auth"
  | "rate_limit"
  | "credit_limit"
  | "timeout"
  | "provider"
  | "tool"
  | "approval_denied"
  | "sandbox"
  | "mcp"
  | "resume"

export class RuntimeError extends Error {
  readonly errorClass: RuntimeErrorClass
  readonly retryable: boolean

  constructor(errorClass: RuntimeErrorClass, message: string, retryable = false) {
    super(message)
    this.name = "RuntimeError"
    this.errorClass = errorClass
    this.retryable = retryable
  }
}

export function classifyError(error: unknown): RuntimeError {
  if (error instanceof RuntimeError) return error
  const message = unwrapErrorMessage(error)
  const lower = message.toLowerCase()
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return new RuntimeError("timeout", message, true)
  }
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("api key")) {
    return new RuntimeError("auth", message, false)
  }
  if (
    lower.includes("402") ||
    lower.includes("credit") ||
    lower.includes("spend limit") ||
    lower.includes("quota exceeded") ||
    lower.includes("insufficient credits")
  ) {
    return new RuntimeError("credit_limit", message, false)
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return new RuntimeError("rate_limit", message, true)
  }
  if (lower.includes("not supported") || lower.includes("capability")) {
    return new RuntimeError("capability", message, false)
  }
  if (isInternalStoreError(message)) {
    return new RuntimeError("tool", INTERNAL_STORE_ERROR, false)
  }
  return new RuntimeError("provider", message, true)
}

/** 分类前先记下原始存储报错；对话只走人话码。 */
export function logAndClassifyError(scope: string, error: unknown): RuntimeError {
  const message = unwrapErrorMessage(error)
  if (isInternalStoreError(message)) {
    console.error(`${scope} store error`, error)
  }
  return classifyError(error)
}

/** 对话禁止摊 SQL / constraint；只进日志。 */
export const INTERNAL_STORE_ERROR = "INTERNAL_STORE_ERROR"

export function isInternalStoreError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("unique constraint") ||
    lower.includes("constraint failed") ||
    lower.includes("sqlite_") ||
    (/\bsql\b/.test(lower) && lower.includes("constraint"))
  )
}
