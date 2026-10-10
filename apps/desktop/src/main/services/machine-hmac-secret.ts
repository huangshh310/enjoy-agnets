/**
 * 本机 HMAC 密钥：审批签名与密钥指纹共用。进 userData（safeStorage）。
 */
import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { app, safeStorage } from "electron"

let processSecret: string | undefined

function hmacFile(): string {
  return join(app.getPath("userData"), "approval-hmac.bin")
}

export function machineHmacSecret(): string {
  if (processSecret) return processSecret
  processSecret = readPersistedSecret() ?? randomBytes(32).toString("hex")
  persistSecret(processSecret)
  return processSecret
}

function readPersistedSecret(): string | undefined {
  const file = hmacFile()
  if (!existsSync(file)) return undefined
  try {
    const buf = readFileSync(file)
    if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(buf)
    return buf.toString("utf8")
  } catch {
    return undefined
  }
}

function persistSecret(secret: string): void {
  try {
    const payload = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(secret)
      : Buffer.from(secret, "utf8")
    writeFileSync(hmacFile(), payload, { mode: 0o600 })
  } catch {
    // 写盘失败仍用内存密钥，本进程内 HMAC 可用。
  }
}
