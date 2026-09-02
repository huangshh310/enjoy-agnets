/**
 * 渲染进程 i18n 上下文：locale + t(path, vars)。
 */
import { createContext, useContext } from "react"
import { DEFAULT_LOCALE, type AppLocale, type LanguagePref } from "./locale"
import { translate } from "./lookup"

export type TranslateFn = (path: string, vars?: Record<string, string | number>) => string

export type I18nValue = {
  locale: AppLocale
  language: LanguagePref
  t: TranslateFn
}

export const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  language: "zh",
  t: (path) => path
})

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}

export function useT(): TranslateFn {
  return useI18n().t
}

export { translate }
