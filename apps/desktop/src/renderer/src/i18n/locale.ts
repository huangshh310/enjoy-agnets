/**
 * 界面语言：偏好 auto/en/zh，解析结果只有 zh | en。
 * 默认中文；auto 识别失败也回落到中文。
 */
export type LanguagePref = "auto" | "en" | "zh"
export type AppLocale = "zh" | "en"

export const DEFAULT_LOCALE: AppLocale = "zh"
export const DEFAULT_LANGUAGE_PREF: LanguagePref = "zh"

export function resolveLocale(
  pref: LanguagePref | undefined,
  navigatorLanguage?: string
): AppLocale {
  if (pref === "en") return "en"
  if (pref === "zh") return "zh"
  const nav = (
    navigatorLanguage ??
    (typeof navigator === "undefined" ? DEFAULT_LOCALE : navigator.language)
  ).toLowerCase()
  if (nav.startsWith("zh")) return "zh"
  if (nav.startsWith("en")) return "en"
  return DEFAULT_LOCALE
}

export function htmlLang(locale: AppLocale): string {
  return locale === "zh" ? "zh-CN" : "en"
}

export function dateLocale(locale: AppLocale): string {
  return locale === "zh" ? "zh-CN" : "en-US"
}
