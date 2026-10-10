/**
 * 离开设置进技能 / MCP 中心时记住原分段，齿轮与「返回设置」都回那里。
 */
import { isSettingsSectionId, type SettingsSectionId } from "./settings-sections.ts"

export const LAST_SETTINGS_SECTION_KEY = "enjoy-agents:last-settings-section"
export const SETTINGS_ORIGIN_FROM = "settings"

type StorageLike = Pick<Storage, "getItem" | "setItem">

function memoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    }
  }
}

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage
  try {
    if (typeof localStorage !== "undefined") return localStorage
  } catch {
    // 无 window 时走内存
  }
  return memoryStorage()
}

export function readLastSettingsSection(storage?: StorageLike): SettingsSectionId {
  const raw = resolveStorage(storage).getItem(LAST_SETTINGS_SECTION_KEY)
  if (raw && isSettingsSectionId(raw)) return raw
  return "general"
}

export function writeLastSettingsSection(section: SettingsSectionId, storage?: StorageLike): void {
  if (!isSettingsSectionId(section)) return
  resolveStorage(storage).setItem(LAST_SETTINGS_SECTION_KEY, section)
}

export function settingsReturnSection(
  from: string | undefined,
  origin: string | undefined,
  fallback: SettingsSectionId,
  storage?: StorageLike
): SettingsSectionId | null {
  if (from !== SETTINGS_ORIGIN_FROM) return null
  if (origin && isSettingsSectionId(origin)) return origin
  const last = readLastSettingsSection(storage)
  return last === "general" ? fallback : last
}

export function withSettingsOrigin(hash: string, section: SettingsSectionId): string {
  const bare = hash.startsWith("#") ? hash.slice(1) : hash
  const [path, query = ""] = bare.split("?")
  const params = new URLSearchParams(query)
  params.set("from", SETTINGS_ORIGIN_FROM)
  params.set("section", section)
  return `#${path}?${params}`
}
