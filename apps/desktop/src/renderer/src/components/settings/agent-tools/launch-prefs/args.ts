/**
 * extraArgs ↔ 运行偏好。认识的旗标给人话开关，其余原样留在自定义。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"

export type LaunchPrefKind = "opt-in" | "opt-out"
export type LaunchPrefId = "fast" | "web-search"
export type LaunchPrefDef = {
  id: LaunchPrefId
  flag: string
  kind: LaunchPrefKind
}
export type LaunchPrefValues = Partial<Record<LaunchPrefId, boolean>>

const FAST: LaunchPrefDef = { id: "fast", flag: "--fast", kind: "opt-in" }

const LAUNCH_PREFS: Partial<Record<AgentToolId, LaunchPrefDef[]>> = {
  claude: [FAST],
  cursor: [FAST],
  grok: [FAST, { id: "web-search", flag: "--disable-web-search", kind: "opt-out" }],
  codex: [FAST, { id: "web-search", flag: "--search", kind: "opt-in" }],
  antigravity: [FAST]
}

export function launchPrefsFor(id: string): LaunchPrefDef[] {
  return LAUNCH_PREFS[id as AgentToolId] ?? []
}

export function decodeLaunchArgs(toolId: string, args: string[]): {
  values: LaunchPrefValues
  custom: string[]
} {
  const prefs = launchPrefsFor(toolId)
  const used = new Set<number>()
  const values: LaunchPrefValues = {}
  for (const pref of prefs) {
    const idx = args.findIndex((item) => item === pref.flag)
    values[pref.id] = pref.kind === "opt-out" ? idx < 0 : idx >= 0
    if (idx >= 0) used.add(idx)
  }
  return { values, custom: args.filter((_, index) => !used.has(index)) }
}

export function encodeLaunchArgs(
  toolId: string,
  values: LaunchPrefValues,
  custom: string[]
): string[] {
  const flags: string[] = []
  for (const pref of launchPrefsFor(toolId)) {
    const on = Boolean(values[pref.id])
    if (pref.kind === "opt-out" ? !on : on) flags.push(pref.flag)
  }
  return [...flags, ...sanitizeCustomArgs(custom)]
}

export function sanitizeCustomArgs(raw: string[] | string): string[] {
  const parts = Array.isArray(raw) ? raw : raw.split(/\s+/)
  return parts.map((item) => item.trim()).filter((item) => item.startsWith("-"))
}
