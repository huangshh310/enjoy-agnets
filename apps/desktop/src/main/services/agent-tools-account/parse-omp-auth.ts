/**
 * `omp auth-broker list --json`：只收 id/name，不碰 token。
 * 已登录 = 该供应商在 `omp models` 里出现过 selector。
 * models.yml 自定义不在 list 里，靠第三参 customIds 补进左栏。
 */
import type { AgentCliModel, AgentCliProvider } from "@enjoy-agents/ipc-contract"
import { clipCliLabel, formatOmpProviderLabel, OMP_PROVIDER_ID_RE } from "./cli-label.ts"
import { loginKindFor } from "./omp-login-kinds.ts"
import { parseJsonObject } from "./parse.ts"

export function parseOmpAuthBrokerList(raw: string): { id: string; name: string }[] {
  const json = parseJsonArrayOrModels(raw)
  const rows: { id: string; name: string }[] = []
  const seen = new Set<string>()
  for (const item of json) {
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const id = typeof rec.id === "string" ? rec.id.trim() : ""
    if (!OMP_PROVIDER_ID_RE.test(id) || seen.has(id)) continue
    seen.add(id)
    const name = typeof rec.name === "string" ? rec.name.trim() : ""
    rows.push({ id, name: clipCliLabel(name || id) })
  }
  return rows
}

export function mergeOmpProviders(
  listed: { id: string; name: string }[],
  models: AgentCliModel[],
  customIds: readonly string[] = []
): AgentCliProvider[] {
  const counts = countModelsByProvider(models)
  const seen = new Set<string>()
  const rows: AgentCliProvider[] = []
  for (const item of listed) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    rows.push({
      id: item.id,
      label: clipCliLabel(item.name || item.id),
      loggedIn: (counts.get(item.id) ?? 0) > 0,
      origin: "catalog",
      loginKind: loginKindFor(item.id)
    })
  }
  for (const id of customIds) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    rows.push({
      id,
      label: clipCliLabel(formatOmpProviderLabel(id)),
      loggedIn: (counts.get(id) ?? 0) > 0,
      origin: "custom"
    })
  }
  for (const [id, count] of counts) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    rows.push({
      id,
      label: clipCliLabel(formatOmpProviderLabel(id)),
      loggedIn: count > 0,
      origin: "custom"
    })
  }
  return rows.sort((a, b) => Number(b.loggedIn) - Number(a.loggedIn) || a.label.localeCompare(b.label))
}

function countModelsByProvider(models: AgentCliModel[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const model of models) {
    const slash = model.id.indexOf("/")
    if (slash <= 0) continue
    const key = model.id.slice(0, slash)
    if (!OMP_PROVIDER_ID_RE.test(key)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function parseJsonArrayOrModels(raw: string): unknown[] {
  const trimmed = raw.trim()
  const start = trimmed.search(/[[{]/)
  const slice = start >= 0 ? trimmed.slice(start) : trimmed
  if (slice.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(slice)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  const obj = parseJsonObject(slice)
  return Array.isArray(obj?.providers) ? obj.providers : []
}

