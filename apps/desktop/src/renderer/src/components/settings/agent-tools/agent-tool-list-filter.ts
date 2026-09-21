/**
 * 智能体密表筛选：安装态 + 国外/国产地域。
 */
import { cliRegionOf } from "@enjoy-agents/ipc-contract/cli-region"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"

export type AgentToolFilterTab = "all" | "international" | "domestic" | "ready" | "available" | "soon"

export function matchAgentTool(
  tool: AgentToolPublic,
  tab: AgentToolFilterTab,
  searchQuery: string
): boolean {
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    if (!tool.label.toLowerCase().includes(query) && !tool.id.toLowerCase().includes(query)) return false
  }
  if (tab === "ready") return tool.status === "ready" || tool.id === "enjoy-local"
  if (tab === "available") return tool.status === "missing" && !tool.comingSoon && !tool.skillOnly
  if (tab === "soon") return Boolean(tool.comingSoon || tool.skillOnly)
  if (tab === "international") return cliRegionOf(tool.id) === "international"
  if (tab === "domestic") return cliRegionOf(tool.id) === "domestic"
  return true
}

export function countAgentToolsByTab(
  tools: readonly AgentToolPublic[],
  tab: AgentToolFilterTab
): number {
  return tools.filter((tool) => matchAgentTool(tool, tab, "")).length
}
