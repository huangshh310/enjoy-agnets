/**
 * 输入框底栏手动压缩按钮。
 */
import { useState } from "react"
import { RiSparklingLine, RiCheckLine } from "@remixicon/react"
import { DEFAULT_KEEP_RECENT } from "@enjoy-agents/agent-core/compaction"
import { cx } from "@/utils/cx"
import { formatTokens } from "../../../../agent-limits/agent-limits-calculator"
import { useT } from "@renderer/i18n"
import { useSessionCompaction } from "./use-session-compaction"
import type { CompactButtonProps } from "./compaction.types"

export function CompactSessionButton({ sessionId, messageCount, className }: CompactButtonProps) {
  const t = useT()
  const { compaction, isCompacting, compact } = useSessionCompaction(sessionId)
  const [justCompacted, setJustCompacted] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const canCompact = Boolean(sessionId && messageCount > 2)

  const handleClick = async () => {
    if (!canCompact || isCompacting) return
    try {
      const res = await compact(DEFAULT_KEEP_RECENT)
      if (res) {
        setJustCompacted(true)
        setFeedback(t("chat.compactSessionSaved", { tokens: formatTokens(res.savedTokens) }))
        setTimeout(() => {
          setJustCompacted(false)
          setFeedback(null)
        }, 3000)
      }
    } catch {
      // 错误已由 hook 捕获
    }
  }

  const titleText = compaction
    ? t("chat.compactSessionActiveHint", {
        tokens: formatTokens(compaction.savedTokens),
        percent: compaction.savedPercent
      })
    : canCompact
      ? t("chat.compactSessionHint")
      : t("chat.compactSessionTooShort")

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={!canCompact || isCompacting}
      title={titleText}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full py-0.5 px-2.5 text-caption-1-medium transition-all duration-200 outline-none select-none",
        compaction
          ? "bg-accent-500/10 text-accent-600 border border-accent-500/20 hover:bg-accent-500/15 cursor-pointer"
          : canCompact
            ? "bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary border border-separator-border/60 hover:border-separator-border cursor-pointer shadow-2xs"
            : "opacity-40 text-text-tertiary cursor-not-allowed",
        className
      )}
    >
      {justCompacted ? (
        <RiCheckLine className="size-3.5 text-accent-500" aria-hidden />
      ) : (
        <RiSparklingLine
          className={cx(
            "size-3.5",
            isCompacting ? "animate-spin text-accent-500" : compaction ? "text-accent-500" : "text-accent-500"
          )}
          aria-hidden
        />
      )}
      <span className="font-medium">
        {feedback || (isCompacting ? t("chat.inspectorCompactionCompacting") : t("chat.compactSessionBtn"))}
      </span>
      {compaction && !feedback ? (
        <span className="font-mono text-caption-2-medium opacity-80">-{compaction.savedPercent}%</span>
      ) : null}
    </button>
  )
}
