/**
 * 把探测结果折成 UI 状态。
 */
import type { AgentToolDetectStatus } from "@enjoy-agents/ipc-contract"
import type { AgentToolPreset } from "../presets.ts"
import type { ProbeResult } from "./probe.ts"

export function detectStatusFor(preset: AgentToolPreset, probe: ProbeResult): AgentToolDetectStatus {
  if (preset.skillOnly) return "skillOnly"
  if (preset.comingSoon && !preset.available) return "comingSoon"
  if (preset.id === "enjoy-local") return "ready"
  if (probe.found) return "ready"
  return "missing"
}
