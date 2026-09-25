/**
 * CU-P1-R Permission Dock warn/danger 二次确认卡。
 * 视觉真源：design/previews/cu-p1-r-second-confirm.html。不是第二套遥控器。
 */
import { RiLock2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { ApprovalDecide } from "./approval.types"
import {
  desktopSecondConfirmView,
  shortObservationId,
  type DesktopSecondConfirmSide,
  type DesktopSecondConfirmView
} from "./desktop-second-confirm-args"

export function DesktopSecondConfirmCard({
  args,
  decide
}: {
  args: unknown
  decide: ApprovalDecide
}) {
  const t = useT()
  const view = desktopSecondConfirmView(args)
  return (
    <article
      data-variant="desktop"
      data-tone={view.tone}
      data-testid="desktop-second-confirm-card"
      className={cx(
        "flex flex-col gap-3 overflow-hidden rounded-2xl border bg-background-primary-default p-4 shadow-card",
        view.missingThumb ? "border-border-error-default/40" : "border-chart-warning/40"
      )}
    >
      <SecondConfirmHeader view={view} />
      <SecondConfirmThumbs view={view} />
      <SecondConfirmSummary view={view} />
      <p className="inline-flex items-center justify-center gap-1.5 text-center text-caption-2-regular text-text-tertiary">
        <RiLock2Line className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{t("chat.hmacBoundNotice")}</span>
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          data-testid="approval-second-confirm-cancel"
          onClick={decide.onDeny}
          className="h-9 flex-1 text-caption-1-medium"
        >
          {t("chat.desktopSecondConfirmCancel")}
        </Button>
        <Button
          type="button"
          data-testid="approval-second-confirm-allow"
          disabled={!view.canConfirm}
          title={view.canConfirm ? undefined : t("chat.desktopSecondConfirmBlind")}
          onClick={decide.onApprove}
          className="h-9 flex-[1.4] text-caption-1-semibold"
        >
          {t("chat.desktopSecondConfirmAllow")}
        </Button>
      </div>
    </article>
  )
}

function SecondConfirmHeader({ view }: { view: DesktopSecondConfirmView }) {
  const t = useT()
  const missing = view.missingThumb
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cx(
          "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-caption-1-semibold",
          missing
            ? "bg-background-tertiary-error text-text-error-primary"
            : "bg-chart-warning/15 text-chart-warning-text"
        )}
      >
        {missing ? "×" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption-1-semibold text-text-primary">
          {missing ? t("chat.desktopSecondConfirmMissingTitle") : t("chat.desktopSecondConfirmTitle")}
        </p>
        <p className="mt-1 text-caption-2-regular text-text-secondary">
          {missing
            ? t("chat.desktopSecondConfirmMissingBody")
            : view.weakIdentity
              ? t("chat.desktopSecondConfirmWeakBody")
              : t("chat.desktopSecondConfirmBody")}
        </p>
      </div>
    </div>
  )
}

function SecondConfirmThumbs({ view }: { view: DesktopSecondConfirmView }) {
  const t = useT()
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <ThumbSlot
        label={t("chat.desktopSecondConfirmPrevious")}
        side={view.previous}
        stale
        caption={t("chat.desktopSecondConfirmStale")}
      />
      <ThumbSlot
        label={t("chat.desktopSecondConfirmNext")}
        side={view.next}
        stale={false}
        caption={t("chat.desktopSecondConfirmFresh")}
        missing={view.missingThumb && !view.next.thumbnail}
      />
    </div>
  )
}

function ThumbSlot({
  label,
  side,
  stale,
  caption,
  missing
}: {
  label: string
  side: DesktopSecondConfirmSide
  stale: boolean
  caption: string
  missing?: boolean
}) {
  const t = useT()
  return (
    <div>
      <p className="mb-1.5 text-caption-2-medium uppercase tracking-wide text-text-tertiary">{label}</p>
      <div
        data-stale={stale ? "true" : "false"}
        className={cx(
          "relative aspect-[16/10] overflow-hidden rounded-lg border border-border-button-default bg-background-secondary-default",
          missing && "border-dashed"
        )}
      >
        {side.thumbnail ? (
          <img src={side.thumbnail} alt={side.appName} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center px-2 text-center text-caption-2-medium text-text-tertiary">
            {t("chat.desktopSecondConfirmThumbMissing")}
          </div>
        )}
        {side.thumbnail ? (
          <div className="absolute inset-x-2 bottom-2 truncate rounded bg-background-full/70 px-2 py-1 text-caption-2-medium text-text-primary">
            {side.appName}
            {side.control ? ` · ${side.control}` : ""}
          </div>
        ) : null}
        <span className="sr-only">{stale ? caption : caption}</span>
      </div>
      <p className="mt-1.5 truncate text-caption-2-regular text-text-tertiary">
        obs {shortObservationId(side.observationId)}
        {side.observationId ? ` · ${caption}` : ""}
      </p>
    </div>
  )
}

function SecondConfirmSummary({ view }: { view: DesktopSecondConfirmView }) {
  const t = useT()
  if (view.missingThumb) {
    return (
      <div className="rounded-lg border border-border-error-default/30 bg-background-tertiary-error px-3 py-2 text-caption-2-regular text-text-error-primary">
        {t("chat.desktopSecondConfirmMissingHint", { code: view.screenshotCode || "screenshot_unavailable" })}
      </div>
    )
  }
  const app = view.appChanged
    ? `${view.previous.appName} → ${view.next.appName}`
    : view.next.appKey || view.next.appName
  const control = view.weakIdentity
    ? t("chat.desktopSecondConfirmWeakKey")
    : view.controlChanged
      ? `${view.previous.control} → ${view.next.control}`
      : view.next.control || view.previous.control
  return (
    <div className="rounded-lg border border-separator-border bg-background-secondary-default px-3 py-2 text-caption-2-regular">
      <SummaryRow label={t("chat.desktopSecondConfirmApp")} value={app} warn={view.appChanged} />
      <SummaryRow label={t("chat.desktopSecondConfirmControl")} value={control} warn={view.weakIdentity} />
      <SummaryRow label={t("chat.desktopSecondConfirmAction")} value={view.action} />
      <p className="mt-2 text-caption-2-regular text-text-tertiary">{t("chat.desktopSecondConfirmSwapHint")}</p>
    </div>
  )
}

function SummaryRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="mt-1 flex justify-between gap-2 first:mt-0">
      <span className="text-text-tertiary">{label}</span>
      <span className={cx("font-medium", warn ? "text-chart-warning-text" : "text-text-primary")}>{value}</span>
    </div>
  )
}
