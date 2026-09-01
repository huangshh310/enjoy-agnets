/**
 * Agent Limits Card 类型定义：包含 Token 分桶、上下文窗口容量计算与速率限制模型。
 */

/** Token 分桶类别 */
export type TokenBucketCategory =
  | "messages"
  | "system_tools"
  | "mcp_tools"
  | "skills"
  | "system_prompt"
  | "memory_files"
  | "custom_agents"
  | "mcp_deferred"
  | "system_deferred"
  | "free_space"

/** 单个 Token 桶分项数据 */
export interface TokenBucketItem {
  id: string
  category: TokenBucketCategory
  label: string
  tokens: number
  percentage: number
  colorClass: string
  barColor: string
  deferred?: boolean
  childrenCount?: number
  children?: Array<{
    id: string
    name: string
    tokens: number
    type?: string
  }>
}

/** 速率限制/计划限额条目 */
export interface PlanLimitItem {
  id: string
  label: string
  resetText: string
  percentage: number
  activeTokens?: number
  maxTokens?: number
  barColorClass?: string
}

/** 上下文计算综合结果 */
export interface ContextWindowData {
  usedTokens: number
  maxTokens: number
  usedPercentage: number
  freeTokens: number
  buckets: TokenBucketItem[]
}

/** Agent Limits Card Props */
export interface AgentLimitsCardProps {
  usedTokens?: number
  maxTokens?: number
  modelId?: string
  modelLabel?: string
  planTitle?: string
  planHref?: string
  onManagePlan?: () => void
  defaultExpanded?: boolean
  className?: string
}
