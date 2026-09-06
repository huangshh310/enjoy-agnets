/**
 * 统一运行时错误分类，供 UI 区分重试与配置问题。
 */
import { unwrapErrorMessage } from "./unwrap-error.ts"

export type RuntimeErrorClass =
  | "config"
  | "capability"
  | "auth"
  | "rate_limit"
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
  if (lower.includes("429") || lower.includes("rate")) {
    return new RuntimeError("rate_limit", message, true)
  }
  if (lower.includes("not supported") || lower.includes("capability")) {
    return new RuntimeError("capability", message, false)
  }
  return new RuntimeError("provider", message, true)
}
