/**
 * 仅开发 / e2e：拉长 session.create，用来复检「新对话」创建窗内发送。
 * 打包态或没设毫秒时是空操作。
 */
export function sessionCreateDelayMs(env = process.env, packaged = false): number {
  if (packaged) return 0
  if (env.ENJOY_E2E_STUB !== "1" && !env.ENJOY_DEV_USERDATA && !env.ENJOY_E2E_USERDATA) {
    return 0
  }
  const raw = Number(env.ENJOY_DEV_DELAY_SESSION_CREATE_MS ?? "")
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(raw, 10_000)
}

export async function delaySessionCreateIfDev(opts?: { packaged?: boolean }): Promise<void> {
  const ms = sessionCreateDelayMs(process.env, opts?.packaged === true)
  if (!ms) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** 仅开发 / e2e：拉长 session.messages，用来复检「重启后历史还没回来时不闪空态」。 */
export function sessionMessagesDelayMs(env = process.env, packaged = false): number {
  if (packaged) return 0
  if (env.ENJOY_E2E_STUB !== "1" && !env.ENJOY_DEV_USERDATA && !env.ENJOY_E2E_USERDATA) return 0
  const raw = Number(env.ENJOY_DEV_DELAY_SESSION_MESSAGES_MS ?? "")
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(raw, 10_000)
}

/**
 * 仅开发 / e2e：让 session.messages 失败（error）或永不返回（hang），
 * 用来复检「回灌失败不卡死在加载中」和 8 秒兜底计时器。打包态恒为 null。
 */
export function sessionMessagesFault(env = process.env, packaged = false): "error" | "hang" | null {
  if (packaged) return null
  if (env.ENJOY_E2E_STUB !== "1" && !env.ENJOY_DEV_USERDATA && !env.ENJOY_E2E_USERDATA) return null
  const raw = env.ENJOY_E2E_SESSION_MESSAGES_FAULT
  return raw === "error" || raw === "hang" ? raw : null
}

export async function delaySessionMessagesIfDev(opts?: { packaged?: boolean }): Promise<void> {
  const packaged = opts?.packaged === true
  const ms = sessionMessagesDelayMs(process.env, packaged)
  if (ms) await new Promise((resolve) => setTimeout(resolve, ms))
  const fault = sessionMessagesFault(process.env, packaged)
  if (fault === "error") throw new Error("e2e: session.messages fault injected")
  if (fault === "hang") await new Promise<never>(() => undefined)
}
