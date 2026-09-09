/**
 * 已发现规则的查询、筛选与刷新。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ProjectRuleItem } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"

export function useRulesList() {
  const queryClient = useQueryClient()
  const [selectedKind, setSelectedKind] = useState("all")
  const [search, setSearch] = useState("")
  const rulesQuery = useQuery({
    queryKey: ["rules"],
    enabled: hasIde(),
    queryFn: () => getIde().rules.list() as Promise<ProjectRuleItem[]>
  })
  const discoveredRules = rulesQuery.data ?? []

  const filteredRules = useMemo(
    () => discoveredRules.filter((rule) => matchesRuleFilter(rule, selectedKind, search)),
    [discoveredRules, selectedKind, search]
  )

  return {
    discoveredRules,
    filteredRules,
    isRefreshing: rulesQuery.isFetching,
    selectedKind,
    setSelectedKind,
    search,
    setSearch,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["rules"] })
  }
}

function matchesRuleFilter(rule: ProjectRuleItem, selectedKind: string, search: string): boolean {
  if (selectedKind !== "all" && rule.agentKind !== selectedKind) return false
  const q = search.toLowerCase()
  if (!q) return true
  return (
    rule.name.toLowerCase().includes(q) ||
    (rule.description?.toLowerCase().includes(q) ?? false) ||
    rule.filePath.toLowerCase().includes(q)
  )
}
