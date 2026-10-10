/**
 * 系统钥匙串是否能安全写密钥。Linux `basic_text` 当不可用。禁止明文回落。
 */
import { app, safeStorage } from "electron"
import type { SecretWriteErrorCode } from "@enjoy-agents/ipc-contract"

/** Linux 不安全后端：Electron 明文回落，产品视为钥匙串不可用。 */
export const LINUX_INSECURE_SECRET_BACKEND = "basic_text"

export type SecretStorageProbe = {
  encryptionAvailable: boolean
  linuxBackend?: string
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  packaged?: boolean
}

export class SecretWriteFailure extends Error {
  readonly code: SecretWriteErrorCode

  constructor(code: SecretWriteErrorCode = "KEYCHAIN_UNAVAILABLE") {
    super(code)
    this.name = "SecretWriteFailure"
    this.code = code
  }
}

/** `ENJOY_E2E_STUB=1` 且未打包且 `ENJOY_E2E_KEYCHAIN=unavailable` 才模拟钥匙串挂掉。 */
export function isE2eKeychainUnavailable(
  env: NodeJS.ProcessEnv = process.env,
  packaged = false
): boolean {
  return isE2eStubEnv(env) && !packaged && env.ENJOY_E2E_KEYCHAIN === "unavailable"
}

export function isSecretStorageAvailable(probe?: SecretStorageProbe): boolean {
  const live = probe ?? readSecretStorageProbe()
  const env = live.env ?? process.env
  const packaged = live.packaged === true
  if (isE2eKeychainUnavailable(env, packaged)) return false
  // 未打包 stub 用明文夹具写密钥；只有 KEYCHAIN=unavailable 才模拟挂掉。
  if (isE2eStubEnv(env) && !packaged) return true
  if (!live.encryptionAvailable) return false
  const platform = live.platform ?? process.platform
  if (platform === "linux" && live.linuxBackend === LINUX_INSECURE_SECRET_BACKEND) return false
  return true
}

export function readSecretStorageProbe(): SecretStorageProbe {
  return {
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    linuxBackend: readLinuxSecretBackend(),
    platform: process.platform,
    packaged: readPackaged(),
    env: process.env
  }
}

export function assertSecretStorageAvailable(probe?: SecretStorageProbe): void {
  if (!isSecretStorageAvailable(probe)) {
    throw new SecretWriteFailure("KEYCHAIN_UNAVAILABLE")
  }
}

function isE2eStubEnv(env: NodeJS.ProcessEnv): boolean {
  return env.ENJOY_E2E_STUB === "1"
}

function readLinuxSecretBackend(): string | undefined {
  if (process.platform !== "linux") return undefined
  try {
    return safeStorage.getSelectedStorageBackend?.()
  } catch {
    return undefined
  }
}

function readPackaged(): boolean {
  try {
    return app.isPackaged
  } catch {
    return false
  }
}
