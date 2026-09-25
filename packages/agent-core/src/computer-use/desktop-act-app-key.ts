/**
 * desktop_act 会话白名单键：绑 appKey，禁止裸工具名全屏放行。
 * 优先级：bundleId → exe/AUMID → 规范化 appName。pid 不得单独作键。
 */

export const DESKTOP_ACT_ANY_SESSION_KEY = "desktop_act:*"
export const DESKTOP_ACT_SESSION_PREFIX = "desktop_act:"

const SENSITIVE = [
  "system settings",
  "system preferences",
  "系统设置",
  "系统偏好设置",
  "keychain",
  "钥匙串",
  "wallet",
  "password",
  "密码",
  "payment",
  "支付",
  "alipay",
  "wechat pay"
]

/** 规范化应用名：去扩展名、折叠空白。不能当 bundleId 的替代身份时才回落到它。 */
export function normalizeDesktopAppName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\.app$/i, "")
    .replace(/\.exe$/i, "")
    .replace(/\s+/g, " ")
}

/** 从审批 args / 观察字段抽出 appKey。缺字段时用规范化 appName，仍空则不能会话放行。 */
export function desktopActAppKey(args: unknown): string {
  if (!args || typeof args !== "object") return ""
  const row = args as Record<string, unknown>
  return (
    text(row.appKey) ||
    text(row.bundleId) ||
    text(row.exe) ||
    text(row.aumid) ||
    normalizeDesktopAppName(text(row.appName))
  )
}

/** 写入 sessionApprovedTools 的键。没有 appKey 时返回 null，禁止退回裸 desktop_act。 */
export function desktopActSessionKey(appKey: string): string | null {
  const key = appKey.trim()
  if (!key) return null
  return `${DESKTOP_ACT_SESSION_PREFIX}${key}`
}

/** 系统设置 / 钥匙串 / 支付等敏感窗：即使开了任意桌面也每次问。 */
export function desktopActIsSensitive(args: unknown): boolean {
  const key = desktopActAppKey(args)
  const name = args && typeof args === "object" ? text((args as Record<string, unknown>).appName) : ""
  const hay = `${key} ${normalizeDesktopAppName(name)}`.toLowerCase()
  return SENSITIVE.some((item) => hay.includes(item))
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
