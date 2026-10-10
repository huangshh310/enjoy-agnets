/**
 * 会话顶栏三段：执行中 | 待验收 | 完成。只展示，不点选伪造状态。
 */
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ReviewGatePhase } from "./review-gate.types"

const PHASES: ReviewGatePhase[] = ["running", "needs_review", "done"]

export function ReviewGateHeader({ phase }: { phase: ReviewGatePhase }) {
  const t = useT()
  return (
    <div
      data-testid="review-gate-phases"
      className="inline-flex shrink-0 whitespace-nowrap rounded-full bg-background-secondary-default p-0.5 ring-1 ring-border-button-default"
    >
      {PHASES.map((item) => {
        const active = item === phase
        return (
          <span
            key={item}
            className={cx(
              "rounded-full px-2.5 py-1 text-caption-2-medium",
              active
                ? "bg-accent-50 font-semibold text-accent-500"
                : "text-text-tertiary"
            )}
          >
            {phaseLabel(item, t)}
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
