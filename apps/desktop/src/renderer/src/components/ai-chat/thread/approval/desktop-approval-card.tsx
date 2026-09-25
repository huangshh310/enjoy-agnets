/**
 * CU-P0-B 桌面审批名片。二次确认 reshape 同一张卡：#84 并排新旧观察 + #85 testid。
 */
import { useT } from "@renderer/i18n"
import { ApprovalChrome } from "./approval-chrome"
import type { ApprovalDecide } from "./approval.types"
import { desktopApprovalView } from "./desktop-approval-args"
import { desktopSecondConfirmView, isDesktopSecondConfirm } from "./desktop-second-confirm-args"
import { DesktopSecondConfirmBody } from "./desktop-second-confirm-body"

export function DesktopApprovalCard({ args, decide }: { args: unknown; decide: ApprovalDecide }) {
  const t = useT()
  const view = desktopApprovalView(args)
  if (view.secondConfirm || isDesktopSecondConfirm(args)) {
    return <SecondConfirmChrome args={args} decide={decide} />
  }
  return (
    <ApprovalChrome
      variant="desktop"
      title={t("chat.desktopApprovalTitle", { app: view.appName })}
      approveLabel={t("chat.desktopAllowOnce")}
      alwaysLabel={t("chat.desktopAllowSession")}
      alwaysAppLabel={t("chat.desktopAllowAlways")}
      denyLabel={t("chat.deny")}
      showAlways={view.canSessionAllow}
      showAlwaysApp={view.canAlwaysAllow}
      decide={decide}
    >
      <div className="flex flex-wrap items-start gap-3" data-testid="desktop-approval-card">
        <DesktopThumb src={view.thumbnail} alt={view.appName} />
        <DesktopApprovalSummary view={view} ttlLabel={t("chat.desktopApprovalTtlFrozen")} />
      </div>
    </ApprovalChrome>
  )
}

function SecondConfirmChrome({ args, decide }: { args: unknown; decide: ApprovalDecide }) {
  const t = useT()
  const confirm = desktopSecondConfirmView(args)
  return (
    <ApprovalChrome
      variant="desktop"
      tone={confirm.tone}
      title={
        confirm.missingThumb
          ? t("chat.desktopSecondConfirmMissingTitle")
          : t("chat.desktopSecondConfirmTitle")
      }
      approveLabel={t("chat.desktopSecondConfirmAllow")}
      denyLabel={t("chat.desktopSecondConfirmCancel")}
      showAlways={false}
      showAlwaysApp={false}
      approveDisabled={!confirm.canConfirm}
      approveTitle={confirm.canConfirm ? undefined : t("chat.desktopSecondConfirmBlind")}
      denyTestId="approval-second-confirm-cancel"
      allowTestId="approval-second-confirm-allow"
      decide={decide}
    >
      <DesktopSecondConfirmBody view={confirm} />
    </ApprovalChrome>
  )
}

function DesktopApprovalSummary({
  view,
  ttlLabel
}: {
  view: ReturnType<typeof desktopApprovalView>
  ttlLabel: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-caption-1-medium text-text-secondary">{view.summary}</p>
      {view.appKey ? (
        <p className="mt-1 text-caption-2-medium text-text-tertiary" data-testid="desktop-approval-app-key">
          {view.appKey}
        </p>
      ) : null}
      <p className="mt-1 text-caption-2-medium text-text-tertiary">{ttlLabel}</p>
    </div>
  )
}

function DesktopThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border-button-default bg-background-secondary-default">
      {src ? <img src={src} alt={alt} className="size-full object-cover" /> : null}
    </div>
  )
}
