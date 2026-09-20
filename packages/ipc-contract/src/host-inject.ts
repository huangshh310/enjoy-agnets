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

export const HostInjectSkip = z.object({
  name: z.string().max(120),
  reason: HostInjectSkipReason
})
export type HostInjectSkip = z.infer<typeof HostInjectSkip>

const NameList = z.array(z.string().max(120)).max(128)
const SkipList = z.array(HostInjectSkip).max(128)

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
