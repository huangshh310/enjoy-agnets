/**
 * Agent Limits Card 主卡片组件 (Agent Limits Widget)
 * 基于 BoardUI 规范构建，包含上下文 Token 分段彩条、可折叠分桶明细与计划速率限制。
 * 全量接入真实数据：Messages Token、MCP Servers、Skills、Project Rules 与 Telemetry Metrics。
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type {
  McpServer,
  ProjectRuleItem,
  SkillItem,
  TelemetryMetric
} from "@enjoy-agents/ipc-contract"
import { useChatStore } from "@renderer/stores/chat-store"
import { contextWindowForModel } from "@renderer/lib/model-context-window"
import { getIde, hasIde } from "@renderer/lib/ide"
import { cx } from "@/utils/cx"
import { useT, type TranslateFn } from "@renderer/i18n"
import type { AgentLimitsCardProps, TokenBucketItem } from "./agent-limits.types"
import {
  calculateContextWindowUsage,
  calculateRealPlanLimits
} from "./agent-limits-calculator"
import { ContextWindowBar } from "./context-window-bar"
import { PlanLimitsSection } from "./plan-limits-section"
import { TokenBreakdownList } from "./token-breakdown-list"

export function AgentLimitsCard({
  usedTokens,
  maxTokens,
  modelId,
  modelLabel,
  planTitle,
  planHref,
  onManagePlan,
  defaultExpanded = true,
  className
}: AgentLimitsCardProps) {
  const t = useT()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const storeMessages = useChatStore((state) => state.messages)
  const storeModelId = useChatStore((state) => state.modelId)
  const storeModelLabel = useChatStore((state) => state.modelLabel)
  const storeModels = useChatStore((state) => state.models)

  const activeModelId = modelId ?? storeModelId
  const activeModelLabel = modelLabel ?? storeModelLabel
  const defaultPlanTitle = activeModelLabel
    ? t("chat.rateLimits", { name: activeModelLabel })
    : t("chat.planLimits")

  // 1. 真实 MCP Server 与工具列表
  const mcpQuery = useQuery({
    queryKey: ["mcp-servers"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })

  // 2. 真实已安装技能包 (Skills)
  const skillsQuery = useQuery({
    queryKey: ["skills-list"],
    enabled: hasIde(),
    queryFn: () => getIde().skills.list() as Promise<SkillItem[]>
  })

  // 3. 真实项目规则 (Rules / AGENTS.md)
  const rulesQuery = useQuery({
    queryKey: ["rules-list"],
    enabled: hasIde(),
    queryFn: () => getIde().rules.list() as Promise<ProjectRuleItem[]>
  })

  // 4. 真实 Telemetry Metrics (用于计算 5 小时速率与周度用量)
  const metricsQuery = useQuery({
    queryKey: ["observability-metrics-limits"],
    enabled: hasIde(),
    queryFn: () => getIde().observability.metrics({ limit: 100 }) as Promise<TelemetryMetric[]>
  })

  // 5. 计算真实的上下文窗口用量与分桶
  const data = calculateContextWindowUsage(
    storeMessages,
    maxTokens ?? contextWindowForModel(storeModels, activeModelId) ?? 0,
    mcpQuery.data ?? [],
    skillsQuery.data ?? [],
    rulesQuery.data ?? []
  )
  data.buckets = withLocalizedBucketLabels(data.buckets, t)

  // 6. 计算真实的速率与周期限制
  const realLimits = calculateRealPlanLimits(metricsQuery.data ?? [])

  // 覆盖自定义 props (如有)
  if (usedTokens !== undefined) data.usedTokens = usedTokens
  if (maxTokens !== undefined) data.maxTokens = maxTokens

  return (
    <div
      className={cx(
        "flex w-[360px] sm:w-[380px] flex-col gap-3.5 rounded-2xl border border-border-button-default",
        "bg-background-primary-default p-4 text-text-primary shadow-dropdown transition-all duration-200 select-none",
        className
      )}
    >
      {/* 1. 上半部：上下文窗口分段彩条 */}
      <ContextWindowBar
        data={data}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      {/* 2. 展开分桶明细清单 (折叠生长动效) */}
      {isExpanded ? (
        <div className="animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <TokenBreakdownList buckets={data.buckets} />
        </div>
      ) : null}

      {/* 3. 下半部：真实计划配额与速率限制 */}
      <PlanLimitsSection
        limits={realLimits}
        planTitle={planTitle ?? defaultPlanTitle}
        planHref={planHref}
        onManagePlan={onManagePlan}
      />
    </div>
  )
}

/** 分桶展示名走 chat.limits*；子项名保持标识符。 */
const BUCKET_LABEL_KEYS: Record<string, string> = {
  messages: "chat.limitsMessages",
  system_tools: "chat.limitsSystemTools",
  mcp_tools: "chat.limitsMcpTools",
  skills: "chat.limitsSkills",
  system_prompt: "chat.limitsSystemPrompt",
  memory_files: "chat.limitsMemoryFiles",
  custom_agents: "chat.limitsCustomAgents",
  mcp_deferred: "chat.limitsMcpDeferred",
  system_deferred: "chat.limitsSystemDeferred",
  free_space: "chat.limitsFreeSpace"
}

function withLocalizedBucketLabels(buckets: TokenBucketItem[], t: TranslateFn): TokenBucketItem[] {
  return buckets.map((bucket) => {
    const key = BUCKET_LABEL_KEYS[bucket.id]
    return key ? { ...bucket, label: t(key) } : bucket
  })
}
