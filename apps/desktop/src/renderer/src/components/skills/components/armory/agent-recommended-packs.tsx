/**
 * Agent 专属推荐技能套件 (Recommended Skill Packs)。
 * 针对当前助手专长特点，展示匹配度最高的核心能力包并提供一键装配流。
 */
import { useMemo } from "react"
import {
  RiCheckLine,
  RiDownloadLine,
  RiLoader4Line,
  RiShieldCheckLine,
  RiStarFill
} from "@remixicon/react"
import type { CuratedSkillSource, SkillSource } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { AgentArmoryProfile } from "../../constants/agent-armory.constants"
import { resolveSkillTheme } from "../../constants/skills-badge-theme"
import { hostCatalogEnabled } from "../../lib/skill-visible-for-target"

export function AgentRecommendedPacks({
  profile,
  curated,
  sources,
  busy,
  onInstallCurated,
  onToggleTarget
}: {
  profile: AgentArmoryProfile
  curated: CuratedSkillSource[]
  sources: SkillSource[]
  busy: boolean
  onInstallCurated: (source: CuratedSkillSource) => void
  onToggleTarget: (source: SkillSource) => void
}) {
  const t = useT()
  const AgentIcon = profile.icon

  // 筛选出针对当前 Agent 推荐的精选套件
  const recommendedItems = useMemo(() => {
    const list = curated.filter((c) => profile.recommendedCuratedIds.includes(c.id))
    return list.length > 0 ? list : curated.slice(0, 3)
  }, [curated, profile.recommendedCuratedIds])

  // 映射已安装的源
  const installedSourceMap = useMemo(() => {
    const map = new Map<string, SkillSource>()
    for (const s of sources) {
      map.set(s.origin.toLowerCase(), s)
      map.set(s.name.toLowerCase(), s)
      map.set(s.id.toLowerCase(), s)
    }
    return map
  }, [sources])

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AgentIcon className="size-4" />
          <h3 className="text-title-3-semibold tracking-tight text-text-primary">
            {t("pages.skills.recommendedPacks.title", { agent: profile.shortName })}
          </h3>
        </div>
        <span className="text-caption-2-regular text-text-tertiary">
          {t("pages.skills.recommendedPacks.plugHint")}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendedItems.map((item) => {
          const installedSource =
            installedSourceMap.get(item.locator.toLowerCase()) ||
            installedSourceMap.get(item.name.toLowerCase()) ||
            installedSourceMap.get(item.id.toLowerCase())

          const isInstalled = Boolean(installedSource)
          const isTargetEnabled = installedSource
            ? hostCatalogEnabled(installedSource.enabledTargetIds)
            : false

          const theme = resolveSkillTheme(item.id || item.title)
          const ThemeIcon = theme.icon

          return (
            <div
              key={item.id}
              className={cx(
                "group relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all",
                "border-separator-border/80 bg-background-primary-default shadow-2xs hover:border-separator-border hover:shadow-card hover:-translate-y-0.5"
              )}
            >
              <div className="flex flex-col gap-3">
                {/* 顶部标徽 + 标题 + Stars */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cx(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-2xs transition-transform group-hover:scale-105",
                        theme.badgeBg,
                        theme.badgeText,
                        theme.badgeBorder
                      )}
                    >
                      <ThemeIcon className="size-5.5" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-body-medium font-semibold text-text-primary tracking-tight">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">
                        <span className="truncate">{item.author}</span>
                        <span>·</span>
                        <span className="text-state-success-text dark:text-state-success-text font-medium">
                          {t("pages.skills.states.curated")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.stars ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-status-yellow-background/10 px-2 py-0.5 text-caption-2-medium font-mono font-medium text-status-yellow-text dark:text-status-yellow-text border border-status-yellow-text/20 shrink-0">
                      <RiStarFill className="size-2.5 text-status-yellow-text" />
                      {item.stars.toLocaleString()}
                    </span>
                  ) : null}
                </div>

                {/* 描述 */}
                <p className="text-caption-1-regular leading-relaxed text-text-secondary line-clamp-2 min-h-[36px]">
                  {item.description}
                </p>

                {/* 关键技能药丸 */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {item.featuredSkills.slice(0, 3).map((skillName) => (
                    <span
                      key={skillName}
                      className="rounded-md border border-separator-border/60 bg-background-secondary-default/50 px-2 py-0.5 text-caption-2-regular font-mono text-text-secondary"
                    >
                      {skillName}
                    </span>
                  ))}
                  {item.featuredSkills.length > 3 ? (
                    <span className="rounded-md bg-background-secondary-default/30 px-1.5 py-0.5 text-caption-2-regular text-text-tertiary">
                      +{item.featuredSkills.length - 3}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* 底部装备按钮 */}
              <div className="mt-4 pt-3 border-t border-separator-border/50 flex items-center justify-between">
                <span className="text-caption-2-regular text-text-tertiary">
                  {t("pages.skills.recommendedPacks.countSkills", { n: item.skillCount ?? "" })}
                </span>

                {isTargetEnabled ? (
                  <div className="inline-flex items-center gap-1 text-caption-2-semibold font-semibold text-state-success-text dark:text-state-success-text">
                    <RiCheckLine className="size-3.5" />
                    <span>{t("pages.skills.recommendedPacks.equippedTo")}</span>
                  </div>
                ) : isInstalled && installedSource ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => onToggleTarget(installedSource)}
                    className="h-7.5 px-3 text-caption-2-medium gap-1 shadow-2xs"
                  >
                    <RiShieldCheckLine className="size-3" />
                    <span>{t("pages.skills.recommendedPacks.linkTo")}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => onInstallCurated(item)}
                    className="h-7.5 px-3 text-caption-2-medium gap-1 shadow-2xs"
                  >
                    {busy ? (
                      <RiLoader4Line className="size-3 animate-spin" />
                    ) : (
                      <RiDownloadLine className="size-3" />
                    )}
                    <span>{t("pages.skills.recommendedPacks.getAndEquip")}</span>
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
