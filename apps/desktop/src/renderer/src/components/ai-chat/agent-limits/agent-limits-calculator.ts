/**
 * 弹出卡 Token 分桶真实计算器。
 * 严禁硬编码虚假工具或静态百分比，所有数据基于当前会话与系统真实状态折算。
 */
import type { McpServer, ProjectRuleItem, SkillItem } from "@enjoy-agents/ipc-contract"
import type { ThreadMessage } from "@renderer/stores/chat-store"
import type { ContextWindowData, TokenBucketItem } from "./agent-limits.types"

export { formatTokens } from "./format-tokens"

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

  // 2. 基础系统工具与系统提示 (内置工具约 12 个每个约 60 tok；系统提示词约 260 tok)
  const systemToolsTokens = 720
  const systemPromptTokens = 260

  // 3. 技能描述 Token (仅对真实存在的技能进行估算)
  const skillsTokens = liveSkills.reduce(
    (sum, s) => sum + Math.max(0, Math.round((s.description?.length ?? 0) / 3.8)),
    0
  )

  // 4. MCP Tools 真实已连接服务器构建 (无连接则为 0，严禁注入 mock 虚假工具)
  const connectedMcp = liveMcpServers.filter((s) => s.connected)
  const disconnectedMcp = liveMcpServers.filter((s) => !s.connected)
  const mcpChildren: TokenBucketItem["children"] = connectedMcp.map((s) => {
    const chars = (s.tools ?? []).reduce((sum, t) => sum + t.name.length + (t.description?.length ?? 0), 0)
    return {
      id: s.id,
      name: s.name,
      tokens: Math.round(chars / 3.8),
      type: "mcp_tool"
    }
  })
  const mcpToolsTokens = mcpChildren.reduce((sum, item) => sum + item.tokens, 0)

  // 5. Memory Files 真实规则与记忆文件构建 (无规则则为 0，严禁注入 mock 虚假文件)
  const memoryChildren: TokenBucketItem["children"] = liveRules.map((r) => ({
    id: r.id,
    name: r.filePath.split(/[\\/]/).pop() ?? r.name,
    tokens: Math.round((r.content?.length ?? 0) / 3.8),
    type: "memory_file"
  }))
  const memoryTokens = memoryChildren.reduce((sum, item) => sum + item.tokens, 0)

  // 6. 真实未连接 MCP 延迟加载计数 (无则为 0)
  const mcpDeferredTokens = disconnectedMcp.reduce((sum, s) => {
    const chars = (s.tools ?? []).reduce((tSum, t) => tSum + t.name.length + (t.description?.length ?? 0), 0)
    return sum + Math.round(chars / 3.8)
  }, 0)
  const activeTotal =
    messageTokens +
    systemToolsTokens +
    mcpToolsTokens +
    skillsTokens +
    systemPromptTokens +
    memoryTokens

  const usedPercentage =
    maxTokens > 0 ? Math.min(100, Math.max(0, Number(((activeTotal / maxTokens) * 100).toFixed(1)))) : 0
  const freeTokens = maxTokens > 0 ? Math.max(0, maxTokens - activeTotal) : 0
  const freePercentage = maxTokens > 0 ? Math.max(0, Number((100 - usedPercentage).toFixed(1))) : 0

  // 辅助函数：计算单项真实百分比
  const pctOf = (tokens: number) =>
    maxTokens > 0 ? Math.round((tokens / maxTokens) * 1000) / 10 : 0

  // 构建展示分桶列表：真实数据，按需展示
  const buckets: TokenBucketItem[] = [
    {
      id: "messages",
      category: "messages",
      label: "Messages",
      tokens: messageTokens,
      percentage: pctOf(messageTokens),
      colorClass: "bg-accent-500 text-accent-500",
      barColor: ""
    },
    {
      id: "system_tools",
      category: "system_tools",
      label: "System tools",
      tokens: systemToolsTokens,
      percentage: pctOf(systemToolsTokens),
      colorClass: "bg-chart-2 text-chart-2",
      barColor: ""
    },
    {
      id: "mcp_tools",
      category: "mcp_tools",
      label: "MCP tools",
      tokens: mcpToolsTokens,
      percentage: pctOf(mcpToolsTokens),
      colorClass: "bg-chart-3 text-chart-3",
      barColor: "",
      childrenCount: mcpChildren.length,
      children: mcpChildren
    },
    {
      id: "skills",
      category: "skills",
      label: "Skills",
      tokens: skillsTokens,
      percentage: pctOf(skillsTokens),
      colorClass: "bg-amber-500 text-amber-500",
      barColor: ""
    },
    {
      id: "system_prompt",
      category: "system_prompt",
      label: "System prompt",
      tokens: systemPromptTokens,
      percentage: pctOf(systemPromptTokens),
      colorClass: "bg-emerald-500 text-emerald-500",
      barColor: ""
    },
    {
      id: "memory_files",
      category: "memory_files",
      label: "Memory files",
      tokens: memoryTokens,
      percentage: pctOf(memoryTokens),
      colorClass: "bg-chart-4 text-chart-4",
      barColor: "",
      childrenCount: memoryChildren.length,
      children: memoryChildren
    }
  ]

  if (mcpDeferredTokens > 0) {
    buckets.push({
      id: "mcp_deferred",
      category: "mcp_deferred",
      label: "MCP tools (deferred)",
      tokens: mcpDeferredTokens,
      percentage: 0,
      deferred: true,
      colorClass: "bg-background-secondary-hover text-text-tertiary",
      barColor: ""
    })
  }

  buckets.push({
    id: "free_space",
    category: "free_space",
    label: "Free space",
    tokens: freeTokens,
    percentage: freePercentage,
      colorClass: "bg-background-secondary-hover text-text-tertiary",
      barColor: ""
  })

  return {
    usedTokens: activeTotal,
    maxTokens,
    usedPercentage,
    freeTokens,
    buckets
  }
}
