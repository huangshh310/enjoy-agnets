/**
 * L3 上下文分桶明细。不含伪造计划额度 / 5 小时条。
 * 与 Context / SessionMeter 共用检查器视窗账。
 */
import { useState } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { cx } from "@/utils/cx"
import { useT, type TranslateFn } from "@renderer/i18n"
import { useContextInspectorData } from "../right-pane/views/context/use-context-inspector-data"
import type { AgentLimitsCardProps, TokenBucketItem } from "./agent-limits.types"
import { contextWindowDataFromStats } from "./agent-limits-calculator"
import { ContextWindowBar } from "./context-window-bar"
import { TokenBreakdownList } from "./token-breakdown-list"

export function AgentLimitsCard({
  usedTokens,
  maxTokens,
  defaultExpanded = true,
  className
}: AgentLimitsCardProps) {
  const t = useT()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const workspaceId = useChatStore((state) => state.workspaceId)
  const data = contextWindowDataFromStats(useContextInspectorData(workspaceId).tokenStats)
  if (usedTokens !== undefined) data.usedTokens = usedTokens
  if (maxTokens !== undefined) data.maxTokens = maxTokens
  data.buckets = withLocalizedBucketLabels(data.buckets, t)

  return (
    <div
      className={cx(
        "flex w-[360px] flex-col gap-3.5 rounded-2xl border border-border-button-default bg-background-primary-default p-4 text-text-primary shadow-dropdown sm:w-[380px]",
        className
      )}
    >
      <ContextWindowBar data={data} isExpanded={isExpanded} onToggleExpand={() => setIsExpanded(!isExpanded)} />
      {isExpanded ? <TokenBreakdownList buckets={data.buckets} /> : null}
    </div>
  )
}

const BUCKET_LABEL_KEYS: Record<string, string> = {
  messages: "chat.limitsMessages",
  system: "chat.limitsSystemPrompt",
  system_prompt: "chat.limitsSystemPrompt",
  mcp: "chat.limitsMcpTools",
  mcp_tools: "chat.limitsMcpTools",
  skills: "chat.limitsSkills",
  memory: "chat.limitsAlwaysOnRules",
  memory_files: "chat.limitsAlwaysOnRules",
  free_space: "chat.limitsFreeSpace"
}

function withLocalizedBucketLabels(buckets: TokenBucketItem[], t: TranslateFn): TokenBucketItem[] {
  return buckets.map((bucket) => {
    const key = BUCKET_LABEL_KEYS[bucket.id]
    return key ? { ...bucket, label: t(key) } : bucket
  })
}
