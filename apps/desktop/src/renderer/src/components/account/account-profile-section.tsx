/**
 * 个人中心看板入口：Hero、月份调度柱、Token 面积图、安全卡片。
 */
import { useState } from "react"
import { BlobatarPickerDialog } from "../avatar/blobatar-picker-dialog"
import { ProfileEditDialog } from "./cards/profile-edit-dialog"
import { ProfileHeroCard } from "./cards/profile-hero-card"
import { ProfileSecurityCard } from "./cards/profile-security-card"
import { ProfileAgentsBarChart } from "./charts/profile-agents-bar-chart"
import { ProfileTokensAreaChart } from "./charts/profile-tokens-area-chart"
import { useAccountProfile } from "./hooks/use-account-profile"
import { useProfileAnalytics } from "./hooks/use-profile-analytics"

export function AccountProfileSection() {
  const { profile, save } = useAccountProfile()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const analytics = useProfileAnalytics()

  return (
    <div className="flex max-w-4xl flex-col gap-6 pb-8 select-none">
      <ProfileHeroCard
        profile={profile}
        summary={analytics.summary}
        heatmapData={analytics.heatmapData}
        heatmapPeriod={analytics.heatmapPeriod}
        onPeriodChange={analytics.setHeatmapPeriod}
        onEditClick={() => setEditDialogOpen(true)}
        onAvatarClick={() => setAvatarPickerOpen(true)}
        onCoverPresetChange={(coverPreset) => void save({ ...profile, coverPreset })}
      />

      <ProfileAgentsBarChart
        points={analytics.agentBarPoints}
        totalAgentsCount={analytics.totalAgentsCount}
        currentMonthLabel={analytics.currentMonthLabel}
        canGoNextMonth={analytics.canGoNextMonth}
        onPrevMonth={analytics.goPrevMonth}
        onNextMonth={analytics.goNextMonth}
      />

      <ProfileTokensAreaChart
        points={analytics.tokenTrendPoints}
        totalTokensFormatted={`${analytics.summary.lifetimeTokens} tokens`}
        growthRate={analytics.tokensGrowth}
      />

      <ProfileSecurityCard profile={profile} />

      <ProfileEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={profile}
        onSave={(updated) => void save(updated)}
      />

      <BlobatarPickerDialog
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        value={profile.blobatarConfig}
        onSave={(config) => void save({ ...profile, blobatarConfig: config })}
      />
    </div>
  )
}
