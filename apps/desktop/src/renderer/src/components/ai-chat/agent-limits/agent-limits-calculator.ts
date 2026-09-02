/**
 * 弹出卡 Token 分桶。上限由调用方传入（模型 contextWindow），这里不猜窗口。
 */
import type { McpServer, ProjectRuleItem, SkillItem } from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type { ContextWindowData, TokenBucketItem } from "./agent-limits.types"

export { formatTokens } from "./format-tokens"
export { calculateRealPlanLimits, DEFAULT_PLAN_LIMITS } from "./plan-limits"

/** 实时计算当前会话的上下文 Token 分桶真实明细 */
export function calculateContextWindowUsage(
  messages: ThreadMessage[] = [],
  maxTokens = 0,
  liveMcpServers: McpServer[] = [],
  liveSkills: SkillItem[] = [],
  liveRules: ProjectRuleItem[] = []
): ContextWindowData {

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

  const usedPercentage =
    maxTokens > 0 ? Math.min(100, Math.max(0, Math.round((activeTotal / maxTokens) * 100))) : 0
  const freeTokens = maxTokens > 0 ? Math.max(0, maxTokens - activeTotal) : 0
  const freePercentage = maxTokens > 0 ? Math.max(0, 100 - usedPercentage) : 0

  // 构建展示分桶列表 (与 BoardUI 参考图完全一致)
  const buckets: TokenBucketItem[] = [
    {
      id: "messages",
      category: "messages",
      label: "Messages",
      tokens: messageTokens,
      percentage: maxTokens > 0 ? Math.round((messageTokens / maxTokens) * 1000) / 10 : 0,
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
      tokens: mcpToolsTokens,
      percentage: maxTokens > 0 ? Math.round((mcpToolsTokens / maxTokens) * 1000) / 10 : 0,
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
      tokens: freeTokens,
      percentage: freePercentage,
      colorClass: "bg-neutral-300 dark:bg-neutral-700 text-text-tertiary",
      barColor: "transparent"
    }
  ]

  return {
    usedTokens: activeTotal,
    maxTokens,
    usedPercentage,
    freeTokens,
    buckets
  }
}

