/**
 * CLI 左栏行：inspect 供应商 ∪ 模型 selector。OMP 即使只有一家已登录也要分栏。
 */
import type {
  AgentCliLoginKind,
  AgentCliModel,
  AgentCliProviderOrigin,
  AgentToolPublic
} from "@enjoy-agents/ipc-contract"
import { formatCliProviderLabel, groupCliModels, providerKeyOf, shouldSplitCliProviders } from "./cli-model-groups.ts"

export type CliProviderRow = {
  key: string
  label: string
  loggedIn: boolean
  count: number
  origin?: AgentCliProviderOrigin
  loginKind?: AgentCliLoginKind
}

/** inspect 未回时不要假装「没有供应商」。 */
export function cliCatalogPending(agent: AgentToolPublic, inspecting: boolean): boolean {
  if (agent.id !== "omp") return false
  if ((agent.providers?.length ?? 0) > 0) return false
  return inspecting || agent.providers === undefined
}

export function filterCliProviderRows(rows: CliProviderRow[], query: string): CliProviderRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) => row.label.toLowerCase().includes(q) || row.key.toLowerCase().includes(q))
}

export function groupCliProviderNav(rows: CliProviderRow[]): {
  signed: CliProviderRow[]
  customPending: CliProviderRow[]
  pending: CliProviderRow[]
} {
  return {
    signed: rows.filter((row) => row.loggedIn),
    customPending: rows.filter((row) => !row.loggedIn && row.origin === "custom"),
    pending: rows.filter((row) => !row.loggedIn && row.origin !== "custom")
  }
}

export function shouldShowCliProviderNav(agent: AgentToolPublic): boolean {
  if ((agent.providers?.length ?? 0) > 0) return true
  if (agent.id === "omp") return true
  return shouldSplitCliProviders(agent.models)
}

export function buildCliProviderRows(agent: AgentToolPublic): CliProviderRow[] {
  const groups = groupCliModels(agent.models)
  const countByKey = new Map(groups.map((group) => [group.key, group.models.length]))
  if (agent.providers?.length) {
    return agent.providers.map((item) => ({
      key: item.id,
      label: item.label,
      loggedIn: item.loggedIn,
      count: countByKey.get(item.id) ?? 0,
      origin: item.origin,
      loginKind: item.loginKind
    }))
  }
  return groups
    .filter((group) => group.key !== "_")
    .map((group) => ({
      key: group.key,
      label: group.label || formatCliProviderLabel(group.key),
      loggedIn: group.models.length > 0,
      count: group.models.length
    }))
}

export function initialCliNavKey(rows: CliProviderRow[], selectedId?: string): string {
  const selectedKey = selectedId ? providerKeyOf(selectedId) : ""
  if (selectedKey && rows.some((row) => row.key === selectedKey)) return selectedKey
  const signed = rows.find((row) => row.loggedIn)
  return signed?.key ?? rows[0]?.key ?? "all"
}

export function modelsForCliProvider(
  models: AgentCliModel[],
  key: string
): AgentCliModel[] {
  if (key === "all") return models
  return models.filter((item) => providerKeyOf(item.id) === key)
}

export function providerOf(rows: CliProviderRow[], key: string): CliProviderRow | undefined {
  return rows.find((row) => row.key === key)
}
