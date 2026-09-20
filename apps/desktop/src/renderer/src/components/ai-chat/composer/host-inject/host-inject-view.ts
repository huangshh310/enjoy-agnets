/**
 * Composer 开流旁诚实态：已启用 / 已注入 / 引擎不支持。禁止空绿成功。
 */
import type { HostInjectSkip, HostInjectSnapshot } from "@enjoy-agents/ipc-contract"
import { capabilitiesFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"

/** 文案锁：0 的一侧不写，避免「已启用 0 / 已注入 0」。 */
export function hostInjectCountLane(
  mcp: number,
  skills: number
): "both" | "mcp" | "skills" | "none" {
  if (mcp > 0 && skills > 0) return "both"
  if (mcp > 0) return "mcp"
  if (skills > 0) return "skills"
  return "none"
}

export type HostInjectBarView =
  | { kind: "hidden" }
  | { kind: "enabled"; mcp: number; skills: number }
  | {
      kind: "injected"
      mcp: number
      skills: number
      names: string[]
      skipped: HostInjectSkip[]
    }
  | { kind: "failed"; skipped: HostInjectSkip[] }
  | { kind: "unsupported"; mcp: boolean; skills: boolean }

export function hostInjectBarView(input: {
  runtimeId: string
  snapshot?: Pick<HostInjectSnapshot, "runtimeId" | "mcp" | "skills"> | null
  enabledMcp: number
  enabledSkills: number
}): HostInjectBarView {
  const same = input.snapshot?.runtimeId === input.runtimeId
  const cap = capabilitiesFor(input.runtimeId)
  const mcpCap = same ? input.snapshot!.mcp.capability : cap.hostMcp
  const skillsCap = same ? input.snapshot!.skills.capability : cap.hostSkills
  const mcpEnabled = same ? input.snapshot!.mcp.enabled.length : input.enabledMcp
  const skillsEnabled = same ? input.snapshot!.skills.enabled.length : input.enabledSkills
  const mcpUnsupported = mcpCap === "none" && mcpEnabled > 0
  const skillsUnsupported = skillsCap === "none" && skillsEnabled > 0
  if (mcpUnsupported || skillsUnsupported) {
    return { kind: "unsupported", mcp: mcpUnsupported, skills: skillsUnsupported }
  }
  if (same) {
    return viewFromSnapshot(input.snapshot!)
  }
  if (mcpEnabled + skillsEnabled > 0) {
    return { kind: "enabled", mcp: mcpEnabled, skills: skillsEnabled }
  }
  return { kind: "hidden" }
}

function viewFromSnapshot(snapshot: Pick<HostInjectSnapshot, "mcp" | "skills">): HostInjectBarView {
  const names = [...snapshot.mcp.injected, ...snapshot.skills.injected]
  const skipped = [...snapshot.mcp.skipped, ...snapshot.skills.skipped].filter(
    (item) => item.reason !== "unsupported"
  )
  if (names.length > 0) {
    return {
      kind: "injected",
      mcp: snapshot.mcp.injected.length,
      skills: snapshot.skills.injected.length,
      names,
      skipped
    }
  }
  if (skipped.length > 0) {
    return { kind: "failed", skipped }
  }
  return { kind: "hidden" }
}
