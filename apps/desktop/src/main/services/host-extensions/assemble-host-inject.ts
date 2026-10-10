/**
 * 把能力 + 已启用/已投影名收成 HostInjectSnapshot。纯函数，单测不碰 SQLite。
 */
import {
  clampHostInjectSnapshot,
  clampHostNames,
  type HostInjectSkip,
  type HostInjectSnapshot
} from "@enjoy-agents/ipc-contract/host-inject"
import { capabilitiesFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"

export function assembleHostInject(input: {
  runtimeId: string
  mcpEnabled: readonly string[]
  mcpInjected: readonly string[]
  mcpSkipped?: readonly HostInjectSkip[]
  skillEnabled: readonly string[]
  skillInjected: readonly string[]
  skillSkipped?: readonly HostInjectSkip[]
  skillsMounted?: boolean
}): HostInjectSnapshot {
  const cap = capabilitiesFor(input.runtimeId)
  const mcpEnabled = clampHostNames(input.mcpEnabled)
  const skillEnabled = clampHostNames(input.skillEnabled)
  if (cap.hostMcp === "none") {
    return clampHostInjectSnapshot({
      runtimeId: input.runtimeId,
      mcp: {
        capability: "none",
        enabled: mcpEnabled,
        injected: [],
        skipped: mcpEnabled.map((name) => ({ name, reason: "unsupported" }))
      },
      skills: assembleSkillsLane(cap.hostSkills, skillEnabled, input)
    })
  }
  return clampHostInjectSnapshot({
    runtimeId: input.runtimeId,
    mcp: {
      capability: cap.hostMcp,
      enabled: mcpEnabled,
      injected: clampHostNames(input.mcpInjected),
      skipped: [...(input.mcpSkipped ?? [])]
    },
    skills: assembleSkillsLane(cap.hostSkills, skillEnabled, input)
  })
}

function assembleSkillsLane(
  capability: HostInjectSnapshot["skills"]["capability"],
  enabled: string[],
  input: {
    skillInjected: readonly string[]
    skillSkipped?: readonly HostInjectSkip[]
    skillsMounted?: boolean
  }
): HostInjectSnapshot["skills"] {
  if (capability === "none") {
    return {
      capability: "none",
      enabled,
      injected: [],
      skipped: enabled.map((name) => ({ name, reason: "unsupported" })),
      mounted: false
    }
  }
  return {
    capability,
    enabled,
    injected: clampHostNames(input.skillInjected),
    skipped: [...(input.skillSkipped ?? [])],
    mounted: Boolean(input.skillsMounted)
  }
}

