/**
 * desktop_act 会话白名单键：绑 appKey，禁止裸工具名全屏放行。
 * 优先级：bundleId → exe/AUMID → 规范化 appName。pid 不得单独作键。
 */

export const DESKTOP_ACT_ANY_SESSION_KEY = "desktop_act:*"
export const DESKTOP_ACT_SESSION_PREFIX = "desktop_act:"

export type DesktopActAppKeySource = "bundleId" | "exe" | "aumid" | "appName"

const KEY_SOURCES: readonly DesktopActAppKeySource[] = ["bundleId", "exe", "aumid", "appName"]

/**
 * 子串命中：设置 / 钥匙串 / 支付 + 足够独特的终端身份。
 * 「终端 / Terminal」已入名单（CU-P1-P jojo）。Finder / Explorer 不在此列。
 */
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
  "wechat pay",
  "com.apple.terminal",
  "com.googlecode.iterm2",
  "org.gnome.terminal",
  "org.kde.konsole",
  "org.wezfurlong.wezterm",
  "microsoft.windowsterminal",
  "windows terminal",
  "windowsterminal",
  "iterm2",
  "gnome-terminal",
  "gnome terminal",
  "powershell",
  "command prompt",
  "命令提示符",
  "终端",
  "terminal",
  "konsole",
  "alacritty",
  "wezterm"
]

/** 短进程名只做基名 / 规范化名精确匹配，避免 cmdline 一类误伤。 */
const SENSITIVE_PROCESS = new Set([
  "cmd",
  "pwsh",
  "wt",
  "xterm",
  "uxterm",
  "kitty",
  "iterm"
])

/** 规范化应用名：去扩展名、折叠空白。不能当 bundleId 的替代身份时才回落到它。 */
export function normalizeDesktopAppName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\.app$/i, "")
    .replace(/\.exe$/i, "")
    .replace(/\s+/g, " ")
}

/** 从审批 args / 观察字段抽出 appKey 与来源。kai 已写 appKey 时尊重，来源可另给。 */
export function desktopActAppKeyInfo(args: unknown): {
  appKey: string
  appKeySource: DesktopActAppKeySource | ""
} {
  if (!args || typeof args !== "object") return { appKey: "", appKeySource: "" }
  const row = args as Record<string, unknown>
  const inferred = inferDesktopActAppKey(row)
  const explicit = text(row.appKey)
  if (!explicit) return inferred
  return { appKey: explicit, appKeySource: asAppKeySource(row.appKeySource) || inferred.appKeySource }
}

/** 从审批 args / 观察字段抽出 appKey。缺字段时用规范化 appName，仍空则不能会话放行。 */
export function desktopActAppKey(args: unknown): string {
  return desktopActAppKeyInfo(args).appKey
}

/**
 * 稳 appKey：bundleId / exe / AUMID / 规范化名。pid、裸 desktop_act、desktop_act:* 都不是键。
 * 无稳键时隐藏「始终允许此应用」，也不写入持久簿。
 */
export function isStableDesktopAppKey(appKey: string): boolean {
  const key = appKey.trim()
  if (!key) return false
  if (key === "*" || key === "desktop_act" || key.startsWith(DESKTOP_ACT_SESSION_PREFIX)) return false
  if (/^\d+$/.test(key)) return false
  return true
}

/** 写入 sessionApprovedTools 的键。没有 appKey 时返回 null，禁止退回裸 desktop_act。 */
export function desktopActSessionKey(appKey: string): string | null {
  const key = appKey.trim()
  if (!key) return null
  return `${DESKTOP_ACT_SESSION_PREFIX}${key}`
}

/**
 * 设置「本会话任意桌面」映到白名单：开则注入 `desktop_act:*`，关则摘掉。
 * 只在组 ApprovalPolicy 时用；命中函数见 `sessionAllowsDesktopAct`，按 Set 里有没有该键。
 */
export function withAnyDesktopSessionKey(
  session: ReadonlySet<string> | undefined,
  anyDesktop: boolean
): Set<string> {
  const next = new Set(session)
  if (anyDesktop) next.add(DESKTOP_ACT_ANY_SESSION_KEY)
  else next.delete(DESKTOP_ACT_ANY_SESSION_KEY)
  return next
}

/** 系统设置 / 钥匙串 / 支付 / 终端类：即使开了任意桌面也每次问。 */
export function desktopActIsSensitive(args: unknown): boolean {
  const key = desktopActAppKey(args)
  const name = args && typeof args === "object" ? text((args as Record<string, unknown>).appName) : ""
  const normalizedName = normalizeDesktopAppName(name)
  const hay = `${key} ${normalizedName}`.toLowerCase()
  if (SENSITIVE.some((item) => hay.includes(item))) return true
  return sensitiveProcessTokens(key, normalizedName).some((token) => SENSITIVE_PROCESS.has(token))
}

/** appKey 基名（去路径 / .exe）+ 规范化显示名，供短进程精确比对。 */
function sensitiveProcessTokens(key: string, normalizedName: string): string[] {
  const base = normalizeDesktopAppName(key.split(/[/\\]/).pop() ?? "")
  return [normalizedName, base].filter(Boolean)
}

/**
 * 主进程必须写入布尔。renderer 只读；缺省当敏感。
 */
export function stampDesktopActSensitiveFlag(args: Record<string, unknown>): Record<string, unknown> {
  return { ...args, sensitive: desktopActIsSensitive(args) }
}

function inferDesktopActAppKey(row: Record<string, unknown>): {
  appKey: string
  appKeySource: DesktopActAppKeySource | ""
} {
  const bundleId = text(row.bundleId)
  if (bundleId) return { appKey: bundleId, appKeySource: "bundleId" }
  const exe = text(row.exe)
  if (exe) return { appKey: exe, appKeySource: "exe" }
  const aumid = text(row.aumid)
  if (aumid) return { appKey: aumid, appKeySource: "aumid" }
  const appName = normalizeDesktopAppName(text(row.appName))
  if (appName) return { appKey: appName, appKeySource: "appName" }
  return { appKey: "", appKeySource: "" }
}

function asAppKeySource(value: unknown): DesktopActAppKeySource | "" {
  return KEY_SOURCES.includes(value as DesktopActAppKeySource) ? (value as DesktopActAppKeySource) : ""
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
