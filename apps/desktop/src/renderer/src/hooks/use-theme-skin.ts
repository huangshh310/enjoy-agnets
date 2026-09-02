/**
 * 界面皮肤：classic | glass | ink | sketch。
 * 唯一接口是 document.documentElement 的 data-skin，CSS 按皮肤文件消费。
 */
import { useSyncExternalStore } from "react"

export type ThemeSkin = "classic" | "glass" | "ink" | "sketch"

export const THEME_SKIN_STORAGE_KEY = "boardui:skin"
export const THEME_SKIN_CHANGE_EVENT = "boardui:skin-change"

export function parseThemeSkin(value: string | null): ThemeSkin {
  if (value === "glass" || value === "ink" || value === "sketch") return value
  return "classic"
}

function getStoredSkin(): ThemeSkin {
  if (typeof window === "undefined") return "classic"
  try {
    return parseThemeSkin(localStorage.getItem(THEME_SKIN_STORAGE_KEY))
  } catch {
    return "classic"
  }
}

export function applyThemeSkin(skin: ThemeSkin): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(THEME_SKIN_STORAGE_KEY, skin)
  } catch {
    // 存储受限兜底
  }

  document.documentElement.setAttribute("data-skin", skin)
  window.dispatchEvent(new CustomEvent(THEME_SKIN_CHANGE_EVENT, { detail: skin }))
}

/** 在 App 启动时执行一次；首屏无闪烁依赖 index.html 内联脚本 */
export function initThemeSkin(): ThemeSkin {
  const current = getStoredSkin()
  if (typeof window !== "undefined") {
    document.documentElement.setAttribute("data-skin", current)
  }
  return current
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined
  const listener = () => callback()
  window.addEventListener(THEME_SKIN_CHANGE_EVENT, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(THEME_SKIN_CHANGE_EVENT, listener)
    window.removeEventListener("storage", listener)
  }
}

export function useThemeSkin(): ThemeSkin {
  return useSyncExternalStore(subscribe, getStoredSkin, () => "classic")
}
