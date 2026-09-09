/**
 * 从官方 login stdout 抽出授权 URL / 设备码。不把 token 查询串交给 renderer。
 */

const MARKED =
  /Open this URL in your browser:\s*(?:\r?\n)+\s*(https:\/\/[^\s"'<>]+)/i
const USER_CODE = /Enter code:\s*([A-Z0-9-]{4,20})/i
const EMPTY_OK = /GitHub Enterprise URL\/domain|blank for github\.com/i
const NEEDS_PASTE =
  /paste(?:d)? the authorization|waiting for pasted|api[_ ]key|enter your (key|token)|create or copy your|create\/copy a token|huggingface_hub_token|onManualCodeInput/i

/** 只认官方「Open this URL」下一行，避免提示里其它 https 抢先打开、跳过空回车。 */
export function extractLoginUrl(text: string): string | null {
  const raw = sanitizeUrl(text.match(MARKED)?.[1])
  if (!raw) return null
  if (/access_token|refresh_token|id_token|secret=/i.test(raw)) return null
  return raw
}

/** GitHub device flow 的用户码，给 UI 展示用，不是 token。 */
export function extractDeviceUserCode(text: string): string | null {
  const raw = text.match(USER_CODE)?.[1]?.toUpperCase() ?? ""
  return /^[A-Z0-9-]{4,20}$/.test(raw) ? raw : null
}

/** 官方允许空回车的提问（GitHub Enterprise → github.com）。 */
export function looksLikeEmptyOkPrompt(text: string): boolean {
  return EMPTY_OK.test(text)
}

export function looksLikeInteractiveLogin(text: string): boolean {
  return NEEDS_PASTE.test(text)
}

export function loginFinished(text: string): boolean {
  return /credentials saved/i.test(text)
}

function sanitizeUrl(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.replace(/[),.;]+$/g, "")
  if (!trimmed.startsWith("https://") || trimmed.length > 2000) return null
  return trimmed
}
