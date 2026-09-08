/**
 * comingSoon → available 静态门闩。M4 只按 OpenCode → Gemini → Pi 升级。
 * 只查 catalog / RuntimeCapabilities / preset 硬接线，不是现场 ACP initialize / handshake。
 * 禁止手改 available 假装已接线。
 */
import { capabilitiesFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"
import { catalogFor } from "./catalogs.ts"
import { agentToolPreset } from "./presets.ts"

export const M4_PROMOTION_ORDER = ["opencode", "gemini", "pi"] as const
export type M4PromotionId = (typeof M4_PROMOTION_ORDER)[number]

export type ComingSoonHardGates = {
  hasCatalog: boolean
  hasCapabilities: boolean
  /** preset 已标 acp-host 且非 skillOnly；不是现场 handshake。 */
  acpHostWired: boolean
  approvalWired: boolean
}

/** 静态硬接线：catalog + spawn + HMAC + preset.transport===acp-host。不探测 initialize。 */
export function comingSoonHardGates(id: string): ComingSoonHardGates {
  const catalog = catalogFor(id)
  const cap = capabilitiesFor(id)
  const preset = agentToolPreset(id)
  return {
    hasCatalog: Boolean(catalog && (catalog.installCommand || catalog.docsUrl || catalog.steps.length)),
    hasCapabilities: cap.spawn === true && cap.permissionUi === "enjoy-hmac",
    acpHostWired: Boolean(preset && preset.transport === "acp-host" && !preset.skillOnly),
    approvalWired: cap.permissionUi === "enjoy-hmac"
  }
}

export function canPromoteComingSoon(id: string): boolean {
  const gates = comingSoonHardGates(id)
  return gates.hasCatalog && gates.hasCapabilities && gates.acpHostWired && gates.approvalWired
}

/** 仅当静态硬接线全过才允许 available=true；未过必须 comingSoon。 */
export function availableAfterPromotion(id: string, currentlyAvailable: boolean): boolean {
  if (!M4_PROMOTION_ORDER.includes(id as M4PromotionId)) return currentlyAvailable
  return canPromoteComingSoon(id)
}
