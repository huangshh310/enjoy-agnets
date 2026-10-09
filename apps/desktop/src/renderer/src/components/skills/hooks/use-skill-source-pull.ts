/**
 * 可选更新 Git 技能源：Skills 顶栏与设置卡片共用。
 * 不自动跑；无 Git 源时不渲染按钮。结果只走 toast，不抛堆栈。
 */
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { SkillSourceOverview, SkillSourceUpdateAllResult } from "@enjoy-agents/ipc-contract"
import { SkillSourceUpdateAllResult as UpdateAllResultSchema } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  countGitSkillSources,
  pullToastKind,
  SKILL_SOURCES_OVERVIEW_QUERY_KEY
} from "../lib/git-skill-sources"
import { useT } from "@renderer/i18n"
import { showSkillSourceToast } from "../lib/skill-source-toast"

export type SkillSourcePullState = {
  gitCount: number
  canPull: boolean
  busy: boolean
  pull: () => Promise<void>
}

export function useSkillSourcePull(): SkillSourcePullState {
  const t = useT()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const overviewQuery = useQuery({
    queryKey: SKILL_SOURCES_OVERVIEW_QUERY_KEY,
    enabled: hasIde(),
    queryFn: () => getIde().skills.sources.overview() as Promise<SkillSourceOverview>
  })

  const gitCount = countGitSkillSources(overviewQuery.data?.sources ?? [])
  const canPull = gitCount > 0

  async function pull(): Promise<void> {
    if (!hasIde() || !canPull || busy) return
    setBusy(true)
    try {
      const parsed = parseUpdateAll(await getIde().skills.sources.updateAll())
      await queryClient.invalidateQueries({ queryKey: SKILL_SOURCES_OVERVIEW_QUERY_KEY })
      const kind = pullToastKind(parsed)
      showSkillSourceToast(kind, parsed?.updatedCount ?? 0, t)
    } catch {
      showSkillSourceToast("missed", 0, t)
    } finally {
      setBusy(false)
    }
  }

  return { gitCount, canPull, busy, pull }
}

function parseUpdateAll(raw: unknown): SkillSourceUpdateAllResult | null {
  const parsed = UpdateAllResultSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}
