/**
 * 渲染侧只消费 main 的可对话路线快照。向导末屏与发送闸共用。
 * defaultRoute 已在合约里，直接 parse，不要先剥字段。
 */
import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { getIde, hasIde } from "../lib/ide.ts"
import { consumeAdoptedHint, notifyAdoptedDefaultRoute } from "./adopted-default-route-toast.ts"
import { applyDefaultChatRoute } from "./apply-default-chat-route.ts"
import { notifyAdoptedDefaultRoute } from "./adopted-route-toast.ts"
import { rememberChatReadiness } from "./chat-readiness-cache.ts"

export const CHAT_READINESS_QUERY_KEY = ["chat-readiness"] as const

function acceptReadiness(raw: unknown): ChatReadiness | undefined {
  const parsed = ChatReadiness.safeParse(raw)
  if (!parsed.success) return undefined
  rememberChatReadiness(parsed.data)
  applyDefaultChatRoute(parsed.data)
  const name = consumeAdoptedHint(parsed.data.adoptedHint?.name)
  if (name) notifyAdoptedDefaultRoute(name)
  return parsed.data
}

export function useChatReadiness() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: CHAT_READINESS_QUERY_KEY,
    enabled: hasIde(),
    queryFn: async () => {
      const snap = acceptReadiness(await getIde().chat.readiness({}))
      if (!snap) throw new Error("chat.readiness snapshot rejected")
      return snap
    }
  })
  useEffect(() => {
    if (query.data) rememberChatReadiness(query.data)
  }, [query.data])
  useEffect(() => {
    if (!hasIde()) return undefined
    const stop = getIde().chat.onReadiness((payload) => {
      const snap = acceptReadiness(payload)
      if (snap) client.setQueryData(CHAT_READINESS_QUERY_KEY, snap)
    })
    const onFocus = () => {
      void client.invalidateQueries({ queryKey: CHAT_READINESS_QUERY_KEY })
    }
    window.addEventListener("focus", onFocus)
    return () => {
      stop()
      window.removeEventListener("focus", onFocus)
    }
  }, [client])
  return query
}
