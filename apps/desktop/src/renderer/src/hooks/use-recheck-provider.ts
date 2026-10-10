/**
 * 手动再验一把档案。进行中只标这一 id，不自动重试。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { parseCredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"
import { getIde, hasIde } from "../lib/ide"
import { showAppToast } from "../lib/app-toast"
import { useT } from "../i18n"

export function useRecheckProvider() {
  const queryClient = useQueryClient()
  const t = useT()
  const [pendingId, setPendingId] = useState<string | null>(null)
  return {
    pendingId,
    recheck: async (id: string) => {
      if (!hasIde() || pendingId) return
      setPendingId(id)
      try {
        const raw = await getIde().settings.recheckProvider({ id })
        await queryClient.invalidateQueries({ queryKey: ["settings"] })
        await queryClient.invalidateQueries({ queryKey: ["chat-readiness"] })
        const check = parseCredentialCheck(raw)
        if (check.state !== "ok") {
          showAppToast(t("settings.setupGuide.recheckStillUnreachable"), {
            tone: "error",
            testId: "credential-recheck-still-unreachable"
          })
        }
      } finally {
        setPendingId(null)
      }
    }
  }
}
