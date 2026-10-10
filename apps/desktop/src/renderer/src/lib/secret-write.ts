/**
 * 写密钥 IPC 回包：失败码转成可展示错误，成功解开 payload。
 */
import {
  secretWriteBlockedCode,
  secretWriteOkPayload,
  SettingsSnapshot,
  type SecretWriteErrorCode
} from "@enjoy-agents/ipc-contract"

export class SecretWriteUiError extends Error {
  readonly code: SecretWriteErrorCode

  constructor(code: SecretWriteErrorCode) {
    super(code)
    this.name = "SecretWriteUiError"
    this.code = code
  }
}

export function unwrapSecretWrite<T>(result: unknown): T {
  const code = secretWriteBlockedCode(result)
  if (code) throw new SecretWriteUiError(code)
  return result as T
}

/** 成功回包去掉 ok，立刻给 renderer 新快照，不要再 refetch 旧的。 */
export function unwrapSettingsWrite(result: unknown): SettingsSnapshot {
  const raw = unwrapSecretWrite<{ ok: true } & Record<string, unknown>>(result)
  return SettingsSnapshot.parse(secretWriteOkPayload(raw))
}

export function secretWriteErrorMessage(
  error: unknown,
  t: (path: string, vars?: Record<string, string | number>) => string
): string {
  if (error instanceof SecretWriteUiError) {
    return t("settings.secrets.keychainUnavailable")
  }
  return error instanceof Error ? error.message : String(error)
}
