/**
 * desktop_act 的审批策略：wait 放行、坐标/前台/敏感窗/二次确认不吃会话白名单、审批卡文案。
 */
import {
  DESKTOP_ACT_ANY_SESSION_KEY,
  desktopActAppKey,
  desktopActIsSensitive,
  desktopActSessionKey,
  isStableDesktopAppKey
} from "./desktop-act-app-key.ts"
import { desktopActNeedsSecondConfirm } from "./desktop-second-confirm-gate.ts"

export {
  DESKTOP_ACT_ANY_SESSION_KEY,
  DESKTOP_ACT_SESSION_PREFIX,
  desktopActAppKey,
  desktopActAppKeyInfo,
  desktopActIsSensitive,
  stampDesktopActSensitiveFlag,
  desktopActSessionKey,
  isStableDesktopAppKey,
  normalizeDesktopAppName,
  withAnyDesktopSessionKey,
  type DesktopActAppKeySource
} from "./desktop-act-app-key.ts"

/** `wait` 不改界面，不停车。带坐标或要求前台时仍要问。 */
export function desktopActSkipsApproval(args: unknown): boolean {
  if (!args || typeof args !== "object") return false
  const row = args as Record<string, unknown>
  if (row.action !== "wait") return false
  if (row.allowForeground === true) return false
  return typeof row.x !== "number" && typeof row.y !== "number"
}

/** 坐标点击和「允许切到前台」不能被本会话放行盖掉。 */
export function desktopActBypassesSessionAllow(args: unknown): boolean {
  if (!args || typeof args !== "object") return false
  const row = args as Record<string, unknown>
  if (row.allowForeground === true) return true
  const hasElement = typeof row.elementId === "string" && row.elementId.trim().length > 0
  return !hasElement && (typeof row.x === "number" || typeof row.y === "number")
}

/** 坐标 / 切前台 / 敏感窗 / 二次确认：会话 Allow 与「任意桌面」都盖不住。 */
export function desktopActAlwaysAsks(args: unknown): boolean {
  return (
    desktopActBypassesSessionAllow(args) ||
    desktopActIsSensitive(args) ||
    desktopActNeedsSecondConfirm(args)
  )
}

/** 按 `desktop_act:<appKey>` 或 `desktop_act:*` 查白名单。裸 `desktop_act` 不算放行。 */
export function sessionAllowsDesktopAct(
  args: unknown,
  policy: { sessionApprovedTools?: ReadonlySet<string>; anyDesktopSession?: boolean }
): boolean {
  if (desktopActAlwaysAsks(args)) return false
  const session = policy.sessionApprovedTools
  if (policy.anyDesktopSession || session?.has(DESKTOP_ACT_ANY_SESSION_KEY)) return true
  const key = desktopActSessionKey(desktopActAppKey(args))
  return Boolean(key && session?.has(key))
}

/**
 * CU-P1-A 持久簿命中。硬每次问仍优先：硬每次问 → 会话表 → 本函数。
 * keys 是 listDesktopAlwaysAllowAppKeys 投影出的裸 appKey[]；丢掉脏键，禁止把 * / desktop_act:* 当命中。
 */
export function persistentAlwaysAllowsDesktopAct(args: unknown, keys: readonly string[]): boolean {
  if (desktopActAlwaysAsks(args)) return false
  const appKey = desktopActAppKey(args)
  if (!isStableDesktopAppKey(appKey)) return false
  return keys.some((key) => isStableDesktopAppKey(key) && key === appKey)
}

/** 审批卡上的一句话：应用 · 「控件」 · 动作 · appKey。 */
export function desktopActApprovalText(args: Record<string, unknown>): string {
  const app = text(args.appName) || "应用"
  const rawElement = text(args.elementName) || text(args.elementId) || (typeof args.x === "number" ? "坐标" : "目标")
  const element = rawElement ? `「${rawElement}」` : ""
  const action = text(args.action) || "act"
  const foreground = args.allowForeground === true ? "会切到前台" : ""
  const appKey = desktopActAppKey(args)
  return [app, element, action, foreground, appKey].filter(Boolean).join(" · ")
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
