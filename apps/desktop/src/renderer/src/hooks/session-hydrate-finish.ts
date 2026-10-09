/**
 * 回灌收口：不依赖合约入口，测试与 loadSession / applySessionHydrate 共用。
 */
import { isSessionHydrateCurrent } from "./session-hydrate-generation.ts"
import { pickHydratedMessages, type AssetBearingMessage } from "./pick-hydrated-messages.ts"

export { pickHydratedMessages }

export type HydrateMessage = AssetBearingMessage & { id?: string }

export function messagesAfterSessionSwitch<T>(input: {
  currentSessionId: string | null
  nextSessionId: string
  liveMessages: T[]
}): { sameSession: boolean; messages: T[] } {
  const sameSession = input.currentSessionId === input.nextSessionId
  return { sameSession, messages: sameSession ? input.liveMessages : [] }
}

export function mergeHistoryKeepingOptimistic<T extends HydrateMessage>(
  dbMessages: T[],
  liveMessages: T[]
): T[] {
  const liveById = new Map<string, T>()
  for (const message of liveMessages) {
    if (message.id) liveById.set(message.id, message)
  }
  const dbIds = new Set(dbMessages.map((message) => message.id).filter((id): id is string => Boolean(id)))
  const merged = dbMessages.map((message) => (message.id && liveById.get(message.id)) || message)
  const extras = liveMessages.filter((message) => !message.id || !dbIds.has(message.id))
  return [...merged, ...extras]
}

export type FinishHydrateInput<T extends HydrateMessage> = {
  generation: number
  sessionId: string
  currentSessionId: string | null
  dbMessages: T[]
  liveMessages: T[]
  sameSession: boolean
  running: boolean
}

export function finishSessionHydrate<T extends HydrateMessage>(input: FinishHydrateInput<T>): T[] | undefined {
  if (input.currentSessionId !== input.sessionId) return undefined
  if (!isSessionHydrateCurrent(input.generation)) {
    return mergeHistoryKeepingOptimistic(input.dbMessages, input.liveMessages)
  }
  return pickHydratedMessages({
    dbMessages: input.dbMessages,
    liveMessages: input.liveMessages,
    sameSession: input.sameSession,
    running: input.running
  })
}

/** applySessionHydrate 的生产收口：有结果才写入 store。 */
export function applyFinishedHydrate<T extends HydrateMessage>(
  input: FinishHydrateInput<T>,
  setMessages: (messages: T[]) => void
): boolean {
  const next = finishSessionHydrate(input)
  if (next === undefined) return false
  setMessages(next)
  return true
}
