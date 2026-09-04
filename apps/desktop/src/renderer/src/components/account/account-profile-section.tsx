/**
 * 个人中心看板入口：Hero、月份调度柱、Token 面积图、安全卡片。
 */
import { useMemo, useState } from "react"
import { useChatStore } from "@renderer/stores/chat-store"
import { BlobatarPickerDialog } from "../avatar/blobatar-picker-dialog"
import { DEFAULT_BLOBATAR_CONFIG } from "../avatar/blobatar.types"
import { ProfileEditDialog } from "./cards/profile-edit-dialog"
import { ProfileHeroCard } from "./cards/profile-hero-card"
import { ProfileSecurityCard } from "./cards/profile-security-card"
import { ProfileAgentsBarChart } from "./charts/profile-agents-bar-chart"
import { ProfileTokensAreaChart } from "./charts/profile-tokens-area-chart"
import { useProfileAnalytics } from "./hooks/use-profile-analytics"
import type { ExtendedUserProfile } from "./types/profile.types"

function slugHandle(name: string): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || "enjoy-agents"
  return `@${slug}`
}

function buildInitialProfile(userName: string, hasKey: boolean): ExtendedUserProfile {
  const name = userName.trim() || "Enjoy Engineer"
  return {
    name,
    handle: slugHandle(name),
    email: "",
    avatarLetter: name.slice(0, 1).toUpperCase(),
    roleTitle: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    joinedAt: "",
    safeStorageActive: hasKey,
    coverPreset: "glyph-rain",
    blobatarConfig: {
      ...DEFAULT_BLOBATAR_CONFIG,
      name
    },
    activeDevices: [
      {
        id: "local",
        name: "Enjoy Agents Desktop",
        os: navigator.platform || "Desktop",
        ip: "",
        lastActive: "",
        isCurrent: true
      }
    ]
  }
}

export function AccountProfileSection() {
  const userName = useChatStore((state) => state.userName)
  const hasKey = useChatStore((state) => state.hasKey)
  const [profile, setProfile] = useState<ExtendedUserProfile>(() =>
    buildInitialProfile(userName, hasKey)
  )
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const analytics = useProfileAnalytics()

  const resolvedProfile = useMemo(
    () => ({ ...profile, safeStorageActive: hasKey }),
    [profile, hasKey]
  )

  function handleSaveProfile(updated: ExtendedUserProfile) {
    setProfile(updated)
    if (updated.name && updated.name !== userName) {
      useChatStore.setState({ userName: updated.name })
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6 pb-8 select-none">
      <ProfileHeroCard
        profile={resolvedProfile}
        summary={analytics.summary}
        heatmapData={analytics.heatmapData}
        heatmapPeriod={analytics.heatmapPeriod}
        onPeriodChange={analytics.setHeatmapPeriod}
        onEditClick={() => setEditDialogOpen(true)}
        onAvatarClick={() => setAvatarPickerOpen(true)}
        onCoverPresetChange={(coverPreset) =>
          handleSaveProfile({ ...resolvedProfile, coverPreset })
        }
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

      <ProfileSecurityCard profile={resolvedProfile} />

      <ProfileEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={resolvedProfile}
        onSave={handleSaveProfile}
      />

      <BlobatarPickerDialog
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        value={resolvedProfile.blobatarConfig}
        onSave={(config) => handleSaveProfile({ ...resolvedProfile, blobatarConfig: config })}
      />
    </div>
  )
}
