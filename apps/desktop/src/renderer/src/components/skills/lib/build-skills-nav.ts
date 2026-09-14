/**
 * 技能模块情境栏导航组构建。
 */
import {
  RiCompass3Line,
  RiFolderLine,
  RiGitRepositoryLine,
  RiSparklingLine
} from "@remixicon/react"
import type { InstalledSkillItem, SkillSource } from "@enjoy-agents/ipc-contract"
import { skillVisibleForTarget } from "./skill-visible-for-target.ts"
import type { SecondaryNavGroup } from "@renderer/components/app-pages/secondary-nav.types"
import { AGENT_ARMORY_PROFILES, getAgentArmoryProfile } from "../constants/agent-armory.constants"
import { GLOBAL_TARGET_IDS, TARGET_SHORT_LABELS } from "../constants/skills-ui.constants"

export function buildSkillsNavGroups({
  allSkills,
  sources,
  installedCount
}: {
  allSkills: InstalledSkillItem[]
  sources: SkillSource[]
  installedCount: number
}): SecondaryNavGroup[] {
  const groups: SecondaryNavGroup[] = [
    {
      id: "overview",
      label: "技能中心",
      items: [
        {
          id: "curated",
          label: "精选集市",
          icon: RiCompass3Line,
          meta: "Store",
          keywords: ["curated", "market", "store", "精选", "集市", "发现"]
        },
        {
          id: "all",
          label: "全部能力库",
          icon: RiSparklingLine,
          meta: String(allSkills.length || installedCount || sources.length),
          keywords: ["all", "全部", "已安装", "我的技能", "能力"]
        },
        {
          id: "packs",
          label: "技能包合集",
          icon: RiFolderLine,
          meta: String(sources.length),
          keywords: ["packs", "groups", "合集", "来源组", "安装包"]
        }
      ]
    },
    {
      id: "targets",
      label: "按助手查看",
      items: GLOBAL_TARGET_IDS.map((targetId) => {
        const count = allSkills.filter((s) => skillVisibleForTarget(s, targetId)).length
        const profile = AGENT_ARMORY_PROFILES[targetId] ?? getAgentArmoryProfile(targetId)
        return {
          id: `target:${targetId}`,
          label: TARGET_SHORT_LABELS[targetId],
          icon: profile.icon,
          meta: count > 0 ? `${count}` : "0",
          keywords: [targetId, TARGET_SHORT_LABELS[targetId], profile.name]
        }
      })
    }
  ]

  if (sources.length > 0) {
    groups.push({
      id: "sources",
      label: "已安装技能组",
      items: sources.map((source) => ({
        id: source.id,
        label: source.name,
        icon: source.kind === "git" ? RiGitRepositoryLine : RiFolderLine,
        meta: `${source.skillCount} 项`,
        keywords: [source.name, source.kind, source.origin]
      }))
    })
  }

  return groups
}
