/**
 * 开流时从 Enjoy SoT 收齐 MCP / Skills 投影与快照。
 */
import { takeSkillCatalog, type SkillItem } from "@enjoy-agents/ipc-contract/skills-catalog"
import type { HostInjectSkip, HostInjectSnapshot } from "@enjoy-agents/ipc-contract/host-inject"
import { assembleHostInject } from "./assemble-host-inject.ts"
import type { HostMcpReport } from "./host-mcp-report.ts"

export function snapshotFromReports(input: {
  runtimeId: string
  mcp: Pick<HostMcpReport, "enabled" | "injected" | "skipped">
  skills: readonly SkillItem[]
  workspaceRoot?: string
  skillsMounted?: boolean
}): HostInjectSnapshot {
  const taken = takeSkillCatalog(input.skills, { workspaceRoot: input.workspaceRoot })
  const enabled = uniqueSkillNames(input.skills)
  const injected = uniqueSkillNames(taken.items)
  const skipped: HostInjectSkip[] = enabled
    .filter((name) => !injected.includes(name))
    .map((name) => ({ name, reason: "truncated" }))
  return assembleHostInject({
    runtimeId: input.runtimeId,
    mcpEnabled: input.mcp.enabled,
    mcpInjected: input.mcp.injected,
    mcpSkipped: input.mcp.skipped,
    skillEnabled: enabled,
    skillInjected: injected,
    skillSkipped: skipped,
    skillsMounted: input.skillsMounted
  })
}

function uniqueSkillNames(skills: readonly Pick<SkillItem, "name">[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const skill of skills) {
    const name = skill.name.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}
