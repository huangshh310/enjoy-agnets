/**
 * 读 CLI 覆盖（settings KV）。从 agent-tools-vault 拆出来、只依赖 database：
 * 失败收口（fail-agent-pump）要读「这个引擎绑了哪份档案」，不能把 ACP / 引擎列表整串模块拉进来。
 */
import { z } from "zod"
import type { AgentToolOverride } from "./agent-tools-override-merge"
import { getSetting } from "./database"

export const AGENT_TOOL_OVERRIDES_KEY = "agentTools.overrides"

const OVERRIDE_SCHEMA = z.object({
  enabled: z.boolean().optional(),
  binaryPath: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
  modelId: z.string().optional(),
  providerId: z.string().optional(),
  useCustomProvider: z.boolean().optional()
})

export function readAgentToolOverrides(): Record<string, AgentToolOverride> {
  const raw = getSetting(AGENT_TOOL_OVERRIDES_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    // 逐条校验：单个坏条目丢弃，不报废整份覆盖。
    const out: Record<string, AgentToolOverride> = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const row = OVERRIDE_SCHEMA.safeParse(value)
      if (row.success) out[id] = row.data
    }
    return out
  } catch {
    return {}
  }
}
