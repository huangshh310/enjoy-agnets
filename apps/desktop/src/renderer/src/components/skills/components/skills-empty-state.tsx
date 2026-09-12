/**
 * 全局技能空态引导卡片 (Skills Empty State)。
 * 告别晦涩的开发表单，采用温暖、高质感的 C 端导流与装配引导设计。
 */
import {
  RiArrowRightLine,
  RiCompass3Line,
  RiFolderOpenLine,
  RiSparklingLine
} from "@remixicon/react"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { Button } from "@/components/ui/button"
import { TARGET_SHORT_LABELS } from "../constants/skills-ui.constants"

export function SkillsEmptyState({
  activeTargetId,
  onClearTargetFilter,
  onGoToStore,
  onPickFolder
}: {
  activeTargetId?: SkillTargetId | null
  onClearTargetFilter?: () => void
  onGoToStore?: () => void
  onPickFolder: () => void
}) {
  const t = useT()
  const agentLabel = activeTargetId ? TARGET_SHORT_LABELS[activeTargetId] : null

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border border-separator-border/80 bg-background-primary-default p-12 text-center shadow-card">
      <div className="pointer-events-none absolute -top-12 size-48 rounded-full bg-accent-500/10 blur-3xl" />

      <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-700 dark:text-accent-300 border border-accent-500/30 mb-4 shadow-xs">
        <RiSparklingLine className="size-7" />
      </div>

      <h3 className="relative z-10 text-title-3-semibold text-text-primary tracking-tight mb-2">
        {agentLabel
          ? t("pages.skills.emptyState.titleNamed", { agent: agentLabel })
          : t("pages.skills.emptyState.titleGeneric")}
      </h3>

      <p className="relative z-10 max-w-md text-caption-1-regular text-text-secondary leading-relaxed mb-6">
        {agentLabel
          ? t("pages.skills.emptyState.descNamed", { agent: agentLabel })
          : t("pages.skills.emptyState.descGeneric")}
      </p>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        {onGoToStore ? (
          <Button
            size="sm"
            onClick={onGoToStore}
            className="gap-1.5 h-8.5 px-4 text-caption-2-medium shadow-xs"
          >
            <RiCompass3Line className="size-4" />
            <span>{t("pages.skills.emptyState.exploreStore")}</span>
            <RiArrowRightLine className="size-3.5 opacity-70" />
          </Button>
        ) : null}

        {activeTargetId && onClearTargetFilter ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onClearTargetFilter}
            className="h-8.5 text-caption-2-medium"
          >
            <span>{t("pages.skills.emptyState.viewAllInstalled")}</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onPickFolder}
            className="gap-1.5 h-8.5 text-caption-2-medium"
          >
            <RiFolderOpenLine className="size-4 text-text-tertiary" />
            <span>{t("pages.skills.emptyState.pickFolder")}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
