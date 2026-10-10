/**
 * 回灌封口只认该会话自己是否还在跑，禁止 OR 前台 Composer running。
 */
export function hydrateSessionRunning(input: { sessionOwnRunning: boolean }): boolean {
  return input.sessionOwnRunning === true
}
