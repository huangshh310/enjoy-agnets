/**
 * 画布昼夜主题：跟随应用 html.dark，对齐 infinite-canvas 的 canvasThemes。
 */
import { useEffect, useState } from "react"
import { canvasThemes, type CanvasColorTheme } from "../lib/canvas-theme"

function readTheme(): CanvasColorTheme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function useCanvasColorTheme(): CanvasColorTheme {
  const [theme, setTheme] = useState<CanvasColorTheme>(readTheme)
  useEffect(() => {
    const sync = () => setTheme(readTheme())
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return theme
}

export function useCanvasTheme() {
  return canvasThemes[useCanvasColorTheme()]
}
