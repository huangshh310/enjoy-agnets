/**
 * 已压缩态：前后对照、摘要预览、再次压缩 / 清除。
 */
import {
  RiSparklingLine,
  RiCheckLine,
  RiRefreshLine,
  RiRestartLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiFileCopyLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { formatTokens } from "../../../../agent-limits/agent-limits-calculator"
import { useT } from "@renderer/i18n"
import { relativeTime } from "@renderer/lib/time"
import type { SessionCompaction } from "./compaction.types"

export function CompactedBody({
  compaction,
  isCompacting,
  showSummary,
  copied,
  onToggleSummary,
  onCopySummary,
  onRecompact,
  onClear
}: {
  compaction: SessionCompaction
  isCompacting: boolean
  showSummary: boolean
  copied: boolean
  onToggleSummary: () => void
  onCopySummary: (text: string) => void
  onRecompact: () => void
  onClear: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          label={t("chat.inspectorCompactionBefore")}
          value={formatTokens(compaction.originalTokens)}
        />
        <MetricTile
          label={t("chat.inspectorCompactionAfter")}
          value={formatTokens(compaction.compactedTokens)}
        />
        <div className="flex flex-col gap-0.5 rounded-lg bg-background-secondary-default/70 p-2 border border-separator-border/40">
          <span className="text-caption-2-regular text-text-tertiary">
            {t("chat.inspectorCompactionSaved")}
          </span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="text-headline-medium font-semibold text-accent-600">
              -{formatTokens(compaction.savedTokens)}
            </span>
            <span className="text-caption-2-regular text-accent-600/80">
              ({compaction.savedPercent}%)
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg bg-background-secondary-default/70 p-2 border border-separator-border/40">
          <span className="text-caption-2-regular text-text-tertiary">
            {t("chat.inspectorCompactionRounds", { n: compaction.compactedMessageCount })}
          </span>
          <span className="font-mono text-caption-2-medium text-text-secondary">
            {relativeTime(compaction.compactedAt)}
          </span>
        </div>
      </div>

      <SummaryFold
        summary={compaction.summary}
        showSummary={showSummary}
        copied={copied}
        onToggle={onToggleSummary}
        onCopy={onCopySummary}
      />

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button
          type="button"
          disabled={isCompacting}
          onClick={onClear}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption-2-medium text-text-tertiary hover:text-text-primary hover:bg-background-secondary-hover transition-colors cursor-pointer disabled:opacity-50"
        >
          <RiRestartLine className="size-3.5" />
          <span>{t("chat.inspectorCompactionClear")}</span>
        </button>
        <button
          type="button"
          disabled={isCompacting}
          onClick={onRecompact}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background-secondary-default text-caption-2-medium text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover border border-separator-border/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RiRefreshLine className={cx("size-3.5", isCompacting && "animate-spin")} />
          <span>{t("chat.inspectorCompactionRecompact")}</span>
        </button>
      </div>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-background-secondary-default/70 p-2 border border-separator-border/40">
      <span className="text-caption-2-regular text-text-tertiary">{label}</span>
      <span className="font-mono text-headline-medium font-semibold text-text-primary">{value}</span>
    </div>
  )
}

function SummaryFold({
  summary,
  showSummary,
  copied,
  onToggle,
  onCopy
}: {
  summary: string
  showSummary: boolean
  copied: boolean
  onToggle: () => void
  onCopy: (text: string) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col rounded-lg border border-separator-border/50 bg-background-secondary-default/40 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between px-2.5 py-1.5 text-caption-2-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1">
          <RiSparklingLine className="size-3 text-accent-500" />
          <span>{t("chat.inspectorCompactionSummary")}</span>
        </span>
        {showSummary ? <RiArrowUpSLine className="size-3.5" /> : <RiArrowDownSLine className="size-3.5" />}
      </button>
      {showSummary ? (
        <div className="border-t border-separator-border/40 p-2.5 bg-background-primary-default/60">
          <div className="flex justify-end pb-1">
            <button
              type="button"
              onClick={() => onCopy(summary)}
              className="inline-flex items-center gap-1 text-caption-2-regular text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              {copied ? <RiCheckLine className="size-3 text-accent-500" /> : <RiFileCopyLine className="size-3" />}
              <span>{copied ? t("chat.inspectorCompactionCopied") : t("chat.inspectorCompactionCopy")}</span>
            </button>
          </div>
          <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap font-mono text-caption-2-regular text-text-secondary leading-relaxed select-text">
            {summary}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
