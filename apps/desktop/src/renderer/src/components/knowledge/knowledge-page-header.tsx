/**
 * 知识页 CompactHeader：诚实指标、添加来源（outline）、管理索引。
 */
import { RiAddLine, RiBookOpenLine, RiDatabase2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { KnowledgeStats } from "./types/knowledge-ui.types"

export function KnowledgePageHeader({
  stats,
  onOpenIndexDrawer,
  onAdd,
  onUnavailableClick
}: {
  stats: KnowledgeStats
  onOpenIndexDrawer: () => void
  onAdd: () => void
  onUnavailableClick?: () => void
}) {
  const t = useT()
  const isReady = stats.askableChunks > 0
  const hasFaulty = stats.unavailable.length > 0

  return (
    <header className="flex flex-col gap-4 border-b border-separator-border/50 pb-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10 text-accent-600 shadow-2xs dark:text-accent-400">
          <RiBookOpenLine className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 data-testid="page-knowledge" className="text-title-3-semibold text-text-primary">
              {t("pages.knowledge.title")}
            </h1>
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-caption-2-medium",
                isReady
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              {isReady
                ? t("pages.knowledge.askableBadge", { n: stats.askableChunks })
                : t("pages.knowledge.pendingIndex")}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-caption-2-regular text-text-tertiary">
            <span>{t("pages.knowledge.statsAskable", { n: stats.askableChunks })}</span>
            <span className="mx-1.5">·</span>
            <span>{t("pages.knowledge.statsScanned", { n: stats.scannedFiles })}</span>
            <span className="mx-1.5">·</span>
            <button
              type="button"
              className={cx(
                "cursor-pointer",
                hasFaulty && "text-amber-600 dark:text-amber-400"
              )}
              onClick={hasFaulty ? onUnavailableClick : undefined}
            >
              {hasFaulty
                ? t("pages.knowledge.statsUnavailable", { n: stats.unavailable.length })
                : t("pages.knowledge.statsAllReady")}
            </button>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenIndexDrawer}
          className="h-8 gap-1.5 px-3 text-caption-2-medium"
        >
          <RiDatabase2Line className="size-3.5 text-text-tertiary" />
          <span>{t("pages.knowledge.manageIndex")}</span>
        </Button>
        <Button
          size="sm"
          onClick={onAdd}
          className="h-8 gap-1.5 px-3.5 text-caption-2-medium shadow-xs"
        >
          <RiAddLine className="size-3.5" />
          <span>{t("pages.knowledge.addSource")}</span>
        </Button>
      </div>
    </header>
  )
}
