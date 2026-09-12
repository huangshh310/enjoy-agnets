/**
 * 把 main 的登录回执码翻成 C 端提示。设备码只展示用户码，不带授权 URL。
 */
import type { TranslateFn } from "@renderer/i18n"

const DEVICE_RE = /^device:([A-Z0-9-]{4,20})$/

export function isAwaitingCallback(code: string | undefined): boolean {
  return code === "browser_opened" || Boolean(code?.match(DEVICE_RE))
}

export function loginHintFor(code: string | undefined, ok: boolean, t: TranslateFn): string {
  if (looksLikeSecretOrUrl(code)) return t("chat.cliProviderLoginFailed")
  const device = code?.match(DEVICE_RE)?.[1]
  if (device) return t("chat.cliProviderLoginDevice", { code: device })
  if (code === "browser_opened" || isLegacyLoginStarted(code)) {
    return t("chat.cliProviderLoginStarted")
  }
  if (code === "logged_in") return t("chat.cliProviderLoginDone")
  if (code === "callback_timeout") return t("chat.cliProviderLoginTimeout")
  if (code === "needs_tui") return t("chat.cliProviderLoginNeedsTui")
  if (ok) return t("chat.cliProviderLoginStarted")
  return t("chat.cliProviderLoginFailed")
}

function isLegacyLoginStarted(code: string | undefined): boolean {
  return Boolean(code && /login started/i.test(code))
}

function looksLikeSecretOrUrl(code: string | undefined): boolean {
  if (!code) return false
  return /^https?:/i.test(code) || /access_token|refresh_token|id_token/i.test(code)
}

/** 设置弹窗：OMP 回执码翻中文，其它 CLI 的英文原句原样展示。 */
export function displayLoginMessage(code: string | undefined, t: TranslateFn): string {
  if (!code) return ""
  if (
    isAwaitingCallback(code) ||
    isLegacyLoginStarted(code) ||
    code === "logged_in" ||
    code === "callback_timeout" ||
    code === "needs_tui" ||
    code === "failed"
  ) {
    return loginHintFor(
      isLegacyLoginStarted(code) ? "browser_opened" : code,
      code === "logged_in" || isAwaitingCallback(code) || isLegacyLoginStarted(code),
      t
    )
  }
  if (looksLikeSecretOrUrl(code)) return t("chat.cliProviderLoginFailed")
  return code
}
