/**
 * 本轮真实耗时：「{模型} 已运行 3分 14秒」。起点来自 store.runStartedAt。
 */
import { useEffect, useState } from "react"
import { useI18n } from "@renderer/i18n"
import { formatRunElapsed } from "./format-run-elapsed"

export function SessionReviewRuntime({
  modelLabel,
  startedAt,
  waiting = false
}: {
  modelLabel: string
  startedAt: number
  waiting?: boolean
}) {
  const { t } = useI18n()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (waiting) return
    const tick = () => setNow(Date.now())
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, waiting])

  return (
    <p
      data-testid="session-review-runtime"
      className="flex min-w-0 shrink-0 items-center gap-1.5 text-caption-2-medium text-text-secondary"
    >
      <span
        className={`size-1.5 shrink-0 rounded-full bg-accent-500 ${waiting ? "" : "animate-pulse"}`}
        aria-hidden
      />
      <span className="truncate tabular-nums">
        {waiting
          ? t("chat.sessionReviewWaiting")
          : t("chat.sessionReviewWorking", {
              model: modelLabel,
              elapsed: formatRunElapsed(now - startedAt, t)
            })}
      </span>
    </p>
  )
}
