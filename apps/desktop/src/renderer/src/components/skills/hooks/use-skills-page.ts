/**
 * 技能模块核心状态机与数据流 Hook。
 */
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiCompass3Line,
  RiFolderLine,
  RiGitRepositoryLine,
  RiPlugLine,
  RiSparklingLine
} from "@remixicon/react"
import type {
  CuratedSkillSource,
  SkillSourceDetail,
  SkillSourceOverview,
  SkillSource,
  SkillTargetId,
  SkillSourceWarning
} from "@enjoy-agents/ipc-contract"
import type { SecondaryNavGroup } from "@renderer/components/app-pages/secondary-nav.types"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  GLOBAL_TARGET_IDS,
  SKILLS_UI_COPY,
  TARGET_SHORT_LABELS
} from "../constants/skills-ui.constants"
import { CURATED_SKILL_SOURCES } from "../constants/skills-curated.constants"
import { ipcErrorMessage } from "../lib/ipc-error-message"

export type SkillsPageState = {
  sources: SkillSource[]
  curated: CuratedSkillSource[]
  overview: SkillSourceOverview | undefined
  warnings: SkillSourceWarning[]
  hasWorkspace: boolean
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
  busyMessage: string | null
  actionError: string | null
  setActionError: (error: string | null) => void
  navGroups: SecondaryNavGroup[]
  refreshAll: () => Promise<void>
  addGitSource: (origin: string, name?: string) => Promise<void>
  addLocalSource: () => Promise<void>
  installCurated: (curatedSource: CuratedSkillSource) => Promise<void>
  updateSource: (sourceId: string) => Promise<void>
  updateAllSources: () => Promise<void>
  deploySource: (sourceId: string) => Promise<void>
  repairTargets: (sourceId?: string) => Promise<void>
  removeSource: (sourceId: string) => Promise<void>
  deleteSkill: (sourceId: string, skillId: string) => Promise<void>
  toggleTarget: (source: SkillSource, targetId: SkillTargetId) => Promise<void>
  toggleSkill: (source: SkillSource, skillId: string) => Promise<void>
}

const OVERVIEW_QUERY_KEY = ["skills-sources-overview"] as const
const DOCTOR_QUERY_KEY = ["skills-sources-doctor"] as const
const CURATED_QUERY_KEY = ["skills-sources-curated"] as const
const DETAIL_QUERY_KEY = "skills-sources-detail"

export function useSkillsPage(): SkillsPageState {
  const queryClient = useQueryClient()
  const [selectedNavId, setSelectedNavId] = useState<string>("all")
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null)
  const [doctorOpen, setDoctorOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyMessage, setBusyMessage] = useState<string | null>(null)

  const overviewQuery = useQuery({
    queryKey: OVERVIEW_QUERY_KEY,
    enabled: hasIde(),
    queryFn: () => getIde().skills.sources.overview() as Promise<SkillSourceOverview>
  })

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
      queryClient.invalidateQueries({ queryKey: DOCTOR_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: [DETAIL_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: ["skills"] })
    ])
  }

  async function runAction(name: string, fn: () => Promise<void>) {
    if (!hasIde()) {
      setActionError("Enjoy Agents IPC 不可用，请完全重启应用后再试")
      return
    }
    setBusyMessage(name)
    setActionError(null)
    try {
      await fn()
      await refreshAll()
    } catch (err) {
      setActionError(ipcErrorMessage(err))
    } finally {
      setBusyMessage(null)
    }
  }

  // 1. 快速添加 Git 仓库
  async function addGitSource(origin: string, name?: string) {
    await runAction("添加技能组", async () => {
      await getIde().skills.sources.add({ kind: "git", origin: origin.trim(), name: name?.trim() })
    })
  }

  // 2. 选取本地文件夹
  async function addLocalSource() {
    await runAction("添加本地技能", async () => {
      const picked = await getIde().workspace.pickFolder()
      if (picked && typeof picked === "object" && "path" in picked && typeof picked.path === "string") {
        await getIde().skills.sources.add({
          kind: "local",
          origin: picked.path,
          name: "name" in picked && typeof picked.name === "string" ? picked.name : undefined
        })
      }
    })
  }

  async function installCurated(curatedSource: CuratedSkillSource) {
    await runAction(`导入 ${curatedSource.name}`, async () => {
      const added = (await getIde().skills.sources.add({
        kind: "git",
        origin: curatedSource.locator,
        name: curatedSource.name
      })) as { id?: string }
      if (typeof added?.id !== "string" || !added.id) {
        throw new Error("SOURCE_NOT_FOUND")
      }
      setSelectedNavId(added.id)
      await getIde().skills.sources.deploy({ sourceId: added.id })
    })
  }

  // 4. 更新来源
  async function updateSource(sourceId: string) {
    await runAction("拉取更新", async () => {
      await getIde().skills.sources.update({ sourceId })
    })
  }

  // 5. 更新所有来源
  async function updateAllSources() {
    await runAction("全量拉取更新", async () => {
      await getIde().skills.sources.updateAll()
    })
  }

  // 6. 重新部署来源
  async function deploySource(sourceId: string) {
    await runAction("重新部署", async () => {
      await getIde().skills.sources.deploy({ sourceId })
    })
  }

  // 7. 一键修复目标
  async function repairTargets(sourceId?: string) {
    await runAction("修复目标投影", async () => {
      await getIde().skills.sources.repair({ sourceId })
    })
  }

  // 8. 移除来源
  async function removeSource(sourceId: string) {
    await runAction("移除技能组", async () => {
      await getIde().skills.sources.remove({ sourceId })
      if (selectedNavId === sourceId) {
        setSelectedNavId("all")
      }
    })
  }

  async function deleteSkill(sourceId: string, skillId: string) {
    await runAction("删除技能", async () => {
      await getIde().skills.sources.deleteSkill({ sourceId, skillId })
      if (activeSkillId === skillId) setActiveSkillId(null)
    })
  }

  // 9. 切换目标开启状态
  async function toggleTarget(source: SkillSource, targetId: SkillTargetId) {
    const nextTargets = source.enabledTargetIds.includes(targetId)
      ? source.enabledTargetIds.filter((t) => t !== targetId)
      : [...source.enabledTargetIds, targetId]

    await runAction("切换目标", async () => {
      await getIde().skills.sources.configure({
        sourceId: source.id,
        selectedSkillIds: source.selectedSkillIds,
        enabledTargetIds: nextTargets
      })
    })
  }

  // 10. 切换技能勾选状态
  async function toggleSkill(source: SkillSource, skillId: string) {
    const nextSkills = source.selectedSkillIds.includes(skillId)
      ? source.selectedSkillIds.filter((s) => s !== skillId)
      : [...source.selectedSkillIds, skillId]

    await runAction("切换技能", async () => {
      await getIde().skills.sources.configure({
        sourceId: source.id,
        selectedSkillIds: nextSkills,
        enabledTargetIds: source.enabledTargetIds
      })
    })
  }

  // 构造情境栏导航列表
  const navGroups: SecondaryNavGroup[] = [
    {
      id: "overview",
      label: "工作流编排",
      items: [
        {
          id: "all",
          label: SKILLS_UI_COPY.allSources,
          icon: RiSparklingLine,
          meta: String(sources.length),
          keywords: ["all", "全部", "来源"]
        },
        {
          id: "curated",
          label: SKILLS_UI_COPY.exploreCurated,
          icon: RiCompass3Line,
          meta: String(curated.length),
          keywords: ["curated", "market", "精选", "推荐", "发现"]
        }
      ]
    },
    {
      id: "targets",
      label: SKILLS_UI_COPY.targetFilter,
      items: GLOBAL_TARGET_IDS.map((targetId) => {
        const count = sources.filter((s) => s.enabledTargetIds.includes(targetId)).length
        return {
          id: `target:${targetId}`,
          label: TARGET_SHORT_LABELS[targetId],
          icon: RiPlugLine,
          meta: count > 0 ? String(count) : undefined,
          keywords: [targetId, TARGET_SHORT_LABELS[targetId]]
        }
      })
    }
  ]

  if (sources.length > 0) {
    navGroups.push({
      id: "sources",
      label: SKILLS_UI_COPY.mySources,
      items: sources.map((source) => ({
        id: source.id,
        label: source.name,
        icon: source.kind === "git" ? RiGitRepositoryLine : RiFolderLine,
        meta: `${source.skillCount} 项`,
        keywords: [source.name, source.kind, source.origin]
      }))
    })
  }

  return {
    sources,
    curated,
    overview,
    warnings,
    hasWorkspace,
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
    busyMessage,
    actionError,
    setActionError,
    navGroups,
    refreshAll,
    addGitSource,
    addLocalSource,
    installCurated,
    updateSource,
    updateAllSources,
    deploySource,
    repairTargets,
    removeSource,
    deleteSkill,
    toggleTarget,
    toggleSkill
  }
}

