/**
 * CU-P1-A 持久簿纯函数：规范化 / 写入 / 撤销。不碰会话表，不认 pid / desktop_act:*。
 */
import { isStableDesktopAppKey } from "@enjoy-agents/agent-core/computer-use"
import type { DesktopAlwaysAllowApp } from "@enjoy-agents/ipc-contract"

export function normalizeDesktopAlwaysAllowEntries(raw: unknown): DesktopAlwaysAllowApp[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: DesktopAlwaysAllowApp[] = []
  for (const item of raw) {
    const row = asEntry(item)
    if (!row || seen.has(row.appKey)) continue
    seen.add(row.appKey)
    out.push(row)
  }
  return out
}

/** 闸命中用：把 SoT `{ appKey, displayName }[]`（读侧兼容旧 string[]）投影成裸 appKey[]。 */
export function listDesktopAlwaysAllowAppKeys(raw: unknown): string[] {
  return normalizeDesktopAlwaysAllowEntries(raw).map((row) => row.appKey)
}

export function upsertDesktopAlwaysAllowEntry(
  entries: DesktopAlwaysAllowApp[],
  candidate: { appKey: string; displayName?: string }
): DesktopAlwaysAllowApp[] | null {
  const appKey = candidate.appKey.trim()
  if (!isStableDesktopAppKey(appKey)) return null
  const displayName = (candidate.displayName ?? "").trim() || appKey
  const rest = entries.filter((row) => row.appKey !== appKey)
  return [...rest, { appKey, displayName }]
}

export function removeDesktopAlwaysAllowEntry(
  entries: DesktopAlwaysAllowApp[],
  appKey: string
): DesktopAlwaysAllowApp[] {
  const key = appKey.trim()
  if (!key) return entries
  return entries.filter((row) => row.appKey !== key)
}

function asEntry(item: unknown): DesktopAlwaysAllowApp | null {
  if (typeof item === "string") {
    const appKey = item.trim()
    return isStableDesktopAppKey(appKey) ? { appKey, displayName: appKey } : null
  }
  if (!item || typeof item !== "object") return null
  const row = item as { appKey?: unknown; displayName?: unknown }
  const appKey = typeof row.appKey === "string" ? row.appKey.trim() : ""
  if (!isStableDesktopAppKey(appKey)) return null
  const displayName = typeof row.displayName === "string" && row.displayName.trim() ? row.displayName.trim() : appKey
  return { appKey, displayName }
}
