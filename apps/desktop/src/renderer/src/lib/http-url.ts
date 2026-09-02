/**
 * 只接受 http(s)。无协议的主机名补 https；拒绝 file / javascript / 自定义协议。
 */

const HTTP_PROTOCOLS = new Set(["http:", "https:"])

export function parseHttpUrl(raw: string | undefined | null): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const candidate = hasScheme(trimmed) ? trimmed : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }
  if (!HTTP_PROTOCOLS.has(url.protocol) || !url.hostname) return null
  return url.href
}

function hasScheme(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)
}
