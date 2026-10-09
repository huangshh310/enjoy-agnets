/**
 * 精选写入现有 SoT，并刷新 #/mcp / #/skills 查询。成功只报「已写入 Enjoy」。
 */
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { SKILL_SOURCES_OVERVIEW_QUERY_KEY } from "@renderer/components/skills/lib/git-skill-sources"
import { ipcErrorMessage } from "@renderer/components/skills/lib/ipc-error-message"
import { useT } from "@renderer/i18n"
import { showAppToast, APP_TOAST_MS } from "@renderer/lib/app-toast"
import { getIde, hasIde } from "@renderer/lib/ide"
import type { ExtensionCuratedCard } from "../extensions.types.ts"
import { EXTENSIONS_COPY } from "../extensions-copy.ts"
import { addCuratedToSot } from "./add-curated-to-sot.ts"
import type { CuratedSotIde } from "./curated.types.ts"

export function useCuratedAdd() {
  const t = useT()
  const queryClient = useQueryClient()
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function add(card: ExtensionCuratedCard) {
    if (!hasIde()) {
      setError("Enjoy Agents IPC 不可用，请完全重启应用后再试")
      return
    }
    setAddingId(card.id)
    setError(null)
    try {
      await addCuratedToSot(card, getIde() as CuratedSotIde)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mcp"] }),
        queryClient.invalidateQueries({ queryKey: SKILL_SOURCES_OVERVIEW_QUERY_KEY })
      ])
      showAppToast(t(EXTENSIONS_COPY.written), {
        id: "extensions-curated-toast",
        testId: "extensions-curated-toast",
        duration: APP_TOAST_MS
      })
    } catch (err) {
      setError(ipcErrorMessage(err))
    } finally {
      setAddingId(null)
    }
  }

  return { add, addingId, error }
}
