/**
 * stub 启动要种多少项目。默认 1；ENJOY_E2E_WORKSPACES=2 种两个隔离目录。
 */
export function e2eWorkspaceCount(raw = process.env.ENJOY_E2E_WORKSPACES): number {
  const parsed = Number.parseInt(raw ?? "1", 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(2, parsed)
}
