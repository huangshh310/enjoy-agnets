/**
 * 个人中心封面预设与热力色阶。颜色只走 BoardUI 语义 token。
 */
import type { GlassCoverPreset, HeatmapCellData } from "./types/profile.types"

export const GLASS_COVER_PRESETS: Array<{
  id: GlassCoverPreset
  label: string
  desc: string
}> = [
  {
    id: "glyph-rain",
    label: "代码雨 · Glyph Rain",
    desc: "数字代码粒子下落，游标扫过处激荡光芒"
  },
  {
    id: "hex-float",
    label: "悬浮棱镜 · Hex Float",
    desc: "3D 六边形倾斜悬浮地砖"
  },
  {
    id: "retro-dither",
    label: "复古点阵 · Retro Dither",
    desc: "8-bit 有序抖动透镜"
  },
  {
    id: "frost",
    label: "冰晶融冻 · Frost",
    desc: "触碰融化的冰面透镜"
  }
]

export const HEATMAP_LEVEL_CLASSES: Record<HeatmapCellData["level"], string> = {
  0: "bg-background-secondary-default border border-separator-border/80",
  1: "bg-accent-200",
  2: "bg-accent-400",
  3: "bg-accent-500",
  4: "bg-accent-700"
}

/** BoardUI 环比胶囊：涨用 success/accent，跌用 error，0% 用次级灰。 */
export function growthBadgeClass(label: string, variant: "success" | "accent"): string {
  if (label.startsWith("-")) return "bg-text-error-primary/10 text-text-error-primary"
  if (label === "0%") return "bg-background-secondary-default text-text-tertiary"
  return variant === "success"
    ? "bg-state-success-text/10 text-state-success-text"
    : "bg-accent-500/10 text-accent-500"
}
