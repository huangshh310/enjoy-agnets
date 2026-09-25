/**
 * 多题步进：上一题 / 题号 / 跳过或继续。
 */
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import type { AskUserNavProps } from "./ask-user.types"

const STEPPER =
  "inline-flex size-6 cursor-pointer items-center justify-center rounded-md active:scale-[0.98] disabled:opacity-30"

/** 底栏：上一题 / 题号 / 跳过或继续。步进钮带 `active:scale-[0.98]`。 */
export function AskUserNav({
  step,
  total,
  showSkip,
  showContinue,
  continueDisabled,
  onBack,
  onNext,
  onSkip,
  onContinue
}: AskUserNavProps) {
  const t = useT()
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <AskUserStepButtons step={step} total={total} onBack={onBack} onNext={onNext} />
      <div className="flex items-center gap-1.5">
        {showSkip ? (
          <Button size="sm" variant="ghost" onClick={onSkip} className="h-8 text-caption-1-medium">
            {t("chat.askUserSkip")}
          </Button>
        ) : null}
        {showContinue ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={continueDisabled}
            onClick={onContinue}
            className="h-8 text-caption-1-semibold"
          >
            {t("chat.askUserContinue")}
          </Button>
        ) : null}
      </div>
    </footer>
  )
}

function AskUserStepButtons({
  step,
  total,
  onBack,
  onNext
}: {
  step: number
  total: number
  onBack: () => void
  onNext: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center gap-1 text-text-tertiary">
      <button type="button" disabled={step <= 0} aria-label={t("chat.askUserPrev")} onClick={onBack} className={STEPPER}>
        <RiArrowLeftSLine className="size-4" />
      </button>
      <span className="font-mono text-caption-2-medium tabular-nums">{t("chat.askUserStep", { n: step + 1, total })}</span>
      <button
        type="button"
        disabled={step >= total - 1}
        aria-label={t("chat.askUserNext")}
        onClick={onNext}
        className={STEPPER}
      >
        <RiArrowRightSLine className="size-4" />
      </button>
    </div>
  )
}
