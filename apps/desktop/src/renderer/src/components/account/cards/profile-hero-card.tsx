/**
 * 个人中心 Hero：Canvas 封面、Blobatar、Share/Edit、年度贡献与热力图。
 */
import { useState } from "react"
import { RiCheckLine, RiEditLine, RiShareLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { BlobatarAvatar } from "../../avatar/blobatar-avatar"
import { ProfileActivityHeatmap } from "../charts/profile-activity-heatmap"
import { growthBadgeClass } from "../constants"
import { GlassCover } from "../glass/glass-cover"
import { formatContributionUsd } from "../lib/profile-metrics"
import type {
  ExtendedUserProfile,
  GlassCoverPreset,
  HeatmapCellData,
  HeatmapPeriod,
  ProfileMetricSummary
} from "../types/profile.types"

interface ProfileHeroCardProps {
  profile: ExtendedUserProfile
  summary: ProfileMetricSummary
  heatmapData: HeatmapCellData[]
  heatmapPeriod: HeatmapPeriod
  onPeriodChange: (period: HeatmapPeriod) => void
  onEditClick: () => void
  onAvatarClick?: () => void
  onCoverPresetChange?: (preset: GlassCoverPreset) => void
}

function KpiTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-separator-border/60 bg-background-secondary-default/50 p-3">
      <span className="text-title-3-semibold text-text-primary">{value}</span>
      <span className="text-caption-2-medium text-text-tertiary">{label}</span>
    </div>
  )
}

export function ProfileHeroCard({
  profile,
  summary,
  heatmapData,
  heatmapPeriod,
  onPeriodChange,
  onEditClick,
  onAvatarClick,
  onCoverPresetChange
}: ProfileHeroCardProps) {
  const t = useT()
  const [copiedShare, setCopiedShare] = useState(false)

  function handleShare() {
    const text = profile.handle ? `${profile.name} ${profile.handle}` : profile.name
    void navigator.clipboard.writeText(text)
    setCopiedShare(true)
    window.setTimeout(() => setCopiedShare(false), 1800)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-card">
      <GlassCover
        preset={profile.coverPreset}
        onPresetChange={onCoverPresetChange}
        height={210}
      />

      <div className="relative flex flex-col px-6 pb-6 pt-0">
        <div className="-mt-12 mb-3 flex items-end justify-between">
          <button
            type="button"
            onClick={onAvatarClick ?? onEditClick}
            className="group relative cursor-pointer overflow-hidden rounded-full bg-background-primary-default shadow-xl ring-4 ring-background-primary-default transition-transform hover:scale-105"
            title={t("pages.account.hero.avatarHint")}
          >
            <BlobatarAvatar config={profile.blobatarConfig} size={92} className="p-1" />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background-full/55 opacity-0 transition-opacity group-hover:opacity-100">
              <RiEditLine className="size-5 text-text-primary" />
            </div>
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 gap-1.5 px-3 text-caption-2-medium"
            >
              {copiedShare ? (
                <>
                  <RiCheckLine className="size-3.5 text-accent-500" />
                  <span>{t("pages.account.hero.copied")}</span>
                </>
              ) : (
                <>
                  <RiShareLine className="size-3.5 text-text-tertiary" />
                  <span>{t("pages.account.hero.share")}</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditClick}
              className="h-8 gap-1.5 px-3 text-caption-2-medium"
            >
              <RiEditLine className="size-3.5 text-text-tertiary" />
              <span>{t("pages.account.hero.edit")}</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-title-1-semibold text-text-primary">{profile.name}</h2>
            {profile.badgeText ? (
              <span className="inline-flex items-center rounded border border-accent-500/25 bg-accent-500/15 px-1.5 py-0.5 font-mono text-caption-2-medium text-accent-500">
                {profile.badgeText}
              </span>
            ) : null}
          </div>
          <p className="font-mono text-caption-1-medium text-text-tertiary">
            {profile.handle}
            {profile.roleTitle ? (
              <span className="text-text-secondary"> · {profile.roleTitle}</span>
            ) : null}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-separator-border/50 pt-5">
          <span className="text-caption-2-medium text-text-tertiary">{t("pages.account.hero.contributions")}</span>
          <div className="flex items-center gap-2">
            <span className="text-title-1-semibold tracking-tight text-text-primary">
              {formatContributionUsd(summary.contributionsCount)}
            </span>
            <span
              className={cx(
                "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-caption-2-medium",
                growthBadgeClass(summary.contributionsGrowth, "success")
              )}
            >
              {summary.contributionsGrowth}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-3.5 sm:grid-cols-4">
          <KpiTile value={summary.lifetimeTokens} label={t("pages.account.hero.lifetimeTokens")} />
          <KpiTile value={summary.peakTokens} label={t("pages.account.hero.peakTokens")} />
          <KpiTile value={summary.longestTaskDuration} label={t("pages.account.hero.longestTask")} />
          <KpiTile value={summary.topStreakDays} label={t("pages.account.hero.topStreak")} />
        </div>

        <div className="mt-4 border-t border-separator-border/50 pt-5">
          <ProfileActivityHeatmap
            data={heatmapData}
            period={heatmapPeriod}
            onPeriodChange={onPeriodChange}
          />
        </div>
      </div>
    </div>
  )
}
