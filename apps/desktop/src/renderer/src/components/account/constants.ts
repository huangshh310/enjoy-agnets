/**
 * 个人中心封面预设与热力色阶。颜色只走 BoardUI 语义 token。
 */
import type { GlassCoverPreset, HeatmapCellData } from "./types/profile.types"

export const GLASS_COVER_PRESETS: Array<{
  id: GlassCoverPreset
  /** i18n 键：pages.account.cover.<labelKey>.label / desc */
  labelKey: string
}> = [
  { id: "glyph-rain", labelKey: "glyphRain" },
  { id: "hex-float", labelKey: "hexFloat" },
  { id: "retro-dither", labelKey: "retroDither" },
  { id: "frost", labelKey: "frost" }
]

/**
 * 有数据的最浅一档对卡片 ≥ 3:1、相邻两档亮度比 ≥ 1.3（五种强调色、亮暗都算过，见 lib/accent-contrast.test.ts）。
 * 色值是每种强调色单独的一套（theme.css 里的 --color-heat-1…4），亮色由浅到深、暗色由暗到亮。
 */
export const HEATMAP_LEVEL_CLASSES: Record<HeatmapCellData["level"], string> = {
  0: "bg-background-secondary-default border border-separator-border/80",
  1: "bg-heat-1",
  2: "bg-heat-2",
  3: "bg-heat-3",
  4: "bg-heat-4"
}

/** BoardUI 环比胶囊：涨用 success/accent，跌用 error，0% 用次级灰。 */
export function growthBadgeClass(label: string, variant: "success" | "accent"): string {
  if (label.startsWith("-")) return "bg-text-error-primary/10 text-text-error-primary"
  if (label === "0%") return "bg-background-secondary-default text-text-tertiary"
  return variant === "success"
    ? "bg-state-success-text/10 text-state-success-text"
    : "bg-accent-500/10 text-accent-500"
}
