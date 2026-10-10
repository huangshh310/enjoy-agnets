/**
 * 引导底栏：返回，以及继续 / 跳过 / 开始使用。进窗首焦在胶囊主钮。
 */
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { GUIDE_BUTTON_CLASS, GUIDE_INSET_CLASS } from "./setup-guide-frame"
import { SETUP_GUIDE_FACE, SETUP_GUIDE_STEPS, type SetupGuideStep } from "./setup-guide-gate"
import { cx } from "@/utils/cx"

export function SetupGuideFooter({
  step,
  hasWorkspace,
  primaryKey,
  secondaryKey,
  autoFocusPrimary,
  onBack,
  onNext,
  onSkip,
  onSecondary
}: {
  step: SetupGuideStep
  hasWorkspace: boolean
  primaryKey?: string
  secondaryKey?: string
  autoFocusPrimary?: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  onSecondary?: () => void
}) {
  const t = useT()
  const face = SETUP_GUIDE_FACE[step]
  const index = SETUP_GUIDE_STEPS.indexOf(step)
  const primary = primaryKey
    ? t(primaryKey)
    : face.skipWithoutWorkspace && !hasWorkspace
      ? t("settings.setupGuide.skip")
      : t(face.primary)
  return (
    <div className={cx("flex items-center gap-2 pt-5 pb-6", GUIDE_INSET_CLASS)}>
      <div className="flex flex-1 items-center gap-4">
        <div className="flex items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={SETUP_GUIDE_STEPS.length} aria-valuenow={index + 1}>
          {SETUP_GUIDE_STEPS.map((item, dot) => (
            <span
              key={item}
              className={cx(
                "size-1.5 rounded-full",
                dot === index ? "bg-text-primary" : dot < index ? "bg-text-primary/50" : "bg-text-tertiary/30"
              )}
            />
          ))}
        </div>
        {face.finishes ? null : (
          <button type="button" tabIndex={-1} onClick={onSkip} className="cursor-pointer text-body-2-regular text-text-secondary hover:text-text-primary">
            {t("settings.setupGuide.skipSetup")}
          </button>
        )}
      </div>
      {face.showBack ? (
        <Button type="button" variant="ghost" className={GUIDE_BUTTON_CLASS} onClick={onBack}>
          {t("settings.setupGuide.back")}
        </Button>
      ) : null}
      {secondaryKey ? (
        <Button type="button" variant="ghost" className={GUIDE_BUTTON_CLASS} onClick={onSecondary}>
          {t(secondaryKey)}
        </Button>
      ) : null}
      <Button
        type="button"
        data-testid="setup-guide-primary"
        autoFocus={autoFocusPrimary}
        className={GUIDE_BUTTON_CLASS}
        onClick={onNext}
      >
        {primary}
      </Button>
    </div>
  )
}
