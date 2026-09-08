/**
 * L3 上下文分桶类型。不含伪造计划额度。
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
  defaultExpanded?: boolean
  className?: string
}
