/**
 * 记忆脉冲卡。0 块主文案为「还不能问」，禁止全量重建与离线营销句。
 */
import type { ReactNode } from "react"
import { RiDatabase2Line, RiFileList3Line, RiFolderWarningLine, RiPlayListAddLine, RiToolsLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { KnowledgeStats } from "../../types/knowledge-ui.types"

export function KnowledgePulseCard({
  stats,
  indexing,
  indexDisabled,
  onOpenDrawer,
  onIndexCurrentLens
}: {
  stats: KnowledgeStats
  indexing: boolean
  indexDisabled: boolean
  onOpenDrawer: () => void
  onIndexCurrentLens?: () => void
}) {
  const t = useT()
  const isReady = stats.askableChunks > 0
  const unindexedCount = Math.max(0, stats.scannedFiles - stats.askableFiles)

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-separator-border/80 bg-background-primary-default p-6 shadow-card transition-all lg:col-span-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400">
              <RiDatabase2Line className="size-4" />
            </div>
            <h4 className="text-caption-1-medium text-text-primary">{t("pages.knowledge.memoryPulse")}</h4>
          </div>
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption-2-medium",
              isReady
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}
          >
            {isReady ? t("pages.knowledge.readyToAsk") : t("pages.knowledge.stillUnaskable")}
          </span>
        </div>
        <div>
          {isReady ? (
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-title-1-bold text-text-primary">
                {stats.askableChunks.toLocaleString()}
              </span>
              <span className="text-caption-1-medium text-text-tertiary">{t("pages.knowledge.askableChunks")}</span>
            </div>
          ) : (
            <p className="text-title-3-semibold text-text-primary">{t("pages.knowledge.stillUnaskable")}</p>
          )}
          <p className="mt-1 text-caption-2-regular text-text-secondary">
            {isReady
              ? t("pages.knowledge.coverage", { ready: stats.readySourceCount, total: stats.sourceCount })
              : t("pages.knowledge.indexToActivate")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 border-t border-separator-border/40 pt-2 text-caption-2-regular">
          <PulseMetric
            icon={<RiFileList3Line className="size-4 shrink-0 text-emerald-600" />}
            label={t("pages.knowledge.indexedDocs")}
            value={t("pages.knowledge.docsCount", { n: stats.askableFiles })}
          />
          <PulseMetric
            icon={<RiToolsLine className="size-4 shrink-0 text-amber-500" />}
            label={t("pages.knowledge.scannedOnlyDocs")}
            value={t("pages.knowledge.docsCount", { n: unindexedCount })}
          />
          <PulseMetric
            icon={
              <RiFolderWarningLine
                className={cx("size-4 shrink-0", stats.unavailable.length > 0 ? "text-rose-500" : "text-text-tertiary")}
              />
            }
            label={t("pages.knowledge.faultySources")}
            value={
              stats.unavailable.length > 0
                ? String(stats.unavailable.length)
                : t("pages.knowledge.noFault")
            }
          />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end border-t border-separator-border/50 pt-3.5">
        {!isReady ? (
          <Button
            size="sm"
            disabled={indexDisabled}
            onClick={onIndexCurrentLens || onOpenDrawer}
            className="h-7.5 gap-1.5 px-3 text-caption-2-medium shadow-xs"
          >
            <RiPlayListAddLine className={cx("size-3.5", indexing && "animate-spin")} />
            <span>{t("pages.knowledge.indexThisLens")}</span>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onOpenDrawer} className="h-7.5 px-3 text-caption-2-medium">
            {t("pages.knowledge.manageIndex")}
          </Button>
        )}
      </div>
    </div>
  )
}

function PulseMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-separator-border/40 bg-background-secondary-default/50 p-2.5">
      {icon}
      <div className="flex min-w-0 flex-col">
        <span className="text-caption-2-regular text-text-tertiary">{label}</span>
        <span className="truncate font-mono text-caption-1-medium text-text-primary">{value}</span>
      </div>
    </div>
  )
}
