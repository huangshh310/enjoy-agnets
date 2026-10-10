/**
 * stub 启动要种多少会话。默认 1，避免旧窗口流被灌满侧栏。
 */
export function e2eSessionCount(raw = process.env.ENJOY_E2E_SESSION_COUNT): number {
  const parsed = Number.parseInt(raw ?? "1", 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(80, parsed)
}
