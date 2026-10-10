/**
 * 引导标题。介绍和完成页居中，中间步骤带序号。末屏绿勾只在可对话时画。
 */
import type { ReactNode } from "react"
import { RiCheckLine } from "@remixicon/react"
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useT } from "@renderer/i18n"
import { AppMark } from "@renderer/components/brand/app-mark"
import { GUIDE_INSET_CLASS } from "./setup-guide-frame"
import { SETUP_GUIDE_FACE, SETUP_GUIDE_STEPS, type SetupGuideStep } from "./setup-guide-gate"
import { cx } from "@/utils/cx"

export function SetupGuideHeader({
  step,
  summary,
  titleKey,
  readyMark
}: {
  step: SetupGuideStep
  summary?: ReactNode
  titleKey?: string
  readyMark?: boolean
}) {
  const t = useT()
  const face = SETUP_GUIDE_FACE[step]
  const body = face.body ? t(face.body) : ""
  const index = SETUP_GUIDE_STEPS.indexOf(step) + 1
  return (
    <DialogHeader className={cx("gap-1.5 pt-8 pb-0", GUIDE_INSET_CLASS, face.hero && "items-center text-center")}>
      {face.mark === "app" ? <AppMark size={44} className="mb-3" /> : null}
      {face.mark === "ready" ? <ReadyMark ready={readyMark !== false} /> : null}
      {face.hero ? null : (
        <p className="text-caption-1-medium font-medium text-text-tertiary uppercase">
          {t("settings.setupGuide.step", { n: index, total: SETUP_GUIDE_STEPS.length })}
        </p>
      )}
      <DialogTitle className="text-title-1-medium font-medium text-text-primary">
        {t(titleKey ?? face.title)}
      </DialogTitle>
      {summary ?? (body ? (
        <DialogDescription className="max-w-[560px] text-headline-regular leading-normal text-text-secondary">
          {body}
        </DialogDescription>
      ) : null)}
    </DialogHeader>
  )
}

function ReadyMark({ ready }: { ready: boolean }) {
  if (ready) {
    return (
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-state-success-text/10 text-state-success-text">
        <RiCheckLine className="size-5" aria-hidden />
      </span>
    )
  }
  return (
    <span
      data-testid="ready-mark-pending"
      className="mb-3 size-11 rounded-full border border-text-primary/15 bg-background-secondary-default"
      aria-hidden
    />
  )
}
