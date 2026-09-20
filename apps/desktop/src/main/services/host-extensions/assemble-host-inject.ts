/**
 * 把能力 + 已启用/已投影名收成 HostInjectSnapshot。纯函数，单测不碰 SQLite。
 */
import type { HostInjectSkip, HostInjectSnapshot } from "@enjoy-agents/ipc-contract/host-inject"
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
  const mcpEnabled = uniqueNames(input.mcpEnabled)
  const skillEnabled = uniqueNames(input.skillEnabled)
  if (cap.hostMcp === "none") {
    return {
      runtimeId: input.runtimeId,
      mcp: {
        capability: "none",
        enabled: mcpEnabled,
        injected: [],
        skipped: mcpEnabled.map((name) => ({ name, reason: "unsupported" }))
      },
      skills: assembleSkillsLane(cap.hostSkills, skillEnabled, input)
    }
  }
  return {
    runtimeId: input.runtimeId,
    mcp: {
      capability: cap.hostMcp,
      enabled: mcpEnabled,
      injected: uniqueNames(input.mcpInjected),
      skipped: [...(input.mcpSkipped ?? [])]
    },
    skills: assembleSkillsLane(cap.hostSkills, skillEnabled, input)
  }
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
    injected: uniqueNames(input.skillInjected),
    skipped: [...(input.skillSkipped ?? [])],
    mounted: Boolean(input.skillsMounted)
  }
}

function uniqueNames(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const name = raw.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
    if (out.length >= 128) break
  }
  return out
}
