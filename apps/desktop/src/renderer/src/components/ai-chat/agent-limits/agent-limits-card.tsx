/**
 * L3 上下文分桶明细。不含伪造计划额度 / 5 小时条。
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { McpServer, ProjectRuleItem, SkillItem } from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { contextWindowForModel } from "@renderer/lib/model-context-window"
import { getIde, hasIde } from "@renderer/lib/ide"
import { cx } from "@/utils/cx"
import { useT, type TranslateFn } from "@renderer/i18n"
import type { AgentLimitsCardProps, TokenBucketItem } from "./agent-limits.types"
import { calculateContextWindowUsage } from "./agent-limits-calculator"
import { ContextWindowBar } from "./context-window-bar"
import { TokenBreakdownList } from "./token-breakdown-list"

export function AgentLimitsCard({
  usedTokens,
  maxTokens,
  modelId,
  defaultExpanded = true,
  className
}: AgentLimitsCardProps) {
  const t = useT()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const storeMessages = useChatStore((state) => state.messages)
  const storeModelId = useChatStore((state) => state.modelId)
  const storeModels = useChatStore((state) => state.models)
  const activeModelId = modelId ?? storeModelId

  const mcpQuery = useQuery({
    queryKey: ["mcp-servers"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })
  const skillsQuery = useQuery({
    queryKey: ["skills-list"],
    enabled: hasIde(),
    queryFn: () => getIde().skills.list() as Promise<SkillItem[]>
  })
  const rulesQuery = useQuery({
    queryKey: ["rules-list"],
    enabled: hasIde(),
    queryFn: () => getIde().rules.list() as Promise<ProjectRuleItem[]>
  })

  const data = calculateContextWindowUsage(
    storeMessages,
    maxTokens ?? contextWindowForModel(storeModels, activeModelId) ?? 0,
    mcpQuery.data ?? [],
    skillsQuery.data ?? [],
    rulesQuery.data ?? []
  )
  data.buckets = withLocalizedBucketLabels(data.buckets, t)
  if (usedTokens !== undefined) data.usedTokens = usedTokens
  if (maxTokens !== undefined) data.maxTokens = maxTokens

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
  system_tools: "chat.limitsSystemTools",
  mcp_tools: "chat.limitsMcpTools",
  skills: "chat.limitsSkills",
  system_prompt: "chat.limitsSystemPrompt",
  memory_files: "chat.limitsMemoryFiles",
  mcp_deferred: "chat.limitsMcpDeferred",
  free_space: "chat.limitsFreeSpace"
}

function withLocalizedBucketLabels(buckets: TokenBucketItem[], t: TranslateFn): TokenBucketItem[] {
  return buckets.map((bucket) => {
    const key = BUCKET_LABEL_KEYS[bucket.id]
    return key ? { ...bucket, label: t(key) } : bucket
  })
}
