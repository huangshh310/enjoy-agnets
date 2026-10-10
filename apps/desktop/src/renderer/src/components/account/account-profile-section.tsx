/**
 * 个人中心全景看板：
 * 1. Hero 顶栏 (封面、头像、开发者身份、实时状态胶囊)
 * 2. 6 栏核心效能 KPI 磁贴条
 * 3. 生产力分析矩阵 (年度贡献与活跃度热力图 + 月度调度与 Token 双动态趋势图)
 * 4. 开发者生态、安全凭据与成长里程碑 (3 栏全维 Bento)
 */
import { useMemo, useState } from "react"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useChatStore } from "@renderer/stores/chat-store"
import { BlobatarPickerDialog } from "../avatar/blobatar-picker-dialog"
import { ProfileActivityCard } from "./cards/profile-activity-card"
import { ProfileEcosystemBento } from "./cards/profile-ecosystem-bento"
import { ProfileEditDialog } from "./cards/profile-edit-dialog"
import { ProfileHeroBanner } from "./cards/profile-hero-banner"
import { ProfileKpiStrip } from "./cards/profile-kpi-strip"
import { ProfileAgentsBarChart } from "./charts/profile-agents-bar-chart"
import { ProfileTokensAreaChart } from "./charts/profile-tokens-area-chart"
import { useAccountProfile } from "./hooks/use-account-profile"
import { useProfileAnalytics } from "./hooks/use-profile-analytics"

export function AccountProfileSection() {
  const { profile, save } = useAccountProfile()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const analytics = useProfileAnalytics()
  const snapshot = useSettingsSnapshot()
  const agentTools = snapshot.data?.agentTools ?? []
  const providers = snapshot.data?.providers ?? []
  const runtimeId = useChatStore((state) => state.runtimeId)
  const workspaceKind = useChatStore((state) => state.workspaceKind)
  const remoteLabel = useChatStore((state) => state.remoteLabel)
  const activeEndpoint = workspaceKind === "ssh" && remoteLabel ? remoteLabel : undefined
  const hasKey = useChatStore((state) => state.hasKey)
  const protectedVault = hasKey || profile.safeStorageActive

  const activeEngineLabel = useMemo(() => {
    const found = agentTools.find((t) => t.id === runtimeId)
    return found?.label ?? "Enjoy Local"
  }, [agentTools, runtimeId])

  const activeModelLabel = useMemo(() => {
    const activeProvider = providers.find((p) => p.active)
    return activeProvider?.modelId || activeProvider?.name
  }, [providers])

  return (
    <div className="flex w-full flex-col gap-4.5 select-none pb-12">
      {/* 1. 顶部全景 Hero 顶栏 */}
      <ProfileHeroBanner
        profile={profile}
        activeEngineLabel={activeEngineLabel}
        activeModelLabel={activeModelLabel}
        onEditClick={() => setEditDialogOpen(true)}
        onAvatarClick={() => setAvatarPickerOpen(true)}
        onCoverPresetChange={(coverPreset) => void save({ ...profile, coverPreset })}
      />

      {/* 2. 6 栏核心效能 KPI 磁贴栏 */}
      <ProfileKpiStrip
        summary={analytics.summary}
        totalAgentsCount={analytics.totalAgentsCount}
      />

      {/* 3. 生产力分析矩阵：活跃度热力图 + 两个趋势图并排 */}
      <div className="grid grid-cols-1 gap-4.5 xl:grid-cols-12 items-stretch">
        {/* 活跃度热力图 (7 栅格) */}
        <div className="xl:col-span-7 flex flex-col">
          <ProfileActivityCard
            summary={analytics.summary}
            heatmapData={analytics.heatmapData}
            heatmapPeriod={analytics.heatmapPeriod}
            onPeriodChange={analytics.setHeatmapPeriod}
          />
        </div>

        {/* 双趋势图表 (5 栅格) */}
        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
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
            totalTokensFormatted={analytics.summary.lifetimeTokens}
            growthRate={analytics.tokensGrowth}
          />
        </div>
      </div>

      {/* 4. 开发者生态、安全凭据与成长里程碑 (底栏 3 联卡片) */}
      <ProfileEcosystemBento
        profile={profile}
        summary={analytics.summary}
        agentTools={agentTools}
        providers={providers}
        protectedVault={protectedVault}
        activeEngineLabel={activeEngineLabel}
        activeModelLabel={activeModelLabel}
        activeEndpoint={activeEndpoint}
      />

      {/* 模态编辑框与头像配置框 */}
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
