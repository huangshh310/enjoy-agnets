/**
 * L3 分桶：与 Context 检查器同一套估算，按当前 runtime 投影。
 * 禁止 720 / 260 之类假地板。
 */
import type { McpServer, ProjectRuleItem, SkillItem } from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type {
  ContextChipEstimate,
  ContextWindowStats
} from "../right-pane/views/context/context-inspector.types"
import { estimateContextWindowStats } from "../right-pane/views/context/context-token-estimator"
import type { ContextWindowData, TokenBucketItem } from "./agent-limits.types"

const BUCKET_STYLE: Record<string, { category: TokenBucketItem["category"]; colorClass: string }> = {
  messages: { category: "messages", colorClass: "bg-accent-500 text-accent-500" },
  system: { category: "system_prompt", colorClass: "bg-emerald-500 text-emerald-500" },
  mcp: { category: "mcp_tools", colorClass: "bg-chart-3 text-chart-3" },
  skills: { category: "skills", colorClass: "bg-amber-500 text-amber-500" },
  memory: { category: "memory_files", colorClass: "bg-chart-4 text-chart-4" }
}

export { formatTokens } from "./format-tokens"

/** 与 Context 视窗同一本账。 */
export function calculateContextWindowUsage(
  messages: ThreadMessage[] = [],
  maxTokens = 0,
  liveMcpServers: McpServer[] = [],
  liveSkills: SkillItem[] = [],
  liveRules: ProjectRuleItem[] = [],
  customInstructions = "",
  runtimeId = "enjoy-local",
  chips: ContextChipEstimate[] = []
): ContextWindowData {
  return contextWindowDataFromStats(
    estimateContextWindowStats(
      messages,
      maxTokens,
      liveMcpServers,
      liveRules,
      liveSkills,
      chips,
      customInstructions,
      runtimeId
    )
  )
}

/** 把检查器视窗账映射成 Limits 卡。 */
export function contextWindowDataFromStats(stats: ContextWindowStats): ContextWindowData {
  const buckets: TokenBucketItem[] = stats.buckets.map((bucket) => {
    const style = BUCKET_STYLE[bucket.id] ?? {
      category: "system_prompt" as const,
      colorClass: "bg-chart-2 text-chart-2"
    }
    return {
      id: bucket.id,
      category: style.category,
      label: bucket.id,
      tokens: bucket.tokens,
      percentage: pctOf(bucket.tokens, stats.maxTokens),
      colorClass: style.colorClass,
      barColor: ""
    }
  })
  const freeTokens = stats.maxTokens > 0 ? Math.max(0, stats.maxTokens - stats.usedTokens) : 0
  buckets.push({
    id: "free_space",
    category: "free_space",
    label: "Free space",
    tokens: freeTokens,
    percentage: stats.maxTokens > 0 ? Math.max(0, Number((100 - stats.usagePercent).toFixed(1))) : 0,
    colorClass: "bg-background-secondary-hover text-text-tertiary",
    barColor: ""
  })
  return {
    usedTokens: stats.usedTokens,
    maxTokens: stats.maxTokens,
    usedPercentage: stats.usagePercent,
    freeTokens,
    buckets
  }
}

function pctOf(tokens: number, maxTokens: number): number {
  return maxTokens > 0 ? Math.round((tokens / maxTokens) * 1000) / 10 : 0
}
