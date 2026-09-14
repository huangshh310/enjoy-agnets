/**
 * Agent 专属能力整备工作台 (Agent Armory View)。
 * 替换传统孤立、消极的空状态，为指定 Agent (如 Pi, Claude, Cursor) 构建一体化能力装配中心。
 */
import { useMemo } from "react"
import type {
  CuratedSkillSource,
  InstalledSkillItem,
  SkillSource,
  SkillTargetId
} from "@enjoy-agents/ipc-contract"
import { getAgentArmoryProfile } from "../../constants/agent-armory.constants"
import { skillVisibleForTarget } from "../../lib/skill-visible-for-target"
import { SkillItemCard } from "../skill-item-card"
import { AgentProfileHeader } from "./agent-profile-header"
import { AgentQuickSlotMatrix } from "./agent-quick-slot-matrix"
import { AgentRecommendedPacks } from "./agent-recommended-packs"
import { NativePluginCopy } from "@renderer/components/settings/agent-tools/native-plugin-copy"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"

export function AgentArmoryView({
  targetId,
  allSkills,
  sources,
  curated,
  busy,
  onGoToStore,
  onClearFilter,
  onInstallCurated,
  onToggleTarget,
  onSelectSkill
}: {
  targetId: SkillTargetId
  allSkills: InstalledSkillItem[]
  sources: SkillSource[]
  curated: CuratedSkillSource[]
  busy: boolean
  onGoToStore: () => void
  onClearFilter: () => void
  onInstallCurated: (source: CuratedSkillSource) => void
  onToggleTarget: (source: SkillSource, targetId: SkillTargetId) => void
  onSelectSkill: (skill: InstalledSkillItem) => void
}) {
  const profile = useMemo(() => getAgentArmoryProfile(targetId), [targetId])
  const t = useT()
  const nativeTool = useSettingsSnapshot().data?.agentTools.find((item) => item.id === targetId)

  const targetSkills = useMemo(
    () => allSkills.filter((s) => skillVisibleForTarget(s, targetId)),
    [allSkills, targetId]
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Agent Profile 身份与运行看板 */}
      <AgentProfileHeader
        profile={profile}
        activeCount={targetSkills.length}
        onGoToStore={onGoToStore}
        onClearFilter={onClearFilter}
      />
      {nativeTool?.nativePluginCopy ? <NativePluginCopy tool={nativeTool} /> : null}

      {/* 2. 模式分支：如果已有已激活技能，呈现专属技能矩阵；如果尚无技能，呈现全景整备舱 */}
      {targetSkills.length === 0 ? (
        <div className="flex flex-col gap-6">
          {/* 推荐超能力套件 (直接一键装备) */}
          <AgentRecommendedPacks
            profile={profile}
            curated={curated}
            sources={sources}
            busy={busy}
            onInstallCurated={onInstallCurated}
            onToggleTarget={(source) => onToggleTarget(source, "enjoy-agents")}
          />

          {/* 从全部已有技能库中快速勾选装配 */}
          <AgentQuickSlotMatrix
            profile={profile}
            sources={sources}
            allSkills={allSkills}
            busy={busy}
            onToggleTarget={onToggleTarget}
            onSelectSkill={onSelectSkill}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-3-semibold text-text-primary tracking-tight">
              {t("pages.skills.armoryHeader.activeBadge", { n: targetSkills.length })}
            </h3>
            <span className="text-caption-2-regular text-text-tertiary">
              {t("pages.skills.targets.hostDesc")}
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {targetSkills.map((skill) => (
              <SkillItemCard
                key={`${skill.sourceId}:${skill.id}`}
                skill={skill}
                onSelect={() => onSelectSkill(skill)}
              />
            ))}
          </div>

          {/* 底部折叠附赠快速装配插槽 */}
          <AgentQuickSlotMatrix
            profile={profile}
            sources={sources}
            allSkills={allSkills}
            busy={busy}
            onToggleTarget={onToggleTarget}
            onSelectSkill={onSelectSkill}
          />
        </div>
      )}
    </div>
  )
}
