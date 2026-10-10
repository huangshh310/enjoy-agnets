/**
 * 渲染侧只消费 main 的可对话路线快照。向导末屏与发送闸共用。
 */
import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { getIde, hasIde } from "../lib/ide.ts"
import { rememberChatReadiness } from "./chat-readiness-cache.ts"

export const CHAT_READINESS_QUERY_KEY = ["chat-readiness"] as const

export function useChatReadiness() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: CHAT_READINESS_QUERY_KEY,
    enabled: hasIde(),
    queryFn: async () => {
      const snap = (await getIde().chat.readiness({})) as ChatReadiness
      rememberChatReadiness(snap)
      return snap
    }
  })
  useEffect(() => {
    if (query.data) rememberChatReadiness(query.data)
  }, [query.data])
  useEffect(() => {
    if (!hasIde()) return undefined
    const stop = getIde().chat.onReadiness((payload) => {
      const snap = payload as ChatReadiness
      rememberChatReadiness(snap)
      client.setQueryData(CHAT_READINESS_QUERY_KEY, snap)
    })
    return () => {
      stop()
    }
  }, [client])
  return query
}
