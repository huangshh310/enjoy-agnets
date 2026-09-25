/**
 * 把 helper list_apps 收成 Composer 提及行。
 * 与 desktop_list_apps 同源。pid 不是键；无稳身份仍可进候选。
 */
import {
  desktopActAppKeyInfo,
  isStableDesktopAppKey
} from "@enjoy-agents/agent-core/computer-use"
import type { DesktopMentionApp, DesktopMentionAppsResult } from "@enjoy-agents/ipc-contract"

const UNNAMED = "未识别窗口"

/** 执行器失败或空列表都不造假应用。 */
export function mapListedDesktopApps(raw: Record<string, unknown>): DesktopMentionAppsResult {
  if (raw.success === false) {
    return { ok: false, apps: [], code: text(raw.code) || "executor_missing" }
  }
  const rows = Array.isArray(raw.apps) ? raw.apps : []
  const apps: DesktopMentionApp[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const mapped = mapListedApp(row)
    if (!mapped) continue
    const dedupe = mapped.stable && mapped.appKey ? `key:${mapped.appKey}` : `pid:${mapped.pid ?? ""}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    apps.push(mapped)
  }
  return { ok: true, apps }
}

function mapListedApp(row: unknown): DesktopMentionApp | null {
  if (!row || typeof row !== "object") return null
  const rec = row as Record<string, unknown>
  const displayName = text(rec.name) || text(rec.appName) || text(rec.displayName)
  const pid = asPid(rec.pid)
  const info = desktopActAppKeyInfo({
    appKey: rec.appKey,
    bundleId: rec.bundleId,
    exe: rec.exe,
    aumid: rec.aumid,
    appName: displayName
  })
  const stable = isStableDesktopAppKey(info.appKey)
  if (!displayName && pid == null) return null
  return {
    displayName: displayName || UNNAMED,
    appKey: stable ? info.appKey : "",
    ...(stable && info.appKeySource ? { appKeySource: info.appKeySource } : {}),
    stable,
    ...(pid != null ? { pid } : {})
  }
}

function asPid(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
