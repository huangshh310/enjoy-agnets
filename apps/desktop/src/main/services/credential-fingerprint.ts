/**
 * 校验世代：hash(key + baseURL + modelsURL)，只存哈希，不落明文。
 */
import { createHash } from "node:crypto"

export type CredentialFingerprintSource = {
  apiKey?: string
  baseURL?: string
  modelsURL?: string
}

export function credentialFingerprint(source: CredentialFingerprintSource | undefined): string {
  const key = source?.apiKey?.trim() ?? ""
  const base = source?.baseURL?.trim() ?? ""
  const models = source?.modelsURL?.trim() ?? ""
  return createHash("sha256").update(`${key}\n${base}\n${models}`).digest("hex")
}

/** 改名不探；密钥或端点变了才探。空 apiKey 表示保留已存。 */
export function credentialProbeNeeded(
  existing: CredentialFingerprintSource | undefined,
  next: CredentialFingerprintSource
): boolean {
  if (!existing) return true
  return (
    credentialFingerprint({
      apiKey: next.apiKey?.trim() ? next.apiKey : existing.apiKey,
      baseURL: next.baseURL ?? existing.baseURL,
      modelsURL: next.modelsURL ?? existing.modelsURL
    }) !== credentialFingerprint(existing)
  )
}

export function sameOriginUrl(left: string, right: string): boolean {
  try {
    return new URL(left).origin === new URL(right, left).origin
  } catch {
    return false
  }
}
