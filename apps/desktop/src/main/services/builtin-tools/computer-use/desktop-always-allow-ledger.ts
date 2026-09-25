/**
 * CU-P1-A 持久簿：只读写 preferences.desktopAlwaysAllowAppKeys。
 * allow_always 只写簿；设置撤销只清簿；禁止 desktop_act:* / 裸 desktop_act / pid。
 * 隐患：act 路径跳过审批仍由 kai 接闸（硬每次问 → 会话表 → persistentAlwaysAllowsDesktopAct）。
 */
import { desktopActAppKey } from "@enjoy-agents/agent-core/computer-use"
import type { DesktopAlwaysAllowApp } from "@enjoy-agents/ipc-contract"
import { readPreferences, writePreferences } from "../../preferences"
import {
  normalizeDesktopAlwaysAllowEntries,
  removeDesktopAlwaysAllowEntry,
  upsertDesktopAlwaysAllowEntry
} from "./desktop-always-allow-entries.ts"

export {
  normalizeDesktopAlwaysAllowEntries,
  removeDesktopAlwaysAllowEntry,
  upsertDesktopAlwaysAllowEntry
} from "./desktop-always-allow-entries.ts"

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

function persistAlwaysAllowApps(entries: DesktopAlwaysAllowApp[]) {
  writePreferences({ desktopAlwaysAllowAppKeys: entries })
}

function displayNameFromArgs(args: unknown, appKey: string): string {
  if (!args || typeof args !== "object") return appKey
  const name = (args as { appName?: unknown }).appName
  return typeof name === "string" && name.trim() ? name.trim() : appKey
}
