/**
 * 空态桌面 pill：只用 use-desktop-mention-apps 的真实 displayName。
 * 名单空 / 未开 / 未授权 → 不出现。禁止写死或虚构应用名。
 */
export function desktopEmptyStateExample(
  apps: readonly { displayName?: string | null }[] | null | undefined
): { displayName: string } | null {
  if (!apps?.length) return null
  for (const app of apps) {
    const displayName = typeof app.displayName === "string" ? app.displayName.trim() : ""
    if (displayName) return { displayName }
  }
  return null
}
