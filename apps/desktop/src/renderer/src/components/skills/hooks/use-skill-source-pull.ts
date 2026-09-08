/**
 * 可选拉取 Git 技能源：设置、Skills 工具栏、空会话条共用。
 * 不自动跑；无 Git 源时 canPull=false。
 */
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { SkillSourceOverview, SkillSourceUpdateAllResult } from "@enjoy-agents/ipc-contract"
import { SkillSourceUpdateAllResult as UpdateAllResultSchema } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { ipcErrorMessage } from "../lib/ipc-error-message"
import {
  countGitSkillSources,
  shouldOfferSkillSourcePull,
  SKILL_SOURCES_OVERVIEW_QUERY_KEY
} from "../lib/git-skill-sources"

export type SkillSourcePullState = {
  gitCount: number
  canPull: boolean
  offerOnSession: boolean
  busy: boolean
  error: string | null
  lastResult: SkillSourceUpdateAllResult | null
  pull: () => Promise<SkillSourceUpdateAllResult | null>
  dismiss: () => void
}

export function useSkillSourcePull(): SkillSourcePullState {
  const queryClient = useQueryClient()
  const sessionId = useChatStore((state) => state.sessionId)
  const [dismissedSessionId, setDismissedSessionId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<SkillSourceUpdateAllResult | null>(null)

  const overviewQuery = useQuery({
    queryKey: SKILL_SOURCES_OVERVIEW_QUERY_KEY,
    enabled: hasIde(),
    queryFn: () => getIde().skills.sources.overview() as Promise<SkillSourceOverview>
  })

  const gitCount = countGitSkillSources(overviewQuery.data?.sources ?? [])
  const canPull = gitCount > 0
  const offerOnSession = shouldOfferSkillSourcePull({
    gitCount,
    dismissed: dismissedSessionId === sessionId,
    pulled: lastResult !== null
  })

  async function pull(): Promise<SkillSourceUpdateAllResult | null> {
    if (!hasIde() || !canPull) return null
    setBusy(true)
    setError(null)
    try {
      const parsed = UpdateAllResultSchema.parse(await getIde().skills.sources.updateAll())
      setLastResult(parsed)
      await queryClient.invalidateQueries({ queryKey: SKILL_SOURCES_OVERVIEW_QUERY_KEY })
      return parsed
    } catch (err) {
      setError(ipcErrorMessage(err))
      return null
    } finally {
      setBusy(false)
    }
  }

  return {
    gitCount,
    canPull,
    offerOnSession,
    busy,
    error,
    lastResult,
    pull,
    dismiss: () => setDismissedSessionId(sessionId)
  }
}
