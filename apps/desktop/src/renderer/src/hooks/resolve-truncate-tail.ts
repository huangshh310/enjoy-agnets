/**
 * regenerate / edit-and-resend / rewind 开截前：读库，**只**按 runId 把占位气泡绑到同 run 的助手行
 * （bindPlaceholdersByRunId），再算名单。读库失败：不绑，占位气泡都不进名单（更保守）。
 * 这里不判断「对不对得上」——由 main 精确比对 + truncate-retry 决定，库里多出的行一律「有新内容」。
 */
import { getIde } from "../lib/ide"
import {
  bindPlaceholdersByRunId,
  runIdOfAssistantContent,
  tailIdsAfterKeep,
  tailIdsFromInclusive,
  type DbTailRow,
  type TailMessage
} from "./session-truncate-intent"

export async function resolveTruncateTail(input: {
  sessionId: string
  messages: ReadonlyArray<TailMessage>
  anchorId: string
  mode: "after" | "from"
}): Promise<string[]> {
  let bound: ReadonlyArray<TailMessage> = input.messages
  try {
    const rows = (await getIde().session.messages({ sessionId: input.sessionId })) as DbTailRow[]
    bound = bindPlaceholdersByRunId(input.messages, rows, runIdOfAssistantContent)
  } catch {
    // 读不到库：占位气泡不进名单。
  }
  return input.mode === "after"
    ? tailIdsAfterKeep(bound, input.anchorId)
    : tailIdsFromInclusive(bound, input.anchorId)
}
