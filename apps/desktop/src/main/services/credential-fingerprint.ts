/**
 * 校验世代：本机 HMAC(key + 端点 + apiStyle)，只存标签，不落明文。
 * 旧无盐 sha256 对不上当 unverified。
 */
import { createHmac } from "node:crypto"
import { machineHmacSecret } from "./machine-hmac-secret.ts"

export type CredentialFingerprintSource = {
  apiKey?: string
  baseURL?: string
  modelsURL?: string
  apiStyle?: string
  endpoints?: {
    openai?: string
    anthropic?: string
    "openai-responses"?: string
  }
}

export function credentialFingerprintMaterial(
  source: CredentialFingerprintSource | undefined
): string {
  const key = source?.apiKey?.trim() ?? ""
  const base = source?.baseURL?.trim() ?? ""
  const models = source?.modelsURL?.trim() ?? ""
  const style = source?.apiStyle?.trim() ?? ""
  const openai = source?.endpoints?.openai?.trim() ?? ""
  const anthropic = source?.endpoints?.anthropic?.trim() ?? ""
  const responses = source?.endpoints?.["openai-responses"]?.trim() ?? ""
  return `${key}\n${base}\n${models}\n${style}\n${openai}\n${anthropic}\n${responses}`
}

export function credentialFingerprint(
  source: CredentialFingerprintSource | undefined,
  secret = machineHmacSecret()
): string {
  return createHmac("sha256", secret).update(credentialFingerprintMaterial(source)).digest("hex")
}

/** 改名不探；密钥、端点或协议变了才探。空 apiKey 表示保留已存。 */
export function credentialProbeNeeded(
  existing: CredentialFingerprintSource | undefined,
  next: CredentialFingerprintSource
): boolean {
  if (!existing) return true
  return (
    credentialFingerprint({
      apiKey: next.apiKey?.trim() ? next.apiKey : existing.apiKey,
      baseURL: next.baseURL ?? existing.baseURL,
      modelsURL: next.modelsURL ?? existing.modelsURL,
      apiStyle: next.apiStyle ?? existing.apiStyle,
      endpoints: next.endpoints ?? existing.endpoints
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
