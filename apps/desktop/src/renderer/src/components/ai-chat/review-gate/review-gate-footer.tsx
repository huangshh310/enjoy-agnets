/**
 * 待验收底栏：打回 / 通过。通过只改 workflowStatus，不 commit、不 push。
 */
import { useT } from "@renderer/i18n"

export function ReviewGateFooter({
  busy,
  onReject,
  onApprove
}: {
  busy?: boolean
  onReject: () => void
  onApprove: () => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between gap-2 border-t border-separator-border pt-2">
      <p className="text-caption-2-regular text-text-tertiary">{t("sessionOps.gateHint")}</p>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          data-testid="review-gate-reject"
          disabled={busy}
          onClick={onReject}
          className="h-7 cursor-pointer rounded-md border border-border-button-default px-3 text-caption-2-medium text-text-primary hover:bg-background-secondary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("sessionOps.reject")}
        </button>
        <button
          type="button"
          data-testid="review-gate-approve"
          disabled={busy}
          onClick={onApprove}
          className="h-7 cursor-pointer rounded-md bg-accent-500 px-3 text-caption-2-medium text-text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("sessionOps.approve")}
        </button>
      </div>
    </div>
  )
}
