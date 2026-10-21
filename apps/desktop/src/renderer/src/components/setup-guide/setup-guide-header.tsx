/**
 * 引导标题。介绍和完成页居中，中间步骤带序号。末屏绿勾只在可对话时画。
 */
import type { ReactNode } from "react"
import { RiCheckLine, RiKey2Line, RiShieldLine } from "@remixicon/react"
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useT } from "@renderer/i18n"
import { AppMark } from "@renderer/components/brand/app-mark"
import { GUIDE_INSET_CLASS } from "./setup-guide-frame"
import type { ReadyMarkKind } from "./ready-face"
import { SETUP_GUIDE_FACE, SETUP_GUIDE_STEPS, type SetupGuideStep } from "./setup-guide-gate"
import { cx } from "@/utils/cx"

export function SetupGuideHeader({
  step,
  summary,
  titleKey,
  title,
  readyMark
}: {
  step: SetupGuideStep
  summary?: ReactNode
  titleKey?: string
  /** 已经填好名字的标题（完成页带「密钥」的标题走 fillKeyHolderText）；有就不再用 titleKey 渲染。 */
  title?: string
  readyMark?: ReadyMarkKind
}) {
  const t = useT()
  const face = SETUP_GUIDE_FACE[step]
  const body = face.body ? t(face.body) : ""
  const index = SETUP_GUIDE_STEPS.indexOf(step) + 1
  return (
    <DialogHeader className={cx("gap-1.5 pt-8 pb-0", GUIDE_INSET_CLASS, face.hero && "items-center text-center")}>
      {face.mark === "app" ? <AppMark size={44} className="mb-3" /> : null}
      {face.mark === "ready" ? <ReadyMark kind={readyMark ?? "ok"} /> : null}
      {face.hero ? null : (
        <p className="text-caption-1-medium font-medium text-text-tertiary uppercase">
          {t("settings.setupGuide.step", { n: index, total: SETUP_GUIDE_STEPS.length })}
        </p>
      )}
      <DialogTitle className="text-title-1-medium font-medium text-text-primary">
        {title ?? t(titleKey ?? face.title)}
      </DialogTitle>
      {summary ?? (body ? (
        <DialogDescription className="max-w-[560px] text-headline-regular leading-normal text-text-secondary">
          {body}
        </DialogDescription>
      ) : null)}
    </DialogHeader>
  )
}

function ReadyMark({ kind }: { kind: ReadyMarkKind }) {
  if (kind === "unverified") {
    return (
      <span
        data-testid="ready-mark-unverified"
        className="mb-3 flex size-11 items-center justify-center rounded-full bg-background-secondary-default text-text-secondary"
      >
        <RiShieldLine className="size-5" aria-hidden />
      </span>
    )
  }
  if (kind === "ok") {
    return (
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-state-success-text/10 text-state-success-text">
        <RiCheckLine className="size-5" aria-hidden />
      </span>
    )
  }
  return (
    <span
      data-testid="ready-mark-pending"
      className="mb-3 flex size-11 items-center justify-center rounded-full bg-background-secondary-default text-text-primary"
    >
      <RiKey2Line className="size-5 shrink-0" aria-hidden />
    </span>
  )
}
