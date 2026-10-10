/**
 * Enjoy 宿主 Skills / MCP 本轮注入快照。
 * 计数只报已启用 / 已注入；能力为 none 时 injected 必须为空。
 */
import { z } from "zod"

export const HostInjectSkipReason = z.enum([
  "untrusted",
  "denied",
  "unresolved",
  "not-connected",
  "unsupported",
  "truncated"
])
export type HostInjectSkipReason = z.infer<typeof HostInjectSkipReason>

export const HOST_INJECT_NAME_MAX = 120
export const HOST_INJECT_LIST_MAX = 128

export const HostInjectSkip = z.object({
  name: z.string().max(HOST_INJECT_NAME_MAX),
  reason: HostInjectSkipReason
})
export type HostInjectSkip = z.infer<typeof HostInjectSkip>

const NameList = z.array(z.string().max(HOST_INJECT_NAME_MAX)).max(HOST_INJECT_LIST_MAX)
const SkipList = z.array(HostInjectSkip).max(HOST_INJECT_LIST_MAX)

export const HostInjectMcpLane = z.object({
  capability: z.enum(["local-tools", "acp-passthrough", "none"]),
  enabled: NameList,
  injected: NameList,
  skipped: SkipList
})
export type HostInjectMcpLane = z.infer<typeof HostInjectMcpLane>

export const HostInjectSkillsLane = z.object({
  capability: z.enum(["catalog-tool", "catalog-prompt", "none"]),
  enabled: NameList,
  injected: NameList,
  skipped: SkipList,
  /** Grok `--plugin-dir` 只读挂载；SSH 为 false。 */
  mounted: z.boolean()
})
export type HostInjectSkillsLane = z.infer<typeof HostInjectSkillsLane>

export const HostInjectSnapshot = z.object({
  runtimeId: z.string().min(1),
  mcp: HostInjectMcpLane,
  skills: HostInjectSkillsLane
})
export type HostInjectSnapshot = z.infer<typeof HostInjectSnapshot>

export function emptyHostInjectLane<C extends string>(
  capability: C
): { capability: C; enabled: string[]; injected: string[]; skipped: HostInjectSkip[] } {
  return { capability, enabled: [], injected: [], skipped: [] }
}

export function clampHostName(name: string): string {
  return name.trim().slice(0, HOST_INJECT_NAME_MAX)
}

export function clampHostNames(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const name = clampHostName(raw)
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
    if (out.length >= HOST_INJECT_LIST_MAX) break
  }
  return out
}

export function clampHostSkips(skips: readonly HostInjectSkip[]): HostInjectSkip[] {
  const seen = new Set<string>()
  const out: HostInjectSkip[] = []
  for (const skip of skips) {
    const name = clampHostName(skip.name)
    if (!name) continue
    const key = `${name}\0${skip.reason}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name, reason: skip.reason })
    if (out.length >= HOST_INJECT_LIST_MAX) break
  }
  return out
}

export function clampHostInjectSnapshot(snapshot: HostInjectSnapshot): HostInjectSnapshot {
  return {
    runtimeId: snapshot.runtimeId,
    mcp: {
      capability: snapshot.mcp.capability,
      enabled: clampHostNames(snapshot.mcp.enabled),
      injected: snapshot.mcp.capability === "none" ? [] : clampHostNames(snapshot.mcp.injected),
      skipped: clampHostSkips(snapshot.mcp.skipped)
    },
    skills: {
      capability: snapshot.skills.capability,
      enabled: clampHostNames(snapshot.skills.enabled),
      injected: snapshot.skills.capability === "none" ? [] : clampHostNames(snapshot.skills.injected),
      skipped: clampHostSkips(snapshot.skills.skipped),
      mounted: snapshot.skills.mounted
    }
  }
}
