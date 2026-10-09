/**
 * 会话回灌：空库或过期的 loadSession 不得抹掉进行中的乐观气泡。
 */
import { mergeUserAssets, type AssetBearingMessage } from "./merge-user-assets.ts"

export function pickHydratedMessages<T extends AssetBearingMessage>(input: {
  dbMessages: T[]
  liveMessages: T[]
  sameSession: boolean
  running: boolean
}): T[] {
  const { dbMessages, liveMessages, sameSession, running } = input
  if (!sameSession) return dbMessages
  if (liveMessages.length === 0) return mergeUserAssets(dbMessages, liveMessages)
  if (dbMessages.length === 0) return liveMessages
  if (running && liveMessages.length > dbMessages.length) return liveMessages
  return mergeUserAssets(dbMessages, liveMessages)
}
