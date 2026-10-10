/**
 * 密钥写回：先认 `{ok:false, code}`，再接住旧 main 的 throw。
 * 合约枚举只有 KEYCHAIN_UNAVAILABLE（禁止 KEYCHAIN_LOCKED）。未知码走「没存上」。
 */
import {
  SecretWriteBlocked,
  secretWriteBlockedCode as contractBlockedCode,
  secretWriteOkPayload,
  SettingsSnapshot,
  type SecretWriteErrorCode as SecretWriteContractCode,
  type SecretWriteRevokeHint
} from "@enjoy-agents/ipc-contract"

/** 与合约对齐；UNKNOWN 只给 UI，不进 Zod 枚举。 */
export type { SecretWriteContractCode }
export type SecretWriteErrorCode = SecretWriteContractCode | "UNKNOWN"

export type SecretWriteOutcome<T> = { ok: true; value: T } | { ok: false; code: SecretWriteErrorCode }

/** 黄条 = 机器上没有钥匙串；红字 = 这次没存上（可能只是锁着）。 */
export type SecretWriteSurface = "preflight" | "writeFail"

const KEYCHAIN_UNAVAILABLE = "KEYCHAIN_UNAVAILABLE"
const KEYCHAIN_THROWN =
  /keychain encryption is not available|isEncryptionAvailable|KEYCHAIN_UNAVAILABLE|no usable system keychain/i

/**
 * 写回失败码 → 表面。KEYCHAIN_UNAVAILABLE 走红字（②）。
 * 未来若拆出 NOT_INSTALLED，把它标成 preflight，就会改走黄条（①）。
 */
const WRITE_SURFACE: Record<string, SecretWriteSurface> = {
  KEYCHAIN_UNAVAILABLE: "writeFail"
  // KEYCHAIN_NOT_INSTALLED: "preflight"
}

export function secretWriteSurfaceOf(code: SecretWriteErrorCode): SecretWriteSurface {
  return WRITE_SURFACE[code] ?? "writeFail"
}

export function unwrapIpcMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "")
  return raw.replace(/^Error invoking remote method '[^']+':\s*/i, "").trim()
}

export function secretWriteCodeFromThrown(err: unknown): SecretWriteErrorCode {
  return KEYCHAIN_THROWN.test(unwrapIpcMessage(err)) ? KEYCHAIN_UNAVAILABLE : "UNKNOWN"
}

export function secretWriteCodeOf(code: unknown): SecretWriteErrorCode {
  return code === KEYCHAIN_UNAVAILABLE ? KEYCHAIN_UNAVAILABLE : "UNKNOWN"
}

/** 与合约 `secretWriteBlockedCode` 同名：只认枚举，未知码当未挡住。 */
export function secretWriteBlockedCode(raw: unknown): SecretWriteContractCode | null {
  return contractBlockedCode(raw)
}

export function isSecretWriteBlocked(raw: unknown): boolean {
  return secretWriteBlockedCode(raw) !== null
}

export function secretWriteOk(raw: unknown): boolean {
  if (raw && typeof raw === "object" && "ok" in raw) return (raw as { ok: unknown }).ok === true
  return true
}

export { secretWriteOkPayload }

/** 先看结构化回执，再回落抛错。旧 IPC 成功体没有 `ok`。 */
export function readSecretWrite<T>(raw: unknown, thrown?: unknown): SecretWriteOutcome<T> {
  if (thrown !== undefined) return { ok: false, code: secretWriteCodeFromThrown(thrown) }
  if (raw && typeof raw === "object" && "ok" in raw) {
    const row = raw as { ok: unknown; code?: unknown }
    if (row.ok === false) return { ok: false, code: secretWriteCodeOf(row.code) }
    if (row.ok === true) {
      return { ok: true, value: secretWriteOkPayload(raw as { ok: true } & Record<string, unknown>) as T }
    }
  }
  return { ok: true, value: raw as T }
}

let e2eForcedCode: SecretWriteErrorCode | null = null

/** 仅 e2e 桥：下一次写回直接失败，用来拍 ②。 */
export function forceSecretWriteForE2e(code: SecretWriteErrorCode | null): void {
  e2eForcedCode = code
}

export async function runSecretWrite<T>(op: () => Promise<T>): Promise<SecretWriteOutcome<T>> {
  if (e2eForcedCode) {
    const code = e2eForcedCode
    e2eForcedCode = null
    return { ok: false, code }
  }
  try {
    return readSecretWrite<T>(await op())
  } catch (err) {
    return readSecretWrite<T>(undefined, err)
  }
}

export type SecretWriteCopyKey =
  | "settings.secretWrite.writeFailedKeychain"
  | "settings.secretWrite.failed"

export function secretWriteCopyKey(code: SecretWriteErrorCode): SecretWriteCopyKey {
  return code === KEYCHAIN_UNAVAILABLE
    ? "settings.secretWrite.writeFailedKeychain"
    : "settings.secretWrite.failed"
}

/** 快照 false → 黄条；写回码按 WRITE_SURFACE 分流。预检时不叠红字。 */
export function secretWriteUi(
  storageAvailable: boolean | undefined,
  writeCode: SecretWriteErrorCode | null
): { preflight: boolean; errorCode: SecretWriteErrorCode | null } {
  if (storageAvailable === false) return { preflight: true, errorCode: null }
  if (!writeCode) return { preflight: false, errorCode: null }
  if (secretWriteSurfaceOf(writeCode) === "preflight") return { preflight: true, errorCode: null }
  return { preflight: false, errorCode: writeCode }
}

export class SecretWriteUiError extends Error {
  readonly code: SecretWriteErrorCode
  readonly revokeUrl?: string
  readonly providerLabel?: string

  constructor(code: SecretWriteErrorCode, hint?: SecretWriteRevokeHint) {
    super(code)
    this.name = "SecretWriteUiError"
    this.code = code
    this.revokeUrl = hint?.revokeUrl
    this.providerLabel = hint?.providerLabel
  }
}

export function unwrapSecretWrite<T>(result: unknown): T {
  const blocked = SecretWriteBlocked.safeParse(result)
  if (blocked.success) {
    throw new SecretWriteUiError(blocked.data.code, {
      revokeUrl: blocked.data.revokeUrl,
      providerLabel: blocked.data.providerLabel
    })
  }
  const code = secretWriteBlockedCode(result)
  if (code) throw new SecretWriteUiError(code)
  if (result && typeof result === "object" && "ok" in result && (result as { ok: unknown }).ok === true) {
    return secretWriteOkPayload(result as { ok: true } & Record<string, unknown>) as T
  }
  return result as T
}

/** 成功回包去掉 ok，立刻给 renderer 新快照，不要再 refetch 旧的。 */
export function unwrapSettingsWrite(result: unknown): SettingsSnapshot {
  const raw = unwrapSecretWrite<{ ok: true } & Record<string, unknown>>(result)
  return SettingsSnapshot.parse(raw)
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
