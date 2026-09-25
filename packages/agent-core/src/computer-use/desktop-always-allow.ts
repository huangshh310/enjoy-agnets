/**
 * CU-P1-A：本机按应用持久允许簿。只存裸 appKey，禁止前缀与永久 anyDesktop。
 * allow_always 只写簿；撤销只清簿。硬每次问盖住簿命中。
 */
import {
  DESKTOP_ACT_ANY_SESSION_KEY,
  DESKTOP_ACT_SESSION_PREFIX,
  desktopActAppKey,
  desktopActSessionKey
} from "./desktop-act-app-key.ts"
import { desktopActAlwaysAsks, sessionAllowsDesktopAct } from "./desktop-act-policy.ts"
import { desktopActNeedsSecondConfirm } from "./desktop-second-confirm-gate.ts"

/** 本机 prefs 字段名。数组元素是裸 appKey，不是 desktop_act:<key>。 */
export const DESKTOP_ALWAYS_ALLOW_PREFS_KEY = "desktopAlwaysAllowAppKeys"

const PID_ONLY = /^\d+$/
const PID_PREFIX = /^pid[:\s_-]?\d+$/i

/**
 * 裸 appKey 能否进持久簿。
 * 拒绝空、`*`、`desktop_act:*`、带会话前缀、pid 当键。
 */
export function isPersistentDesktopAppKey(key: string): boolean {
  const trimmed = key.trim()
  if (!trimmed) return false
  if (trimmed === "*" || trimmed === DESKTOP_ACT_ANY_SESSION_KEY) return false
  if (trimmed === "desktop_act" || trimmed.startsWith(DESKTOP_ACT_SESSION_PREFIX)) return false
  if (PID_ONLY.test(trimmed) || PID_PREFIX.test(trimmed)) return false
  return true
}

/** 读 prefs 时丢掉脏键：空、pid、带前缀、永久任意桌面。 */
export function sanitizeDesktopAlwaysAllowAppKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const next: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== "string") continue
    const key = item.trim()
    if (!isPersistentDesktopAppKey(key) || seen.has(key)) continue
    seen.add(key)
    next.push(key)
  }
  return next
}

/** 写入裸 appKey。非法键（含 `*` / `desktop_act:*` / pid）返回 null，不改簿。 */
export function grantPersistentDesktopAppKey(
  book: readonly string[],
  appKey: string
): string[] | null {
  const key = appKey.trim()
  if (!isPersistentDesktopAppKey(key)) return null
  const clean = sanitizeDesktopAlwaysAllowAppKeys(book)
  if (clean.includes(key)) return clean
  return [...clean, key]
}

/** 从审批 args 抽出 appKey 再写入。无稳键返回 null。 */
export function grantPersistentDesktopAlwaysAllow(
  book: readonly string[],
  args: unknown
): string[] | null {
  return grantPersistentDesktopAppKey(book, desktopActAppKey(args))
}

/** 只从簿删该裸键。不清会话表。 */
export function revokePersistentDesktopAlwaysAllow(
  book: readonly string[],
  appKey: string
): string[] {
  const key = appKey.trim()
  return sanitizeDesktopAlwaysAllowAppKeys(book).filter((item) => item !== key)
}

/**
 * 持久簿命中。硬每次问（坐标 / 前台 / 敏感 / 二次确认）必须 false。
 * 按裸 appKey 比较，不在簿里存 desktop_act: 前缀。
 */
export function persistentBookAllowsDesktopAct(
  args: unknown,
  book: readonly string[] | undefined
): boolean {
  if (desktopActAlwaysAsks(args)) return false
  const appKey = desktopActAppKey(args)
  if (!appKey || !isPersistentDesktopAppKey(appKey)) return false
  return sanitizeDesktopAlwaysAllowAppKeys(book).includes(appKey)
}

/**
 * 命中顺序：硬每次问 → 会话表 → 持久簿。
 * 簿盖不住坐标 / 前台 / 敏感 / 二次确认。
 */
export function policyAllowsDesktopAct(
  args: unknown,
  policy: {
    sessionApprovedTools?: ReadonlySet<string>
    anyDesktopSession?: boolean
    desktopAlwaysAllowAppKeys?: readonly string[]
  }
): boolean {
  if (desktopActAlwaysAsks(args)) return false
  if (sessionAllowsDesktopAct(args, policy)) return true
  return persistentBookAllowsDesktopAct(args, policy.desktopAlwaysAllowAppKeys)
}

/** allow_always 只给 alwaysAppKey；allow_session 只给 sessionKey。二次确认两边都不写。 */
export function desktopActDecisionWrite(
  decision: string,
  args: unknown
): { sessionKey: string | null; alwaysAppKey: string | null } {
  const none = { sessionKey: null, alwaysAppKey: null }
  if (desktopActNeedsSecondConfirm(args)) return none
  if (decision === "allow_session") {
    return { sessionKey: desktopActSessionKey(desktopActAppKey(args)), alwaysAppKey: null }
  }
  if (decision === "allow_always") {
    const appKey = desktopActAppKey(args)
    if (!isPersistentDesktopAppKey(appKey)) return none
    return { sessionKey: null, alwaysAppKey: appKey }
  }
  return none
}
