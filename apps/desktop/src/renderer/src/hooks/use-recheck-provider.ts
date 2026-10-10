/**
 * 手动再验一把档案。进行中只标这一 id，不自动重试。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getIde, hasIde } from "@renderer/lib/ide"

export function useRecheckProvider() {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<string | null>(null)
  return {
    pendingId,
    recheck: async (id: string) => {
      if (!hasIde() || pendingId) return
      setPendingId(id)
      try {
        await getIde().settings.recheckProvider({ id })
        await queryClient.invalidateQueries({ queryKey: ["settings"] })
        await queryClient.invalidateQueries({ queryKey: ["chat-readiness"] })
      } finally {
        setPendingId(null)
      }
    }
  }
}
