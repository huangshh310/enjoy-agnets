/**
 * 密钥写回：同时认抛错和 kai 即将落地的 `{ok:false, code}`。
 * TODO: 枚举换成 `@enjoy-agents/ipc-contract` 的 `SecretWriteErrorCode`。
 */
export type SecretWriteErrorCode = "KEYCHAIN_UNAVAILABLE" | "UNKNOWN"

export type SecretWriteOutcome<T> = { ok: true; value: T } | { ok: false; code: SecretWriteErrorCode }

const KEYCHAIN_UNAVAILABLE = "KEYCHAIN_UNAVAILABLE"
const KEYCHAIN_THROWN =
  /keychain encryption is not available|isEncryptionAvailable|KEYCHAIN_UNAVAILABLE|no usable system keychain/i

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

/** 先看结构化回执，再回落抛错。旧 IPC 成功体没有 `ok`。 */
export function readSecretWrite<T>(raw: unknown, thrown?: unknown): SecretWriteOutcome<T> {
  if (thrown !== undefined) return { ok: false, code: secretWriteCodeFromThrown(thrown) }
  if (raw && typeof raw === "object" && "ok" in raw) {
    const row = raw as { ok: unknown; code?: unknown }
    if (row.ok === false) return { ok: false, code: secretWriteCodeOf(row.code) }
    if (row.ok === true) return { ok: true, value: stripOk(raw) as T }
  }
  return { ok: true, value: raw as T }
}

export async function runSecretWrite<T>(op: () => Promise<T>): Promise<SecretWriteOutcome<T>> {
  try {
    return readSecretWrite<T>(await op())
  } catch (err) {
    return readSecretWrite<T>(undefined, err)
  }
}

export function secretWriteCopyKey(code: SecretWriteErrorCode): "settings.secretWrite.keychainUnavailable" | "settings.secretWrite.failed" {
  return code === KEYCHAIN_UNAVAILABLE
    ? "settings.secretWrite.keychainUnavailable"
    : "settings.secretWrite.failed"
}

function stripOk(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw
  const { ok: _ok, ...rest } = raw as { ok: unknown } & Record<string, unknown>
  return rest
}
