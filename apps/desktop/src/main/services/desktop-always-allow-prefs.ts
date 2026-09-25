/**
 * CU-P1-A 持久簿 prefs IO。只碰 desktopAlwaysAllowAppKeys，不写会话表。
 */
import {
  desktopActAppKey,
  grantPersistentDesktopAppKey,
  revokePersistentDesktopAlwaysAllow,
  sanitizeDesktopAlwaysAllowAppKeys
} from "@enjoy-agents/agent-core"
import { readPreferences, writePreferences } from "./preferences"

/** 读盘后洗链。脏键（空 / pid / 前缀 / *）丢掉。 */
export function readDesktopAlwaysAllowAppKeys(): string[] {
  return sanitizeDesktopAlwaysAllowAppKeys(readPreferences().desktopAlwaysAllowAppKeys)
}

/** allow_always：只把稳 appKey 写入 prefs。禁止 write-through 会话表。 */
export function persistDesktopAlwaysAllowFromArgs(args: unknown): string | null {
  const appKey = desktopActAppKey(args)
  const next = grantPersistentDesktopAppKey(readDesktopAlwaysAllowAppKeys(), appKey)
  if (!next) return null
  writePreferences({ desktopAlwaysAllowAppKeys: next })
  return appKey
}

/** 设置「撤销」：只从 prefs 删该键。禁止清会话表。 */
export function revokeDesktopAlwaysAllowFromPrefs(appKey: string): string[] {
  const next = revokePersistentDesktopAlwaysAllow(readDesktopAlwaysAllowAppKeys(), appKey)
  writePreferences({ desktopAlwaysAllowAppKeys: next })
  return next
}
