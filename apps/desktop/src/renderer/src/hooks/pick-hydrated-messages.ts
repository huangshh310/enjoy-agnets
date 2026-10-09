/**
 * 会话回灌。sameSession 必须是 loadSession 开头的值，禁止在 await 后改写成 true：
 * 切会话只用库行；同会话才在空库 / running 且 live 更长时保住乐观气泡。
 */
import { mergeUserAssets, type AssetBearingMessage } from "./merge-user-assets.ts"

export type { AssetBearingMessage }

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
