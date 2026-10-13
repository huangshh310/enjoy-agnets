/**
 * jojo P2b：「正在准备…」只画在真正在准备的那个会话上；空新对话不跟着冒。
 * preparingSessionId === null 且 preparingHint：建会话窗（还没 id），只在前台也还没 sessionId 时画。
 */
export function preparingHintVisible(input: {
  preparingHint: boolean
  preparingSessionId: string | null
  sessionId: string | null
}): boolean {
  if (!input.preparingHint) return false
  if (input.preparingSessionId === null) return input.sessionId === null
  return input.preparingSessionId === input.sessionId
}
