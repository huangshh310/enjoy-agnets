/**
 * BoardUI AI Profile 领域模型：画像、KPI、热力图与图表时序点。
 */
import type { UserProfileData } from "../account.types"
import type { BlobatarConfig } from "../../avatar/blobatar.types"

/** Canvas UI 封面仅保留四套官方着色器。 */
export type GlassCoverPreset = "glyph-rain" | "hex-float" | "retro-dither" | "frost"

/** 拓展后的全量用户画像档案。 */
export interface ExtendedUserProfile extends UserProfileData {
  /** 社交代号，例如 "@enjoy-engineer" */
  handle: string
  /** 可选徽章；没有真实计划时不渲染 */
  badgeText?: string
  /** Glass 封面预设 */
  coverPreset: GlassCoverPreset
  /** Blobatar 确定性几何头像配置 */
  blobatarConfig: BlobatarConfig
}

/** 个人成就与 KPI。yearSpendUsd 无真实费用来源时为 null。 */
export interface ProfileMetricSummary {
  contributionsCount: number
  contributionsGrowth: string
  yearSpendUsd: number | null
  lifetimeTokens: string
  peakTokens: string
  longestTaskDuration: string
  topStreakDays: string
}

export type HeatmapPeriod = "weekly" | "monthly" | "yearly"

export interface HeatmapCellData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface AgentBarPoint {
  id: string
  label: string
  count: number
  isToday?: boolean
}

export interface TokenTrendPoint {
  id: string
  label: string
  tokens: number
  formatted: string
}
