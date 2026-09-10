/**
 * 官方 inspect 账号在设置 UI 里的角色。
 * 绑了 Enjoy 档案后，inspect 仍是本机 CLI 登录，不是当前供应商。
 */
export type OfficialAccountRole = "hero" | "aside" | "hidden"

/** 只读绑定态与是否已有 inspect；不必拉完整 AgentToolPublic。 */
export type OfficialAccountInput = {
  useCustomProvider?: boolean
  authAccount?: unknown
}

/**
 * @param loading 卡片还在拉 inspect 时，也要占位，避免先闪官方名再切旁注。
 */
export function officialAccountRole(
  tool: OfficialAccountInput,
  loading = false
): OfficialAccountRole {
  const hasInspect = Boolean(tool.authAccount) || loading
  if (!hasInspect) return "hidden"
  if (tool.useCustomProvider) return "aside"
  return "hero"
}
