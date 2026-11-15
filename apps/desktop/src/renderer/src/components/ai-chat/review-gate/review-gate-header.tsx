/**
 * 会话顶栏三段：执行中 | 待验收 | 完成。只展示，不点选伪造状态。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ReviewGatePhase } from "./review-gate.types"
import type { StopPhaseView } from "@renderer/stores/stop-settle"

const PHASES: ReviewGatePhase[] = ["running", "needs_review", "done"]

/**
 * E1 M2：停止收尾时只改「执行中」那一段的字（不加段、不动布局）：收尾中 mute「正在停下…」，卡住 warn「没停干净」；
 * 不切到「待验收 / 完成」（luna §1.1 / §1.2）。
 */
export function ReviewGateHeader({ phase, stopPhase = null }: { phase: ReviewGatePhase; stopPhase?: StopPhaseView }) {
  const t = useT()
  const current: ReviewGatePhase = stopPhase ? "running" : phase
  return (
    <div
      data-testid="review-gate-phases"
      data-stop-phase={stopPhase ?? undefined}
      className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-background-secondary-default p-0.5 ring-1 ring-border-button-default"
    >
      {PHASES.map((item) => {
        const active = item === current
        return (
          <span
            key={item}
            className={cx(
              "rounded-full px-2.5 py-1 text-caption-2-medium",
              // 窄顶栏只留当前段，让面包屑可读；宽时三段全显。
              !active && "hidden @[44rem]/header:inline",
              active
                ? stopPhase === "stuck"
                  ? "bg-status-yellow-background font-semibold text-status-yellow-text"
                  : stopPhase === "stopping"
                    ? "bg-background-tertiary-default font-semibold text-text-secondary"
                    : "bg-accent-50 font-semibold text-accent-500"
                : "text-text-tertiary"
            )}
          >
            {active && stopPhase ? (stopPhase === "stuck" ? t("chat.stopStuckHeader") : t("chat.stopStopping")) : phaseLabel(item, t)}
          </span>
        )
      })}
    </div>
  )
}

function phaseLabel(phase: ReviewGatePhase, t: (path: string) => string): string {
  if (phase === "running") return t("sessionOps.phaseRunning")
  if (phase === "needs_review") return t("sessionOps.phaseReview")
  return t("sessionOps.phaseDone")
}
