/**
 * 资产内容哈希，用于去重与 provider reference 缓存键。
 */
import { createHash } from "node:crypto"

export function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

export function hashBase64(bytesBase64: string): string {
  return hashBytes(Buffer.from(bytesBase64, "base64"))
}
