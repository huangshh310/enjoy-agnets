/**
 * 写密钥 IPC：钥匙串不可用时回 { ok:false, code }，不要 throw。
 */
import {
  secretWriteBlocked,
  secretWriteOk,
  type SecretWriteBlocked
} from "@enjoy-agents/ipc-contract"
import { SecretWriteFailure, isSecretStorageAvailable } from "./secret-storage.ts"

export function guardSecretWrite(): SecretWriteBlocked | null {
  return isSecretStorageAvailable() ? null : secretWriteBlocked()
}

export async function runSecretWrite<T extends Record<string, unknown>>(
  write: () => Promise<T> | T
): Promise<({ ok: true } & T) | SecretWriteBlocked> {
  const blocked = guardSecretWrite()
  if (blocked) return blocked
  try {
    return secretWriteOk(await write())
  } catch (error) {
    if (error instanceof SecretWriteFailure) return secretWriteBlocked(error.code)
    throw error
  }
}

/** 只在真正要落密码时检查。agent / keypath 开档不挡。 */
export function guardPasswordWrite(password?: string): SecretWriteBlocked | null {
  if (!password?.trim()) return null
  return guardSecretWrite()
}
