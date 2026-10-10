/**
 * 个人中心全宽 Hero 顶栏：Canvas 特效封面、头像浮动、开发者头衔、实时状态徽章与快捷操作。
 */
import { useState } from "react"
import {
  RiComputerLine,
  RiCpuLine,
  RiEditLine,
  RiRobot2Line,
  RiShareLine,
  RiShieldCheckLine,
  RiShieldLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useChatStore } from "@renderer/stores/chat-store"
import { profileOsName, vaultCopyKey, vaultFace } from "../lib/profile-face-copy"
import { BlobatarAvatar } from "../../avatar/blobatar-avatar"
import { GlassCover } from "../glass/glass-cover"
import { ProfileSharePosterDialog } from "./profile-share-poster-dialog"
import type { ExtendedUserProfile, GlassCoverPreset } from "../types/profile.types"

interface ProfileHeroBannerProps {
  profile: ExtendedUserProfile
  activeEngineLabel?: string
  activeModelLabel?: string
  onEditClick: () => void
  onAvatarClick?: () => void
  onCoverPresetChange?: (preset: GlassCoverPreset) => void
}

export function ProfileHeroBanner({
  profile,
  activeEngineLabel = "Enjoy Local",
  activeModelLabel,
  onEditClick,
  onAvatarClick,
  onCoverPresetChange
}: ProfileHeroBannerProps) {
  const t = useT()
  const [posterOpen, setPosterOpen] = useState(false)
  const hasKey = useChatStore((state) => state.hasKey)
  const storageOk = useChatReadiness().data?.secretStorageAvailable
  const face = vaultFace({ hasKey, secretStorageAvailable: storageOk })
  const protectedVault = face === "keychain"
  const currentDevice = profile.activeDevices.find((d) => d.isCurrent) ?? profile.activeDevices[0]
  const osName = profileOsName(currentDevice?.os)
  const computerLabel = osName
    ? t("pages.account.security.thisComputer", { os: osName })
    : t("pages.account.security.thisComputerOnly")

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-3xl border border-separator-border/80 bg-background-primary-default shadow-card">
      {/* 顶部动态着色器封面 */}
      <GlassCover
        preset={profile.coverPreset}
        onPresetChange={onCoverPresetChange}
        height={140}
      />

      {/* 个人身份与快捷状态栏 */}
      <div className="relative flex flex-col px-6 pb-6 pt-0">
        <div className="-mt-11 mb-3 flex flex-wrap items-end justify-between gap-4">
          {/* 头像 */}
          <div className="flex items-end gap-4">
            <button
              type="button"
              onClick={onAvatarClick ?? onEditClick}
              className="group relative cursor-pointer overflow-hidden rounded-full bg-background-primary-default shadow-xl ring-4 ring-background-primary-default transition-transform hover:scale-105"
              title={t("pages.account.hero.avatarHint")}
            >
              <BlobatarAvatar config={profile.blobatarConfig} size={82} className="p-1" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background-full/55 opacity-0 transition-opacity group-hover:opacity-100">
                <RiEditLine className="size-5 text-text-primary" />
              </div>
            </button>

            {/* 用户昵称与头衔 */}
            <div className="flex flex-col pb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-title-1-semibold text-text-primary">{profile.name}</h2>
                {profile.badgeText ? (
                  <span className="inline-flex items-center rounded-md border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 font-mono text-caption-2-semibold font-semibold text-accent-600 dark:text-accent-400">
                    {profile.badgeText}
                  </span>
                ) : null}
              </div>
              <p className="font-mono text-caption-1-medium text-text-tertiary">
                {profile.handle}
                {profile.roleTitle ? (
                  <span className="text-text-secondary"> · {profile.roleTitle}</span>
                ) : null}
                {profile.email ? (
                  <span className="text-text-placeholder"> · {profile.email}</span>
                ) : null}
              </p>
            </div>
          </div>

          {/* 右侧操作按钮组 */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPosterOpen(true)}
              className="h-8 gap-1.5 rounded-xl px-3 text-caption-2-medium cursor-pointer"
            >
              <RiShareLine className="size-3.5 text-accent-500" />
              <span>{t("pages.account.hero.share")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditClick}
              className="h-8 gap-1.5 rounded-xl px-3 text-caption-2-medium"
            >
              <RiEditLine className="size-3.5 text-text-tertiary" />
              <span>{t("pages.account.hero.edit")}</span>
            </Button>
          </div>
        </div>

        {/* 底部实时状态胶囊徽标行 */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-separator-border/60 pt-3">
          {/* 主力引擎 */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-medium font-medium text-text-secondary">
            <RiRobot2Line className="size-3.5 text-accent-500" />
            <span>引擎:</span>
            <span className="font-semibold text-text-primary">{activeEngineLabel}</span>
          </div>

          {/* 活跃模型 */}
          {activeModelLabel ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-medium font-medium text-text-secondary">
              <RiCpuLine className="size-3.5 text-accent-500" />
              <span>模型:</span>
              <span className="font-semibold text-text-primary">{activeModelLabel}</span>
            </div>
          ) : null}

          <div className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-medium font-medium text-text-secondary">
            {protectedVault ? (
              <RiShieldCheckLine className="size-3.5 text-state-success-text" />
            ) : (
              <RiShieldLine className="size-3.5 text-text-tertiary" />
            )}
            <span className={cx("font-semibold", protectedVault ? "text-state-success-text dark:text-state-success-text" : "text-text-tertiary")}>
              {t(vaultCopyKey(face))}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-medium font-medium text-text-secondary">
            <RiComputerLine className="size-3.5 text-accent-500" />
            <span className="font-semibold text-text-primary">{computerLabel}</span>
          </div>
        </div>
      </div>
    </div>
    <ProfileSharePosterDialog
      open={posterOpen}
      onOpenChange={setPosterOpen}
      profile={profile}
      activeEngineLabel={activeEngineLabel}
      activeModelLabel={activeModelLabel}
    />
  </>
  )
}
