/**
 * 引导标题。介绍和完成页居中，中间步骤带序号。
 */
import type { ReactNode } from "react"
import { RiCheckLine } from "@remixicon/react"
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useT } from "@renderer/i18n"
import { AppMark } from "@renderer/components/brand/app-mark"
import { GUIDE_INSET_CLASS } from "./setup-guide-frame"
import { SETUP_GUIDE_FACE, SETUP_GUIDE_STEPS, type SetupGuideStep } from "./setup-guide-gate"
import { cx } from "@/utils/cx"

export function SetupGuideHeader({ step, summary }: { step: SetupGuideStep; summary?: ReactNode }) {
  const t = useT()
  const face = SETUP_GUIDE_FACE[step]
  const body = face.body ? t(face.body) : ""
  const index = SETUP_GUIDE_STEPS.indexOf(step) + 1
  return (
    <DialogHeader className={cx("gap-1.5 pt-8 pb-0", GUIDE_INSET_CLASS, face.hero && "items-center text-center")}>
      {face.mark === "app" ? <AppMark size={44} className="mb-3" /> : null}
      {face.mark === "ready" ? <ReadyMark /> : null}
      {face.hero ? null : (
        <p className="text-[12px] font-medium tracking-[0.04em] text-text-tertiary uppercase">
          {t("settings.setupGuide.step", { n: index, total: SETUP_GUIDE_STEPS.length })}
        </p>
      )}
      <DialogTitle className="text-[22px] font-medium tracking-[-0.01em] text-text-primary">{t(face.title)}</DialogTitle>
      {summary ?? (body ? (
        <DialogDescription className="max-w-[560px] text-[15px] leading-normal text-text-secondary">
          {body}
        </DialogDescription>
      ) : null)}
    </DialogHeader>
  )
}

function ReadyMark() {
  return (
    <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-state-success-text/10 text-state-success-text">
      <RiCheckLine className="size-5" aria-hidden />
    </span>
  )
}
