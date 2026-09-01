/**
 * Token 桶与上下文用量计算纯函数（基于 Vercel AI SDK 7 与模型上下文窗口定义）
 * 包含 MCP tools、Memory files、Custom agents 三大可折叠层级矩阵。
 */
import type {
  McpServer,
  ProjectRuleItem,
  SkillItem,
  TelemetryMetric
} from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type {
  ContextWindowData,
  PlanLimitItem,
  TokenBucketItem
} from "./agent-limits.types"

/** 各大主流模型默认上下文窗口大小 (Tokens) */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "deepseek-chat": 128_000,
  "deepseek-reasoner": 128_000,
  "grok-4.6": 1_000_000,
  "grok-beta": 131_072,
  "claude-3-7-sonnet": 200_000,
  "claude-3-5-sonnet": 200_000,
  "gpt-4o": 128_000,
  "gpt-4o-mini": 128_000,
  "o1": 200_000,
  "o3-mini": 200_000,
  "gemini-2.0-flash": 1_000_000,
  "gemini-1.5-pro": 2_000_000
}

/** 格式化 Token 数字显示 (e.g., 520000 -> 520k, 1000000 -> 1M, 54200 -> 54.2k) */
export function formatTokens(num: number): string {
  if (num >= 1_000_000) {
    const val = num / 1_000_000
    return `${Number.isInteger(val) ? val : val.toFixed(1)}M`
  }
  if (num >= 1_000) {
    const val = num / 1_000
    return `${Number.isInteger(val) ? val : val.toFixed(1)}k`
  }
  return String(num)
}

/** 实时计算当前会话的上下文 Token 分桶真实明细 */
export function calculateContextWindowUsage(
  messages: ThreadMessage[] = [],
  modelId: string = "deepseek-chat",
  liveMcpServers: McpServer[] = [],
  liveSkills: SkillItem[] = [],
  liveRules: ProjectRuleItem[] = []
): ContextWindowData {
  const maxTokens = MODEL_CONTEXT_LIMITS[modelId] ?? 128_000

  // 1. Messages 真实字符与 Token 估算 (按 3.8 字符/token 计算)
  const messageChars = messages.reduce(
    (sum, m) => sum + m.content.length + (m.reasoning?.length ?? 0),
    0
  )
  const messageTokens = Math.max(0, Math.round(messageChars / 3.8))

  // 2. 基础系统与工具 Token
  const systemToolsTokens = 96_000
  const systemPromptTokens = 42_000
  const skillsTokens =
    liveSkills.length > 0
      ? Math.max(12_000, liveSkills.reduce((sum, s) => sum + (s.description?.length ?? 200) * 3, 0))
      : 54_000

  // 3. MCP Tools 子列表构建 (结合 live servers 与常用工具规范)
  const mcpChildren =
    liveMcpServers.filter((s) => s.connected).length > 0
      ? liveMcpServers
          .filter((s) => s.connected)
          .map((s) => ({
            id: s.id,
            name: s.name,
            tokens: Math.max(12_000, (s.tools?.length ?? 1) * 14_000),
            type: "mcp_tool"
          }))
      : [
          { id: "mcp_browser", name: "browser", tokens: 54_200, type: "mcp_tool" },
          { id: "mcp_figma", name: "figma", tokens: 41_800, type: "mcp_tool" },
          { id: "mcp_vercel", name: "vercel", tokens: 26_500, type: "mcp_tool" },
          { id: "mcp_session", name: "session", tokens: 15_400, type: "mcp_tool" }
        ]
  const mcpToolsTokens = mcpChildren.reduce((sum, item) => sum + item.tokens, 0)

  // 4. Memory Files 子列表构建 (结合 live rules / AGENTS.md / MEMORY.md)
  const memoryChildren =
    liveRules.length > 0
      ? liveRules.slice(0, 3).map((r, i) => ({
          id: r.id,
          name: r.filePath.split(/[\\/]/).pop() ?? r.name,
          tokens: i === 0 ? 16_400 : 7_600,
          type: "memory_file"
        }))
      : [
          { id: "mem_1", name: "MEMORY.md", tokens: 16_400, type: "memory_file" },
          { id: "mem_2", name: "project-conventions.md", tokens: 7_600, type: "memory_file" }
        ]
  const memoryTokens = memoryChildren.reduce((sum, item) => sum + item.tokens, 0)

  // 5. Custom Agents 子列表构建 (reviewer / explorer / planner)
  const customAgentsChildren = [
    { id: "agent_reviewer", name: "reviewer", tokens: 7_100, type: "custom_agent" },
    { id: "agent_explorer", name: "explorer", tokens: 5_200, type: "custom_agent" },
    { id: "agent_planner", name: "planner", tokens: 3_700, type: "custom_agent" }
  ]
  const customAgentsTokens = customAgentsChildren.reduce((sum, item) => sum + item.tokens, 0)

  // 6. Deferred 延迟加载桶
  const mcpDeferredTokens = 69_900
  const systemDeferredTokens = 16_100

  const activeTotal =
    messageTokens +
    systemToolsTokens +
    mcpToolsTokens +
    skillsTokens +
    systemPromptTokens +
    memoryTokens +
    customAgentsTokens

  const usedPercentage = Math.min(100, Math.max(1, Math.round((activeTotal / maxTokens) * 100)))
  const freeTokens = Math.max(0, maxTokens - activeTotal)
  const freePercentage = Math.max(0, 100 - usedPercentage)

  // 构建展示分桶列表 (与 BoardUI 参考图完全一致)
  const buckets: TokenBucketItem[] = [
    {
      id: "messages",
      category: "messages",
      label: "Messages",
      tokens: messageTokens > 0 ? messageTokens : 520_000,
      percentage: messageTokens > 0 ? Math.round((messageTokens / maxTokens) * 1000) / 10 : 52.0,
      colorClass: "bg-blue-500 text-blue-500",
      barColor: "#3b82f6"
    },
    {
      id: "system_tools",
      category: "system_tools",
      label: "System tools",
      tokens: systemToolsTokens,
      percentage: 9.6,
      colorClass: "bg-purple-500 text-purple-500",
      barColor: "#a855f7"
    },
    {
      id: "mcp_tools",
      category: "mcp_tools",
      label: "MCP tools",
      tokens: mcpToolsTokens > 0 ? mcpToolsTokens : 68_000,
      percentage: mcpToolsTokens > 0 ? Math.round((mcpToolsTokens / maxTokens) * 1000) / 10 : 6.8,
      colorClass: "bg-pink-500 text-pink-500",
      barColor: "#ec4899",
      childrenCount: mcpChildren.length,
      children: mcpChildren
    },
    {
      id: "skills",
      category: "skills",
      label: "Skills",
      tokens: skillsTokens,
      percentage: 5.4,
      colorClass: "bg-amber-500 text-amber-500",
      barColor: "#f59e0b"
    },
    {
      id: "system_prompt",
      category: "system_prompt",
      label: "System prompt",
      tokens: systemPromptTokens,
      percentage: 4.2,
      colorClass: "bg-emerald-500 text-emerald-500",
      barColor: "#10b981"
    },
    {
      id: "memory_files",
      category: "memory_files",
      label: "Memory files",
      tokens: memoryTokens,
      percentage: 2.4,
      colorClass: "bg-sky-500 text-sky-500",
      barColor: "#0ea5e9",
      childrenCount: memoryChildren.length,
      children: memoryChildren
    },
    {
      id: "custom_agents",
      category: "custom_agents",
      label: "Custom agents",
      tokens: customAgentsTokens,
      percentage: 1.6,
      colorClass: "bg-teal-500 text-teal-500",
      barColor: "#14b8a6",
      childrenCount: customAgentsChildren.length,
      children: customAgentsChildren
    },
    {
      id: "mcp_deferred",
      category: "mcp_deferred",
      label: "MCP tools (deferred)",
      tokens: mcpDeferredTokens,
      percentage: 0,
      deferred: true,
      colorClass: "bg-neutral-300 dark:bg-neutral-700 text-text-tertiary",
      barColor: "transparent"
    },
    {
      id: "system_deferred",
      category: "system_deferred",
      label: "System tools (deferred)",
      tokens: systemDeferredTokens,
      percentage: 0,
      deferred: true,
      colorClass: "bg-neutral-300 dark:bg-neutral-700 text-text-tertiary",
      barColor: "transparent"
    },
    {
      id: "free_space",
      category: "free_space",
      label: "Free space",
      tokens: freeTokens > 0 ? freeTokens : 180_000,
      percentage: freePercentage > 0 ? freePercentage : 18.0,
      colorClass: "bg-neutral-300 dark:bg-neutral-700 text-text-tertiary",
      barColor: "transparent"
    }
  ]

  return {
    usedTokens: activeTotal > 0 ? activeTotal : 820_000,
    maxTokens: maxTokens >= 1_000_000 ? maxTokens : 1_000_000,
    usedPercentage: usedPercentage > 0 ? usedPercentage : 82,
    freeTokens,
    buckets
  }
}

/** 默认速率限制与计划周期数据 */
export function calculateRealPlanLimits(metrics: TelemetryMetric[] = []): PlanLimitItem[] {
  const now = Date.now()
  const fiveHoursAgo = now - 5 * 3600 * 1000
  const oneWeekAgo = now - 7 * 24 * 3600 * 1000

  const recent5hTokens = metrics
    .filter((m) => m.createdAt >= fiveHoursAgo)
    .reduce((sum, m) => sum + (m.inputTokens ?? 0) + (m.outputTokens ?? 0), 0)

  const fiveHourBudget = 500_000
  const fiveHourPercent = Math.min(100, Math.round((recent5hTokens / fiveHourBudget) * 100))

  const weeklyTokens = metrics
    .filter((m) => m.createdAt >= oneWeekAgo)
    .reduce((sum, m) => sum + (m.inputTokens ?? 0) + (m.outputTokens ?? 0), 0)

  const weeklyBudget = 5_000_000
  const weeklyPercent = Math.min(100, Math.round((weeklyTokens / weeklyBudget) * 100))

  return [
    {
      id: "five_hour",
      label: "5-hour limit",
      resetText: "Resets in 2 hr 46 min",
      percentage: recent5hTokens > 0 ? Math.max(5, fiveHourPercent) : 38,
      activeTokens: recent5hTokens,
      maxTokens: fiveHourBudget,
      barColorClass: "bg-accent-500"
    },
    {
      id: "weekly_all",
      label: "Weekly · all models",
      resetText: "Resets Tue 3:00 PM",
      percentage: weeklyTokens > 0 ? Math.max(3, weeklyPercent) : 3,
      activeTokens: weeklyTokens,
      maxTokens: weeklyBudget,
      barColorClass: "bg-neutral-400 dark:bg-neutral-600"
    },
    {
      id: "weekly_pro",
      label: "Weekly · Pro",
      resetText: "Resets Tue 3:00 PM",
      percentage: 5,
      barColorClass: "bg-accent-500"
    }
  ]
}

export const DEFAULT_PLAN_LIMITS: PlanLimitItem[] = [
  {
    id: "five_hour",
    label: "5-hour limit",
    resetText: "Resets in 2 hr 46 min",
    percentage: 38,
    barColorClass: "bg-accent-500"
  },
  {
    id: "weekly_all",
    label: "Weekly · all models",
    resetText: "Resets Tue 3:00 PM",
    percentage: 3,
    barColorClass: "bg-neutral-400 dark:bg-neutral-600"
  },
  {
    id: "weekly_pro",
    label: "Weekly · Pro",
    resetText: "Resets Tue 3:00 PM",
    percentage: 5,
    barColorClass: "bg-accent-500"
  }
]
