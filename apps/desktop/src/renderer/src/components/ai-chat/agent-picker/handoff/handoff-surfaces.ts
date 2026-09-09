/**
 * 交接确认卡与「已交接」微条互斥：开卡不画条，确认后只留可关闭微条。
 */
import type { EngineHandoffBanner, EngineSwitchPhase } from "./plan-composer-switch.types"

export function handoffSurfaces(
  phase: EngineSwitchPhase,
  banner: EngineHandoffBanner | null
): { showCard: boolean; showBanner: boolean } {
  const showCard = phase !== "idle"
  return { showCard, showBanner: Boolean(banner) && !showCard }
}
