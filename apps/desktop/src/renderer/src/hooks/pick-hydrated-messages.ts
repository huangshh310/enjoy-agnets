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
  if (!sameSession) return preferLiveToolProgress(dbMessages, liveMessages)
  if (liveMessages.length === 0) return mergeUserAssets(dbMessages, liveMessages)
  if (dbMessages.length === 0) return liveMessages
  if (running && liveMessages.length > dbMessages.length) return liveMessages
  return preferLiveToolProgress(mergeUserAssets(dbMessages, liveMessages), liveMessages)
}

/** 回灌不得用库里还停在 approval-requested 的快照盖掉已经折过的拒绝/结果。 */
export function preferLiveToolProgress<T extends AssetBearingMessage>(dbMessages: T[], liveMessages: T[]): T[] {
  if (liveMessages.length === 0) return dbMessages
  const liveById = new Map<string, T>()
  for (const message of liveMessages) {
    if (message.id) liveById.set(message.id, message)
  }
  return dbMessages.map((db) => {
    const live = db.id ? liveById.get(db.id) : undefined
    if (!live?.tools?.length) return db
    if (!toolsAhead(live.tools, db.tools)) return db
    return { ...db, tools: live.tools }
  })
}

function toolsAhead(
  live: Array<{ id: string; state: string }>,
  db: Array<{ id: string; state: string }> | undefined
): boolean {
  const dbById = new Map((db ?? []).map((tool) => [tool.id, tool]))
  return live.some((tool) => {
    const row = dbById.get(tool.id)
    return row?.state === "approval-requested" && tool.state !== "approval-requested"
  })
}
