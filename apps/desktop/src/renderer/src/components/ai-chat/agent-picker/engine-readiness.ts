/**
 * C 端导轨 / Picker 就绪语义。只允许 ready（可空）、未安装、需登录。
 * 禁止把 ACP / 订阅登录等协议标签写成常驻副文案。
 */
export type EngineReadiness = "ready" | "missing" | "needs_login" | "soon"

export function engineReadiness(tool: {
  id: string
  status: string
  comingSoon?: boolean
  requiresLogin?: boolean
  loggedIn?: boolean | null
}): EngineReadiness {
  if (tool.comingSoon || tool.status === "comingSoon") return "soon"
  if (tool.id === "enjoy-local") return "ready"
  if (tool.status === "missing" || tool.status === "skillOnly") return "missing"
  if (tool.requiresLogin && tool.loggedIn === false) return "needs_login"
  return "ready"
}

/** 就绪态不写副标题；即将推出走分组标题，卡片上也可省略。 */
export function readinessSubtitle(
  kind: EngineReadiness,
  t: (path: string) => string
): string {
  if (kind === "missing") return t("chat.agentNotInstalled")
  if (kind === "needs_login") return t("chat.agentNeedsLogin")
  if (kind === "soon") return t("chat.agentSoon")
  return ""
}
