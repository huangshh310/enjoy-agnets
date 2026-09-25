/**
 * CU-P1-B 产品锁：提及 token 写 @桌面，不沿用旧预览 @电脑。
 */
export const DESKTOP_HOST_TOKEN = "桌面"

const HOST_ALIASES = new Set(["桌面", "电脑", "desktop", "computer"])

export function isDesktopHostToken(token: string): boolean {
  return HOST_ALIASES.has(token.trim().toLowerCase()) || token.trim() === "桌面" || token.trim() === "电脑"
}
