/**
 * 技能工作模块 UI 本地类型定义。
 */
import type {
  CuratedSkillSource,
  SkillSourceDetail,
  SkillSourceOverview,
  SkillSource,
  SkillTargetId,
  SkillSourceWarning
} from "@enjoy-agents/ipc-contract"

export type SkillsFilterTab = "all" | "curated" | `target:${SkillTargetId}` | string

export type SkillDocPreview = {
  name: string
  description?: string
  trigger?: string
  content: string
  skillFilePath?: string
}

export type SkillSourceUiState = {
  sources: SkillSource[]
  curated: CuratedSkillSource[]
  overview: SkillSourceOverview | undefined
  selectedNavId: string
  selectedSourceId: string | null
  detail: SkillSourceDetail | undefined
  activeSkillId: string | null
  warnings: SkillSourceWarning[]
  hasWorkspace: boolean
  searchQuery: string
  busy: boolean
  doctorOpen: boolean
  importOpen: boolean
}
