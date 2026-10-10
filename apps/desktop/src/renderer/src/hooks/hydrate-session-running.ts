/**
 * 回灌封口看该会话自己是否还在跑，不看前台 Composer running。
 */
export function hydrateSessionRunning(input: {
  sessionId: string
  storeSessionId: string | null
  storeRunning: boolean
  parkedRunning?: boolean
}): boolean {
  if (input.parkedRunning === true) return true
  return input.storeSessionId === input.sessionId && input.storeRunning
}
