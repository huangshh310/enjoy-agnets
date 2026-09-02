/**
 * 从设置快照解析界面语言，注入 t()，并同步 <html lang>。
 * 设置未加载前默认中文。
 */
import { useEffect, useMemo, type ReactNode } from "react"
import { setUiLocale } from "@/i18n/ui-locale"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { en } from "./catalogs/en"
import { zh } from "./catalogs/zh"
import { htmlLang, resolveLocale, type LanguagePref } from "./locale"
import { translate } from "./lookup"
import { I18nContext } from "./use-i18n"

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = (useSettingsSnapshot().data?.preferences.language ?? "zh") as LanguagePref
  const locale = resolveLocale(language)
  const messages = locale === "en" ? en : zh

  useEffect(() => {
    document.documentElement.lang = htmlLang(locale)
    setUiLocale(locale)
  }, [locale])
  const value = useMemo(
    () => ({
      locale,
      language,
      t: (path: string, vars?: Record<string, string | number>) => translate(messages, path, vars)
    }),
    [locale, language, messages]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
