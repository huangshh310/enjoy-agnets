/**
 * AppSnap 合约。渲染进程不调用 ScreenCaptureKit。
 * 快捷键必须正好两键，其中一键是修饰键。和命令表或系统保留键冲突则拒绝。
 */
import { z } from "zod"
import {
  isReservedChord,
  normalizeChord,
  type KeybindingPlatform,
  type KeybindingRule
} from "./keybindings"
import { resolveKeybindings } from "./keybinding-resolve"

export const APPSNAP_PNG_LIMIT = 8 * 1024 * 1024
export const APPSNAP_WINDOW_LIMIT = 50

const MODIFIERS = new Set([
  "mod",
  "ctrl",
  "alt",
  "shift",
  "alt.left",
  "alt.right",
  "ctrl.left",
  "ctrl.right",
  "shift.left",
  "shift.right",
  "meta.left",
  "meta.right"
])

export const AppsnapWindow = z.object({
  id: z.number().int(),
  title: z.string(),
  appName: z.string(),
  capturable: z.boolean(),
  iconPngBase64: z.string().optional()
})
export type AppsnapWindow = z.infer<typeof AppsnapWindow>

export const AppsnapListResult = z.object({
  ok: z.boolean(),
  windows: z.array(AppsnapWindow).max(APPSNAP_WINDOW_LIMIT).default([]),
  code: z.string().optional(),
  line: z.string().optional()
})

export const AppsnapCaptureInput = z.object({
  windowId: z.number().int().positive().optional()
})

export const AppsnapCaptureResult = z.object({
  ok: z.boolean(),
  pngBase64: z.string().optional(),
  code: z.string().optional(),
  line: z.string().optional()
})

export const AppsnapDoctorResult = z.object({
  ok: z.boolean(),
  platform: z.string(),
  helperSigned: z.boolean(),
  screenCapture: z.boolean().optional(),
  inputMonitoring: z.boolean().optional(),
  code: z.string().optional(),
  line: z.string()
})
export type AppsnapDoctor = z.infer<typeof AppsnapDoctorResult>

export function isAppsnapModifier(token: string): boolean {
  return MODIFIERS.has(token)
}

/** 收成稳定写法。非法返回 null。两枚修饰键没有主键也可以。 */
export function parseAppsnapChord(raw: string): string | null {
  const parts = raw.trim().toLowerCase().split("+").map((part) => part.trim()).filter(Boolean)
  if (parts.length !== 2 || new Set(parts).size !== 2) return null
  if (!parts.some(isAppsnapModifier)) return null
  const key = parts.find((part) => !isAppsnapModifier(part))
  if (key && !/^[a-z0-9]$/.test(key) && !/^f([1-9]|1\d|2[0-4])$/.test(key)) return null
  const mods = parts.filter(isAppsnapModifier).sort()
  return key ? [...mods, key].join("+") : mods.join("+")
}

/** 能落到命令表的那一键。左右 Option 这种双修饰键没有对应命令。 */
export function appsnapAsKeybindingChord(chord: string): string | null {
  const parsed = parseAppsnapChord(chord)
  if (!parsed) return null
  const parts = parsed.split("+")
  const key = parts.find((part) => !isAppsnapModifier(part))
  if (!key) return null
  const mods = parts.filter(isAppsnapModifier).map(genericModifier)
  return normalizeChord([...mods, key].join("+"))
}

export function appsnapChordIssue(
  chord: string,
  userRules: readonly KeybindingRule[],
  platform: KeybindingPlatform
): { code: "invalid" | "reserved" | "conflict"; command?: string } | null {
  const parsed = parseAppsnapChord(chord)
  if (!parsed) return { code: "invalid" }
  const key = appsnapAsKeybindingChord(parsed)
  if (!key) return null
  if (isReservedChord(key, platform)) return { code: "reserved" }
  const hit = resolveKeybindings(userRules).find((rule) => rule.key === key)
  return hit ? { code: "conflict", command: hit.command } : null
}

function genericModifier(token: string): string {
  if (token === "mod" || token.startsWith("meta")) return "mod"
  if (token.startsWith("ctrl")) return "ctrl"
  if (token.startsWith("shift")) return "shift"
  return "alt"
}
