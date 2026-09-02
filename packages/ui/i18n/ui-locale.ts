/**
 * UI 包内默认文案的语言开关。渲染进程 I18nProvider 同步写入。
 * 默认中文。
 */
import { useSyncExternalStore } from "react"

export type UiLocale = "zh" | "en"

let locale: UiLocale = "zh"
const listeners = new Set<() => void>()

export function setUiLocale(next: UiLocale) {
  if (locale === next) return
  locale = next
  listeners.forEach((listener) => listener())
}

export function getUiLocale(): UiLocale {
  return locale
}

export function subscribeUiLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function uiT(zh: string, en: string): string {
  return locale === "en" ? en : zh
}

/** 订阅当前语言，让控件在 setUiLocale 后重渲染。 */
export function useUiLocale(): UiLocale {
  return useSyncExternalStore(subscribeUiLocale, getUiLocale, getUiLocale)
}
