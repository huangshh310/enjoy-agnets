/**
 * 回灌收口：不依赖合约入口，测试与 loadSession 共用。
 */
import { isSessionHydrateCurrent } from "./session-hydrate-generation.ts"
import { pickHydratedMessages, type AssetBearingMessage } from "./pick-hydrated-messages.ts"

export { pickHydratedMessages }

export function messagesAfterSessionSwitch<T>(input: {
  currentSessionId: string | null
  nextSessionId: string
  liveMessages: T[]
}): { sameSession: boolean; messages: T[] } {
  const sameSession = input.currentSessionId === input.nextSessionId
  return { sameSession, messages: sameSession ? input.liveMessages : [] }
}

export function finishSessionHydrate<T extends AssetBearingMessage>(input: {
  generation: number
  sessionId: string
  currentSessionId: string | null
  dbMessages: T[]
  liveMessages: T[]
  sameSession: boolean
  running: boolean
}): T[] | undefined {
  if (!isSessionHydrateCurrent(input.generation)) return undefined
  if (input.currentSessionId !== input.sessionId) return undefined
  return pickHydratedMessages({
    dbMessages: input.dbMessages,
    liveMessages: input.liveMessages,
    sameSession: input.sameSession,
    running: input.running
  })
}
