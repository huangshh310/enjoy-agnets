/**
 * C 端导轨 / Picker / 发送口共用的就绪语义。
 * PATH 找到二进制 ≠ 能开流；inspect 未回 ≠ 已登录。
 */
export type EngineReadiness =
  | "ready"
  | "missing"
  | "needs_login"
  | "inspecting"
  | "authorizing"
  | "login_failed"
  | "needs_key"
  | "outdated"
  | "soon"

export type EngineReadinessInput = {
  id: string
  status: string
  comingSoon?: boolean
  requiresLogin?: boolean
  loggedIn?: boolean | null
  hasKey?: boolean
  /** Cline/OpenCode：选了 API 档案就不再等官方 OAuth。 */
  usingVaultProvider?: boolean
  boundHasKey?: boolean
  /** 打开授权中 / 失败。inspect 已确认登录时仍以 loggedIn 为准。 */
  loginLoop?: "idle" | "authorizing" | "failed"
  /** 已装可登录但仍低于对接版本。未知不写 outdated。 */
  compat?: "ok" | "outdated" | "unknown"
  /** false = 无账号探针，loggedIn 不能当发送闸。 */
  loginProbed?: boolean
}

export function engineReadiness(tool: EngineReadinessInput): EngineReadiness {
  if (tool.comingSoon || tool.status === "comingSoon") return "soon"
  if (tool.id === "enjoy-local") return tool.hasKey === false ? "needs_key" : "ready"
  if (tool.status === "missing" || tool.status === "skillOnly") return "missing"
  if (tool.usingVaultProvider && tool.boundHasKey === false) return "needs_key"
  if (!tool.usingVaultProvider) {
    if (tool.requiresLogin && tool.loginLoop === "authorizing" && tool.loggedIn !== true) {
      return "authorizing"
    }
    if (tool.requiresLogin && tool.loginLoop === "failed" && tool.loggedIn !== true) {
      return "login_failed"
    }
    const loginKnown = tool.loginProbed !== false
    if (loginKnown && tool.requiresLogin && tool.loggedIn === false) return "needs_login"
    if (loginKnown && tool.requiresLogin && tool.loggedIn !== true) return "inspecting"
  }
  if (tool.compat === "outdated") return "outdated"
  return "ready"
}

/** 绿灯 / 发送：只有 ready。Enjoy Local 无密钥不是 ready。 */
export function isEngineLit(tool: EngineReadinessInput): boolean {
  return engineReadiness(tool) === "ready"
}

/** 点导轨是否立刻 bind。未登录只打开面板，不换 runtime。本地始终可切。 */
export function canBindEngine(tool: EngineReadinessInput): boolean {
  if (tool.id === "enjoy-local") return true
  const kind = engineReadiness(tool)
  if (kind === "ready") return true
  return kind === "needs_key" && tool.usingVaultProvider === true
}

/** 就绪态不写副标题；即将推出走分组标题。 */
export function readinessSubtitle(kind: EngineReadiness, t: (path: string) => string): string {
  if (kind === "missing") return t("chat.agentNotInstalled")
  if (kind === "needs_login") return t("chat.agentNeedsLogin")
  if (kind === "inspecting") return t("chat.agentInspecting")
  if (kind === "authorizing") return t("chat.agentAuthorizing")
  if (kind === "login_failed") return t("chat.agentLoginFailed")
  if (kind === "needs_key") return t("chat.agentNeedsKey")
  if (kind === "outdated") return t("chat.agentOutdated")
  if (kind === "soon") return t("chat.agentSoon")
  return ""
}

/** 导轨胶囊用短标；完整句只进 title / 面板。 */
export function readinessMarkKey(kind: EngineReadiness): string | null {
  if (kind === "missing") return "chat.agentNotInstalledMark"
  if (kind === "needs_login") return "chat.agentNeedsLoginMark"
  if (kind === "inspecting") return "chat.agentInspectingMark"
  if (kind === "authorizing") return "chat.agentAuthorizingMark"
  if (kind === "login_failed") return "chat.agentLoginFailedMark"
  if (kind === "needs_key") return "chat.agentNeedsKeyMark"
  if (kind === "outdated") return "chat.agentOutdatedMark"
  if (kind === "soon") return "chat.agentSoonMark"
  return null
}
