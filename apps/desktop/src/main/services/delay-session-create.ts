/**
 * 仅开发 / e2e：拉长 session.create，用来复检「新对话」创建窗内发送。
 * 打包态或没设毫秒时是空操作。
 */
export function sessionCreateDelayMs(env = process.env): number {
  if (env.ENJOY_E2E_STUB !== "1" && !env.ENJOY_DEV_USERDATA && !env.ENJOY_E2E_USERDATA) {
    return 0
  }
  const raw = Number(env.ENJOY_DEV_DELAY_SESSION_CREATE_MS ?? "")
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(raw, 10_000)
}

export async function delaySessionCreateIfDev(): Promise<void> {
  const ms = sessionCreateDelayMs()
  if (!ms) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}
