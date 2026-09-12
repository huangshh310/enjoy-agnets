/**
 * Agent 专属整备舱头部卡片 (Agent Profile Header)。
 * 呈现助手身份象征、协议标准、运行时环境以及核心就绪状态。
 */
import {
  RiArrowRightLine,
  RiCompass3Line,
  RiCpuLine,
  RiFolderOpenLine,
  RiInformationLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import type { AgentArmoryProfile } from "../../constants/agent-armory.constants"

export function AgentProfileHeader({
  profile,
  activeCount,
  onGoToStore,
  onClearFilter
}: {
  profile: AgentArmoryProfile
  activeCount: number
  onGoToStore: () => void
  onClearFilter: () => void
}) {
  const t = useT()
  const Icon = profile.icon

  return (
    <div className="relative overflow-hidden rounded-3xl border border-separator-border/80 bg-background-primary-default p-6 shadow-card transition-all">
      {/* 顶部微光氛围装饰 */}
      <div
        className={cx(
          "pointer-events-none absolute -right-12 -top-12 size-56 rounded-full blur-3xl opacity-40 transition-opacity",
          profile.themeColor.bg
        )}
      />

      <div className="relative z-10 flex flex-col gap-5">
        {/* 第一行：身份标识 + 状态标签 + 快捷操作 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cx(
                "flex size-14 shrink-0 items-center justify-center rounded-2xl border shadow-xs transition-transform",
                profile.themeColor.bg,
                profile.themeColor.border,
                profile.themeColor.text
              )}
            >
              <Icon className="size-7" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-title-2-semibold tracking-tight text-text-primary">
                  {profile.name}
                </h2>
                <span
                  className={cx(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption-2-medium font-semibold",
                    profile.themeColor.pillBg,
                    profile.themeColor.border,
                    profile.themeColor.text
                  )}
                >
                  <RiShieldCheckLine className="size-3" />
                  <span>{profile.badgeText}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-background-secondary-default px-2.5 py-0.5 text-[11px] font-mono text-text-tertiary border border-separator-border/50">
                  <span
                    className={cx(
                      "size-1.5 rounded-full",
                      activeCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    )}
                  />
                  <span>{activeCount > 0 ? t("pages.skills.armoryHeader.activeBadge", { n: activeCount }) : t("pages.skills.armoryHeader.standbyBadge")}</span>
                </span>
              </div>
              <p className="max-w-2xl text-[13px] leading-relaxed text-text-secondary">
                {profile.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={onGoToStore}
              className="gap-1.5 h-8.5 px-3.5 text-caption-2-medium shadow-xs"
            >
              <RiCompass3Line className="size-3.5" />
              <span>{t("pages.skills.armoryHeader.goToStore")}</span>
              <RiArrowRightLine className="size-3 opacity-60" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClearFilter}
              className="h-8.5 text-caption-2-medium"
            >
              <span>{t("pages.skills.armoryHeader.viewAll")}</span>
            </Button>
          </div>
        </div>

        {/* 第二行：高密度技术参数标尺 (Spec Metrics Bar) */}
        <div className="grid gap-2.5 sm:grid-cols-3 pt-3 border-t border-separator-border/40 text-caption-2-regular">
          <div className="flex items-center gap-2 rounded-xl bg-background-secondary-default/50 px-3 py-2 border border-separator-border/40">
            <RiCpuLine className="size-4 text-text-tertiary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] text-text-tertiary">{t("pages.skills.armoryHeader.protocolLabel")}</span>
              <span className="font-mono text-text-primary text-[11.5px] truncate">
                {profile.protocol}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-background-secondary-default/50 px-3 py-2 border border-separator-border/40">
            <RiFolderOpenLine className="size-4 text-text-tertiary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] text-text-tertiary">{t("pages.skills.armoryHeader.projectDirLabel")}</span>
              <span className="font-mono text-text-primary text-[11.5px] truncate">
                {profile.runtimeEnv}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-background-secondary-default/50 px-3 py-2 border border-separator-border/40">
            <RiInformationLine className="size-4 text-text-tertiary shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10.5px] text-text-tertiary">{t("pages.skills.armoryHeader.tagsLabel")}</span>
              <div className="flex items-center gap-1 overflow-hidden">
                {profile.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-background-primary-default px-1.5 py-0.2 text-[10px] text-text-secondary border border-separator-border/40 shrink-0"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
