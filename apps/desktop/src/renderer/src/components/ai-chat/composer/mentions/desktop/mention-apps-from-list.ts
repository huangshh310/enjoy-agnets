/**
 * desktopListApps 结果收成提及名单。失败只留空列表，不造假应用。
 */
import type { DesktopMentionApp } from "@enjoy-agents/ipc-contract"

let cachedApps: DesktopMentionApp[] = []

export function peekDesktopMentionApps(): readonly DesktopMentionApp[] {
  return cachedApps
}

export function rememberDesktopMentionApps(apps: readonly DesktopMentionApp[]): void {
  cachedApps = [...apps]
}

export function mentionAppsFromListResult(
  result: { ok?: boolean; apps?: DesktopMentionApp[] } | null | undefined
): DesktopMentionApp[] {
  if (!result || result.ok === false) return []
  return Array.isArray(result.apps) ? result.apps : []
}
