/**
 * macOS 关光窗口应用还在 Dock，只有真退出才 flush。
 */
export function shouldFlushRunsOnWindowAllClosed(platform: NodeJS.Platform): boolean {
  return platform !== "darwin"
}
