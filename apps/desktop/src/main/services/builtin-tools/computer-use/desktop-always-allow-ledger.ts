/**
 * CU-P1-A 持久簿：只读写 preferences.desktopAlwaysAllowAppKeys。
 * allow_always 只写簿；设置撤销只清簿；禁止 desktop_act:* / 裸 desktop_act / pid。
 * 隐患：act 路径跳过审批仍由 kai 接闸（硬每次问 → 会话表 → persistentAlwaysAllowsDesktopAct）。
 */
import { desktopActAppKey, isStableDesktopAppKey } from "@enjoy-agents/agent-core/computer-use"
import type { DesktopAlwaysAllowApp } from "@enjoy-agents/ipc-contract"
import { readPreferences, writePreferences } from "../../preferences"

export function listDesktopAlwaysAllowApps(): DesktopAlwaysAllowApp[] {
  return normalizeDesktopAlwaysAllowEntries(readPreferences().desktopAlwaysAllowAppKeys)
}

export function listDesktopAlwaysAllowAppKeys(): string[] {
  return listDesktopAlwaysAllowApps().map((row) => row.appKey)
}

/** allow_always：只写簿。无稳键或二次确认调用方应先拦。 */
export function rememberDesktopAlwaysAllowFromArgs(args: unknown): DesktopAlwaysAllowApp[] | null {
  const appKey = desktopActAppKey(args)
  const displayName = displayNameFromArgs(args, appKey)
  const next = upsertDesktopAlwaysAllowEntry(listDesktopAlwaysAllowApps(), { appKey, displayName })
  if (!next) return null
  persistAlwaysAllowApps(next)
  return next
}

/** 设置「撤销」：只从簿删该键，不清会话表。 */
export function revokeDesktopAlwaysAllowApp(appKey: string): DesktopAlwaysAllowApp[] {
  const next = removeDesktopAlwaysAllowEntry(listDesktopAlwaysAllowApps(), appKey)
  persistAlwaysAllowApps(next)
  return next
}

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

function persistAlwaysAllowApps(entries: DesktopAlwaysAllowApp[]) {
  writePreferences({ desktopAlwaysAllowAppKeys: entries })
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

function displayNameFromArgs(args: unknown, appKey: string): string {
  if (!args || typeof args !== "object") return appKey
  const name = (args as { appName?: unknown }).appName
  return typeof name === "string" && name.trim() ? name.trim() : appKey
}
