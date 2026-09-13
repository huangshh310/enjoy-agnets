/**
 * 界面强调色：blue (Signal Blue) | emerald (Terminal Green) | amber (Claude Amber) | purple (Cosmic Purple) | slate (Graphite Slate)
 * 动态同步到 document.documentElement 的 data-accent 与 CSS 变量。
 */
import { useSyncExternalStore } from "react"

export type ThemeAccent = "blue" | "emerald" | "amber" | "purple" | "slate"

export interface ThemeAccentConfig {
  id: ThemeAccent
  name: string
  color: string
  c500: string
  c600: string
}

export const THEME_ACCENTS: ThemeAccentConfig[] = [
  { id: "blue", name: "Signal Blue", color: "#3b82f6", c500: "#3b82f6", c600: "#2563eb" },
  { id: "emerald", name: "Terminal Green", color: "#10b981", c500: "#10b981", c600: "#059669" },
  { id: "amber", name: "Claude Amber", color: "#f59e0b", c500: "#f59e0b", c600: "#d97706" },
  { id: "purple", name: "Cosmic Purple", color: "#8b5cf6", c500: "#8b5cf6", c600: "#7c3aed" },
  { id: "slate", name: "Graphite Slate", color: "#64748b", c500: "#64748b", c600: "#475569" }
]

export const THEME_ACCENT_STORAGE_KEY = "boardui:accent"
export const THEME_ACCENT_CHANGE_EVENT = "boardui:accent-change"

export function parseThemeAccent(value: string | null): ThemeAccent {
  if (value === "emerald" || value === "amber" || value === "purple" || value === "slate") {
    return value
  }
  return "blue"
}

function getStoredAccent(): ThemeAccent {
  if (typeof window === "undefined") return "blue"
  try {
    return parseThemeAccent(localStorage.getItem(THEME_ACCENT_STORAGE_KEY))
  } catch {
    return "blue"
  }
}

export function applyThemeAccent(accent: ThemeAccent): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(THEME_ACCENT_STORAGE_KEY, accent)
  } catch {
    // 存储受限兜底
  }

  const config = THEME_ACCENTS.find((a) => a.id === accent) ?? THEME_ACCENTS[0]
  document.documentElement.setAttribute("data-accent", accent)
  document.documentElement.style.setProperty("--color-accent-500", config.c500)
  document.documentElement.style.setProperty("--color-accent-600", config.c600)
  window.dispatchEvent(new CustomEvent(THEME_ACCENT_CHANGE_EVENT, { detail: accent }))
}

/** 在 App 启动时执行一次 */
export function initThemeAccent(): ThemeAccent {
  const current = getStoredAccent()
  if (typeof window !== "undefined") {
    applyThemeAccent(current)
  }
  return current
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined
  const listener = () => callback()
  window.addEventListener(THEME_ACCENT_CHANGE_EVENT, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(THEME_ACCENT_CHANGE_EVENT, listener)
    window.removeEventListener("storage", listener)
  }
}

export function useThemeAccent(): ThemeAccent {
  return useSyncExternalStore(subscribe, getStoredAccent, () => "blue")
}
