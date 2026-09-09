/**
 * 上下文 Token 视窗与单轮性能：只折算已有字段，不编造 Cache / 系统地板。
 */
import { formatAlwaysOnRulePrompt } from "@enjoy-agents/ipc-contract/rules-always-on"
import { formatSkillCatalog } from "@enjoy-agents/ipc-contract/skills-catalog"
import type { McpServer, ProjectRuleItem, SkillItem, TelemetryMetric } from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import { CHARS_PER_TOKEN } from "@enjoy-agents/agent-core/compaction"
import type {
  ContextChipEstimate,
  ContextWindowStats,
  TokenSpectrumBucket,
  TurnPerformanceStats
} from "./context-inspector.types.ts"

const BUCKET_BARS: Record<TokenSpectrumBucket["id"], string> = {
  messages: "bg-accent-500",
  system: "bg-accent-500/40",
  mcp: "bg-amber-500",
  skills: "bg-emerald-500",
  memory: "bg-chart-2"
}

/** 字符数按 3.8 折算 token，空串为 0。 */
export function estimateCharTokens(chars: number): number {
  if (chars <= 0) return 0
  return Math.round(chars / CHARS_PER_TOKEN)
}

/** MCP 工具名 + 描述占用。契约没有 inputSchema，不按空工具编造地板。 */
export function estimateMcpSchemaTokens(server: McpServer): number {
  const tools = server.tools ?? []
  const chars = tools.reduce((sum, tool) => sum + tool.name.length + (tool.description?.length ?? 0), 0)
  return estimateCharTokens(chars)
}

export function estimateContextWindowStats(
  messages: ThreadMessage[] = [],
  maxTokens = 0,
  mcpServers: McpServer[] = [],
  rules: ProjectRuleItem[] = [],
  skills: SkillItem[] = [],
  chips: ContextChipEstimate[] = [],
  customInstructions = ""
): ContextWindowStats {
  const messageTokens = estimateCharTokens(sumMessageChars(messages))
  const systemTokens = estimateCharTokens(
    formatAlwaysOnRulePrompt(rules).length + customInstructions.trim().length
  )
  const mcpTokens = mcpServers
    .filter((server) => server.connected)
    .reduce((sum, server) => sum + estimateMcpSchemaTokens(server), 0)
  const skillsTokens = estimateCharTokens(formatSkillCatalog(skills).length)
  const memoryTokens = chips
    .filter((chip) => chip.enabled !== false)
    .reduce((sum, chip) => sum + estimateCharTokens(chip.snippet?.length ?? 0), 0)

  const usedTokens = messageTokens + systemTokens + mcpTokens + skillsTokens + memoryTokens
  const usagePercent = maxTokens > 0 ? Number(((usedTokens / maxTokens) * 100).toFixed(1)) : 0

  return {
    usedTokens,
    maxTokens,
    usagePercent,
    buckets: [
      bucket("messages", messageTokens),
      bucket("system", systemTokens),
      bucket("mcp", mcpTokens),
      bucket("skills", skillsTokens),
      bucket("memory", memoryTokens)
    ]
  }
}

export function estimateTurnPerformance(
  latestMetric: TelemetryMetric | null,
  messages: ThreadMessage[],
  isRunning: boolean
): TurnPerformanceStats {
  if (latestMetric) return fromMetric(latestMetric, isRunning)
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")
  const outputTokens = estimateCharTokens(lastAssistant?.content.length ?? 0)
  const durationMs = lastAssistant?.thoughtSeconds ? lastAssistant.thoughtSeconds * 1000 : 0
  const tokensPerSecond = durationMs > 0 ? Number((outputTokens / (durationMs / 1000)).toFixed(1)) : 0
  return { durationMs, ttfoMs: 0, tokensPerSecond, outputTokens, isLive: isRunning }
}

function sumMessageChars(messages: ThreadMessage[]): number {
  return messages.reduce((sum, message) => sum + message.content.length + (message.reasoning?.length ?? 0), 0)
}

function bucket(id: TokenSpectrumBucket["id"], tokens: number): TokenSpectrumBucket {
  return { id, tokens, barClass: BUCKET_BARS[id] }
}

function fromMetric(metric: TelemetryMetric, isRunning: boolean): TurnPerformanceStats {
  const durationMs = metric.durationMs ?? 0
  const outputTokens = metric.outputTokens ?? 0
  const tokensPerSecond =
    metric.tokensPerSecond ??
    (durationMs > 0 ? Number(((outputTokens / durationMs) * 1000).toFixed(1)) : 0)
  return {
    durationMs,
    ttfoMs: metric.ttfoMs ?? 0,
    tokensPerSecond,
    outputTokens,
    isLive: isRunning
  }
}
