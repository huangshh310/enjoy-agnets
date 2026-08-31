/**
 * Claude Code / Vercel Sandbox 凭证：只走 safeStorage，禁止明文 JSON。
 */
import { safeStorage } from "electron"
import { getSetting, setSetting } from "./database"

const HARNESS_KEY = "harness.secret"

export type HarnessSecret = {
  anthropicApiKey: string
  vercelToken: string
  vercelTeamId?: string
  vercelProjectId?: string
}

/** 给 Settings 用的公开状态，不含密钥原文。 */
export function harnessPublicStatus() {
  const secret = readHarnessSecret()
  const hasAnthropicKey = Boolean(secret?.anthropicApiKey)
  const hasVercelToken = Boolean(secret?.vercelToken)
  return {
    ready: hasAnthropicKey && hasVercelToken,
    hasAnthropicKey,
    hasVercelToken
  }
}

/** 解密已存凭证；加密不可用或损坏时返回 null，不回退明文。 */
export function readHarnessSecret(): HarnessSecret | null {
  if (!safeStorage.isEncryptionAvailable()) return null
  const raw = getSetting(HARNESS_KEY)
  if (!raw) return null
  try {
    const json = safeStorage.decryptString(Buffer.from(raw, "base64"))
    const parsed = JSON.parse(json) as Partial<HarnessSecret>
    if (!parsed.anthropicApiKey && !parsed.vercelToken) return null
    return {
      anthropicApiKey: parsed.anthropicApiKey ?? "",
      vercelToken: parsed.vercelToken ?? "",
      vercelTeamId: parsed.vercelTeamId,
      vercelProjectId: parsed.vercelProjectId
    }
  } catch {
    return null
  }
}

/** 合并后加密写入。OS 密钥环不可用时直接失败，避免明文落盘。 */
export function writeHarnessSecret(patch: Partial<HarnessSecret>): HarnessSecret {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS keychain encryption is not available on this machine.")
  }
  const current = readHarnessSecret()
  const next: HarnessSecret = {
    anthropicApiKey: pickSecret(patch.anthropicApiKey, current?.anthropicApiKey),
    vercelToken: pickSecret(patch.vercelToken, current?.vercelToken),
    vercelTeamId: patch.vercelTeamId ?? current?.vercelTeamId,
    vercelProjectId: patch.vercelProjectId ?? current?.vercelProjectId
  }
  const stored = safeStorage.encryptString(JSON.stringify(next)).toString("base64")
  setSetting(HARNESS_KEY, stored)
  return next
}

function pickSecret(next: string | undefined, prev: string | undefined): string {
  if (next === undefined) return prev ?? ""
  const trimmed = next.trim()
  return trimmed.length > 0 ? trimmed : prev ?? ""
}
