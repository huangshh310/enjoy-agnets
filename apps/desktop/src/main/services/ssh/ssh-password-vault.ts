/**
 * SSH 登录密码：safeStorage 加密后进 secrets_vault。
 * 主机表 / list / 事件只记 auth=password，不放明文。
 */
import { createRequire } from "node:module"
import { deleteSecretValue, getSecretValue, setSecretValue } from "@enjoy-agents/db"
import { getDatabase } from "../database.ts"

const require = createRequire(import.meta.url)
const PREFIX = "ssh-password:"

export function setSshPassword(hostId: string, password: string): void {
  const trimmed = password.trim()
  if (!trimmed) return
  setSecretValue(getDatabase(), PREFIX + hostId, encrypt(trimmed))
}

export function getSshPassword(hostId: string | undefined): string | undefined {
  if (!hostId) return undefined
  const raw = getSecretValue(getDatabase(), PREFIX + hostId)
  if (!raw) return undefined
  return decrypt(raw)
}

export function deleteSshPassword(hostId: string): void {
  deleteSecretValue(getDatabase(), PREFIX + hostId)
}

function encrypt(plain: string): string {
  const safeStorage = loadSafeStorage()
  if (!safeStorage?.isEncryptionAvailable()) {
    throw new Error("OS keychain encryption is not available on this machine.")
  }
  return safeStorage.encryptString(plain).toString("base64")
}

function decrypt(stored: string): string | undefined {
  const safeStorage = loadSafeStorage()
  if (!safeStorage?.isEncryptionAvailable()) return undefined
  try {
    return safeStorage.decryptString(Buffer.from(stored, "base64"))
  } catch {
    return undefined
  }
}

function loadSafeStorage():
  | { isEncryptionAvailable: () => boolean; encryptString: (plain: string) => Buffer; decryptString: (buf: Buffer) => string }
  | undefined {
  try {
    return (require("electron") as typeof import("electron")).safeStorage
  } catch {
    return undefined
  }
}
