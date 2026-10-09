/**
 * Agent 快速能力插槽装配矩阵 (Quick Slot Matrix)。
 * 来源组胶囊导入 / 卸下宿主目录，不按当前助手勾 13 家家目录。
 */
import { useMemo, useState } from "react"
import {
  RiCheckLine,
  RiFolderLine,
  RiGitRepositoryLine,
  RiSearchLine
} from "@remixicon/react"
import type { InstalledSkillItem, SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import type { AgentArmoryProfile } from "../../constants/agent-armory.constants"
import { hostCatalogEnabled } from "../../lib/skill-visible-for-target"

/** 整备舱胶囊只切换 Enjoy 全局宿主目录，不勾各家家目录。 */
const HOST_TOGGLE_TARGET: SkillTargetId = "enjoy-agents"

export function AgentQuickSlotMatrix({
  profile,
  sources,
  allSkills,
  busy,
  onToggleTarget,
  onSelectSkill
}: {
  profile: AgentArmoryProfile
  sources: SkillSource[]
  allSkills: InstalledSkillItem[]
  busy: boolean
  onToggleTarget: (source: SkillSource, targetId: SkillTargetId) => void
  onSelectSkill: (skill: InstalledSkillItem) => void
}) {
  const t = useT()
  const [searchQuery, setSearchQuery] = useState("")

  // 1. 过滤技能项
  const filteredSkills = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return allSkills
    return allSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.trigger?.toLowerCase().includes(q)
    )
  }, [allSkills, searchQuery])

  // 2. 统计已导入宿主目录的技能组数量（各家家目录不算装备）
  const enabledSourcesCount = sources.filter((s) => hostCatalogEnabled(s.enabledTargetIds)).length

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-separator-border/80 bg-background-primary-default p-6 shadow-2xs">
      {/* 标题与统计栏：全宽独占，绝不挤压文字 */}
      <div className="flex flex-col gap-1 pb-3 border-b border-separator-border/50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-title-3-semibold text-text-primary tracking-tight">
            {t("pages.skills.quickMatrix.title", { agent: profile.shortName })}
          </h3>
          <span className="text-caption-2-medium font-mono text-text-tertiary">
            {t("pages.skills.quickMatrix.activeCount", {
              enabled: enabledSourcesCount,
              total: sources.length
            })}
          </span>
        </div>
        <p className="text-caption-1-regular text-text-secondary leading-relaxed">
          {t("pages.skills.quickMatrix.summary", {
            sources: sources.length,
            skills: allSkills.length,
            agent: profile.shortName
          })}
        </p>
      </div>

      {/* 来源组导入宿主条：独立换行排布，杜绝并排推挤 */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-background-secondary-default/40 border border-separator-border/40">
        <span className="text-caption-2-semibold font-semibold text-text-tertiary shrink-0 mr-1">
          {t("pages.skills.quickMatrix.quickMountLabel")}
        </span>
        {sources.map((source) => {
          const isEnabled = hostCatalogEnabled(source.enabledTargetIds)
          return (
            <button
              key={source.id}
              type="button"
              disabled={busy}
              onClick={() => onToggleTarget(source, HOST_TOGGLE_TARGET)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-caption-2-medium transition-all cursor-pointer border",
                "active:scale-[0.98]",
                isEnabled
                  ? "border-state-success-text/40 bg-state-success-text/10 text-state-success-text dark:text-state-success-text font-semibold shadow-2xs"
                  : "border-separator-border/60 bg-background-primary-default text-text-secondary hover:border-separator-border hover:text-text-primary"
              )}
              title={t("pages.skills.quickMatrix.toggleTitle", {
                action: isEnabled
                  ? t("pages.skills.quickMatrix.unmount")
                  : t("pages.skills.quickMatrix.mount"),
                n: source.skillCount
              })}
            >
              {source.kind === "git" ? (
                <RiGitRepositoryLine className="size-3.5" />
              ) : (
                <RiFolderLine className="size-3.5" />
              )}
              <span className="max-w-[160px] truncate">{source.name}</span>
              {isEnabled ? (
                <RiCheckLine className="size-3 text-state-success-text dark:text-state-success-text" />
              ) : (
                <span className="text-caption-2-regular text-text-tertiary">+{source.skillCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 技能搜索与预设高频能力快速点选 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80 shrink-0">
          <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("pages.skills.quickMatrix.searchPlaceholder", { n: allSkills.length })}
            className="pl-9 h-8.5 text-caption-2-medium bg-background-secondary-default/50"
          />
        </div>

        {/* 预设推荐高频词点击直接过滤 */}
        <div className="flex flex-wrap items-center gap-1.5 text-caption-2-regular text-text-tertiary min-w-0">
          <span className="shrink-0">{t("pages.skills.quickMatrix.exploreLabel")}</span>
          {profile.suggestedSkillNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setSearchQuery(name)}
              className="rounded-md border border-separator-border/60 bg-background-secondary-default/40 px-2 py-0.5 font-mono text-caption-2-regular hover:border-separator-border hover:text-text-primary transition-colors cursor-pointer"
            >
              {name}
            </button>
          ))}
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-caption-2-regular text-accent-600 hover:underline"
            >
              {t("pages.skills.quickMatrix.clear")}
            </button>
          ) : null}
        </div>
      </div>

      {/* 高密度能力插槽卡片网格 */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSkills.map((skill) => {
          const isEnabled = hostCatalogEnabled(skill.enabledTargetIds)
          return (
            <div
              key={`${skill.sourceId}:${skill.id}`}
              onClick={() => onSelectSkill(skill)}
              className={cx(
                "group flex items-center justify-between gap-2.5 rounded-xl border p-3 transition-all cursor-pointer",
                isEnabled
                  ? "border-accent-500/30 bg-accent-500/5 shadow-2xs hover:border-accent-500/50"
                  : "border-separator-border/60 bg-background-secondary-default/30 hover:border-separator-border hover:bg-background-secondary-default/70"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cx(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border text-caption-2-medium font-mono transition-transform group-hover:scale-105",
                    isEnabled
                      ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
                      : "border-separator-border/60 bg-background-primary-default text-text-tertiary"
                  )}
                >
                  {skill.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-caption-2-medium font-semibold text-text-primary">
                      {skill.name}
                    </span>
                    {skill.trigger ? (
                      <span className="rounded bg-background-primary-default px-1 font-mono text-caption-2-regular text-text-tertiary border border-separator-border/50">
                        {skill.trigger}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-caption-2-regular text-text-tertiary">
                    {skill.description || t("pages.skills.quickMatrix.defaultDesc")}
                  </p>
                </div>
              </div>
              <span
                className={cx(
                  "text-caption-2-regular font-mono px-2 py-0.5 rounded-md border",
                  isEnabled
                    ? "border-state-success-text/30 bg-state-success-text/10 text-state-success-text dark:text-state-success-text font-semibold"
                    : "border-separator-border/50 bg-background-primary-default text-text-tertiary"
                )}
                title={t("pages.skills.quickMatrix.slotTitle")}
              >
                {isEnabled ? t("pages.skills.states.equipped") : t("pages.skills.states.notMounted")}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
