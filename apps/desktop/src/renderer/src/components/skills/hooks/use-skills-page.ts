/**
 * 技能模块核心状态机与数据流 Hook。
 */
import { useState } from "react"
import { useSkillsRouteSearch } from "./use-skills-route-search"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CuratedSkillSource,
  InstalledSkillItem,
  SkillSourceDetail,
  SkillSourceOverview,
  SkillSource,
  SkillTargetId,
  SkillSourceWarning
} from "@enjoy-agents/ipc-contract"
import type { SecondaryNavGroup } from "@renderer/components/app-pages/secondary-nav.types"
import { getIde, hasIde } from "@renderer/lib/ide"
import { CURATED_SKILL_SOURCES } from "../constants/skills-curated.constants"
import { buildSkillsNavGroups } from "../lib/build-skills-nav"
import { SKILL_SOURCES_OVERVIEW_QUERY_KEY } from "../lib/git-skill-sources"
import { createSkillsPageActions } from "./use-skills-page-actions"

export type SkillsPageState = {
  sources: SkillSource[]
  allSkills: InstalledSkillItem[]
  curated: CuratedSkillSource[]
  overview: SkillSourceOverview | undefined
  warnings: SkillSourceWarning[]
  hasWorkspace: boolean
  workspacePath: string | undefined
  selectedNavId: string
  setSelectedNavId: (id: string) => void
  selectedSourceId: string | null
  detail: SkillSourceDetail | undefined
  activeSkillId: string | null
  setActiveSkillId: (id: string | null) => void
  doctorOpen: boolean
  setDoctorOpen: (open: boolean) => void
  importOpen: boolean
  setImportOpen: (open: boolean) => void
  createSkillOpen: boolean
  setCreateSkillOpen: (open: boolean) => void
  busyMessage: string | null
  actionError: string | null
  setActionError: (error: string | null) => void
  navGroups: SecondaryNavGroup[]
  refreshAll: () => Promise<void>
  addGitSource: (origin: string, name?: string) => Promise<void>
  addLocalSource: () => Promise<void>
  installCurated: (curatedSource: CuratedSkillSource) => Promise<void>
  updateSource: (sourceId: string) => Promise<void>
  deploySource: (sourceId: string) => Promise<void>
  repairTargets: (sourceId?: string) => Promise<void>
  removeSource: (sourceId: string) => Promise<void>
  deleteSkill: (sourceId: string, skillId: string) => Promise<void>
  toggleTarget: (source: SkillSource, targetId: SkillTargetId) => Promise<void>
  toggleSkill: (source: SkillSource, skillId: string) => Promise<void>
}

const OVERVIEW_QUERY_KEY = SKILL_SOURCES_OVERVIEW_QUERY_KEY
const ALL_SKILLS_QUERY_KEY = ["skills-sources-all"] as const
const DOCTOR_QUERY_KEY = ["skills-sources-doctor"] as const
const CURATED_QUERY_KEY = ["skills-sources-curated"] as const
const DETAIL_QUERY_KEY = "skills-sources-detail"

export function useSkillsPage(): SkillsPageState {
  const queryClient = useQueryClient()
  const [selectedNavId, setSelectedNavId] = useState<string>("all")
  useSkillsRouteSearch(setSelectedNavId)
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null)
  const [doctorOpen, setDoctorOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [createSkillOpen, setCreateSkillOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyMessage, setBusyMessage] = useState<string | null>(null)

  const overviewQuery = useQuery({
    queryKey: OVERVIEW_QUERY_KEY,
    enabled: hasIde(),
    queryFn: () => getIde().skills.sources.overview() as Promise<SkillSourceOverview>
  })
  const allSkillsQuery = useQuery({
    queryKey: ALL_SKILLS_QUERY_KEY,
    enabled: hasIde(),
    queryFn: () => getIde().skills.sources.all() as Promise<InstalledSkillItem[]>
  })
  const allSkills = allSkillsQuery.data ?? []

  const doctorQuery = useQuery({
    queryKey: DOCTOR_QUERY_KEY,
    enabled: hasIde(),
    queryFn: () => getIde().skills.sources.doctor() as Promise<SkillSourceWarning[]>
  })

  const curatedQuery = useQuery({
    queryKey: CURATED_QUERY_KEY,
    enabled: hasIde(),
    queryFn: () => getIde().skills.sources.curated() as Promise<CuratedSkillSource[]>
  })

  const workspaceQuery = useQuery({
    queryKey: ["workspaces"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.list() as Promise<Array<{ id: string; rootPath: string }>>
  })

  const sources = overviewQuery.data?.sources ?? []
  const overview = overviewQuery.data
  const curated = (curatedQuery.data && curatedQuery.data.length > 0) ? curatedQuery.data : CURATED_SKILL_SOURCES
  const warnings = doctorQuery.data ?? []
  const hasWorkspace = (workspaceQuery.data?.length ?? 0) > 0
  const workspacePath = workspaceQuery.data?.[0]?.rootPath
  // 当前如果是选中的具体来源组
  const isSourceDetail = sources.some((s) => s.id === selectedNavId)
  const selectedSourceId = isSourceDetail ? selectedNavId : null

  const detailQuery = useQuery({
    queryKey: [DETAIL_QUERY_KEY, selectedSourceId],
    enabled: hasIde() && Boolean(selectedSourceId),
    queryFn: () =>
      getIde().skills.sources.detail({ sourceId: selectedSourceId! }) as Promise<SkillSourceDetail>
  })

  const detail = detailQuery.data

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ALL_SKILLS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DOCTOR_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: [DETAIL_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: ["skills"] })
    ])
  }

  const actions = createSkillsPageActions({
    selectedNavId,
    activeSkillId,
    setSelectedNavId,
    setActiveSkillId,
    setBusyMessage,
    setActionError,
    refreshAll
  })

  const navGroups = buildSkillsNavGroups({
    allSkills,
    sources,
    installedCount: overview?.installedCount ?? 0
  })

  return {
    sources,
    allSkills,
    curated,
    overview,
    warnings,
    hasWorkspace,
    workspacePath,
    selectedNavId,
    setSelectedNavId,
    selectedSourceId,
    detail,
    activeSkillId,
    setActiveSkillId,
    doctorOpen,
    setDoctorOpen,
    importOpen,
    setImportOpen,
    createSkillOpen,
    setCreateSkillOpen,
    busyMessage,
    actionError,
    setActionError,
    navGroups,
    refreshAll,
    ...actions
  }
}

