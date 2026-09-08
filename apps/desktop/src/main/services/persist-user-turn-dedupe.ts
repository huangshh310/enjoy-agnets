/**
 * 同一会话短时间内相同用户句不重复 INSERT（连点发送 / persist 双写）。
 */

export const DUPLICATE_USER_TURN_MS = 8000

export function shouldSkipDuplicateUserTurn(
  last: { content: string; createdAt: number } | undefined,
  content: string,
  now: number,
  windowMs = DUPLICATE_USER_TURN_MS
): boolean {
  if (!last) return false
  return last.content === content && now - last.createdAt < windowMs
}
