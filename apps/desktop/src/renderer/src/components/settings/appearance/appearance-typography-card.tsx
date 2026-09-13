/**
 * 外观设置 → 界面排版与全局缩放：
 * 控制全局 UI 缩放比例（85% ~ 125%）与代码/终端字号（12px ~ 18px）。
 */
import { useEffect, useState } from "react"
import { SettingsCard, SettingsRow } from "../settings-row"

const ZOOM_STORAGE_KEY = "enjoy:ui-zoom"
const CODE_FONT_STORAGE_KEY = "enjoy:code-font-size"

export function AppearanceTypographyCard() {
  const [zoom, setZoom] = useState(() => {
    try {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY)
      return saved ? Number(saved) : 100
    } catch {
      return 100
    }
  })

  const [codeFontSize, setCodeFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem(CODE_FONT_STORAGE_KEY)
      return saved ? Number(saved) : 13
    } catch {
      return 13
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom))
      const scale = zoom / 100
      // 动态更新应用缩放系数
      document.documentElement.style.setProperty("--app-ui-zoom", String(scale))
    } catch {
      // ignore
    }
  }, [zoom])

  useEffect(() => {
    try {
      localStorage.setItem(CODE_FONT_STORAGE_KEY, String(codeFontSize))
      document.documentElement.style.setProperty("--code-font-size", `${codeFontSize}px`)
    } catch {
      // ignore
    }
  }, [codeFontSize])

  const zoomOptions = [85, 90, 100, 110, 120]
  const fontSizes = [12, 13, 14, 15, 16]

  return (
    <SettingsCard title="界面缩放与代码排版">
      <SettingsRow
        title="全局界面缩放"
        description="调节全屏 UI 元素、侧栏与对话舞台的整体缩放比例，适配 2K/4K 高分屏与小屏笔记本。"
      >
        <div className="flex items-center gap-1.5 rounded-xl border border-separator-border/80 bg-background-secondary-default/50 p-1">
          {zoomOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setZoom(opt)}
              className={`rounded-lg px-2.5 py-1 font-mono text-caption-2-medium transition-all cursor-pointer ${
                zoom === opt
                  ? "bg-background-primary-default text-accent-600 dark:text-accent-400 font-bold shadow-xs"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {opt}%
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow
        title="代码与终端字号"
        description="设置代码 Diff 审阅、Markdown 代码块与内置终端的基准字体大小。"
      >
        <div className="flex items-center gap-1.5 rounded-xl border border-separator-border/80 bg-background-secondary-default/50 p-1">
          {fontSizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setCodeFontSize(size)}
              className={`rounded-lg px-2.5 py-1 font-mono text-caption-2-medium transition-all cursor-pointer ${
                codeFontSize === size
                  ? "bg-background-primary-default text-accent-600 dark:text-accent-400 font-bold shadow-xs"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {size}px
            </button>
          ))}
        </div>
      </SettingsRow>
    </SettingsCard>
  )
}
