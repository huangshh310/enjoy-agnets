/**
 * CU-P0-B 桌面审批名片。二次确认分发到 #84 SoT warn 卡，不另开遥控器。
 */
import { useT } from "@renderer/i18n"
import { ApprovalChrome } from "./approval-chrome"
import type { ApprovalDecide } from "./approval.types"
import { desktopApprovalView } from "./desktop-approval-args"
import { isDesktopSecondConfirm } from "./desktop-second-confirm-args"
import { DesktopSecondConfirmCard } from "./desktop-second-confirm-card"

export function DesktopApprovalCard({ args, decide }: { args: unknown; decide: ApprovalDecide }) {
  const t = useT()
  const view = desktopApprovalView(args)
  if (view.secondConfirm || isDesktopSecondConfirm(args)) {
    return <DesktopSecondConfirmCard args={args} decide={decide} />
  }
  return (
    <ApprovalChrome
      variant="desktop"
      title={t("chat.desktopApprovalTitle", { app: view.appName })}
      approveLabel={t("chat.desktopAllowOnce")}
      alwaysLabel={t("chat.desktopAllowSession")}
      denyLabel={t("chat.deny")}
      showAlways={view.canSessionAllow}
      decide={decide}
    >
      <div className="flex flex-wrap items-start gap-3" data-testid="desktop-approval-card">
        <DesktopThumb src={view.thumbnail} alt={view.appName} />
        <DesktopApprovalSummary view={view} ttlLabel={t("chat.desktopApprovalTtlFrozen")} />
      </div>
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
