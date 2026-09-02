/**
 * 上下文检查器：会话压缩卡片。
 */
import { useState } from "react"
import { RiSparklingLine } from "@remixicon/react"
import { DEFAULT_KEEP_RECENT } from "@enjoy-agents/agent-core/compaction"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { useSessionCompaction } from "./use-session-compaction"
import { CompactedBody } from "./compaction-card-compacted"
import { UncompactedBody } from "./compaction-card-idle"
import type { CompactionCardProps } from "./compaction.types"

export function InspectorCompactionCard({ sessionId, messageCount }: CompactionCardProps) {
  const { compaction, isCompacting, compact, clearCompaction } = useSessionCompaction(sessionId)
  const [showSummary, setShowSummary] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopySummary = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 剪贴板失败静默
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
      <CompactionCardHeader isCompacted={Boolean(compaction)} />
      {compaction ? (
        <CompactedBody
          compaction={compaction}
          isCompacting={isCompacting}
          showSummary={showSummary}
          copied={copied}
          onToggleSummary={() => setShowSummary((prev) => !prev)}
          onCopySummary={handleCopySummary}
          onRecompact={() => void compact(DEFAULT_KEEP_RECENT)}
          onClear={() => void clearCompaction()}
        />
      ) : (
        <UncompactedBody
          messageCount={messageCount}
          isCompacting={isCompacting}
          onCompact={() => void compact(DEFAULT_KEEP_RECENT)}
        />
      )}
    </section>
  )
}

function CompactionCardHeader({ isCompacted }: { isCompacted: boolean }) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
        <RiSparklingLine className="size-4 text-accent-500" />
        <span>{t("chat.inspectorCompactionTitle")}</span>
      </div>
      <span
        className={cx(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption-2-medium font-mono",
          isCompacted
            ? "bg-accent-500/10 text-accent-600"
            : "bg-background-secondary-default text-text-tertiary"
        )}
      >
        <span
          className={cx(
            "size-1.5 rounded-full",
            isCompacted ? "bg-accent-500 animate-pulse" : "bg-text-tertiary/40"
          )}
        />
        {isCompacted ? t("chat.inspectorCompactionActive") : t("chat.inspectorCompactionInactive")}
      </span>
    </div>
  )
}
