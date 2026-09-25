/**
 * CU-P0-B 桌面审批名片。二次确认只保证数据契约：双路径/data URL、缺图禁用主允许、专用 testid。
 * 警示皮 /「批准时|重拍后」铬留给 Mike，不在本文件画。
 */
import { useT } from "@renderer/i18n"
import { ApprovalChrome } from "./approval-chrome"
import type { ApprovalDecide } from "./approval.types"
import { desktopApprovalView } from "./desktop-approval-args"

export function DesktopApprovalCard({ args, decide }: { args: unknown; decide: ApprovalDecide }) {
  const t = useT()
  const view = desktopApprovalView(args)
  return (
    <ApprovalChrome
      variant="desktop"
      title={t("chat.desktopApprovalTitle", { app: view.appName })}
      approveLabel={t("chat.desktopAllowOnce")}
      alwaysLabel={t("chat.desktopAllowSession")}
      denyLabel={t("chat.deny")}
      showAlways={!view.secondConfirm && view.canSessionAllow}
      approveDisabled={view.secondConfirm && !view.thumbsReady}
      denyTestId={view.secondConfirm ? "approval-second-confirm-cancel" : undefined}
      allowTestId={view.secondConfirm ? "approval-second-confirm-allow" : undefined}
      decide={decide}
    >
      <div className="flex flex-wrap items-start gap-3" data-testid="desktop-approval-card">
        {view.secondConfirm ? (
          <>
            <DesktopThumb src={view.previousThumbnail} alt={view.appName} />
            <DesktopThumb src={view.thumbnail} alt={view.appName} />
          </>
        ) : (
          <DesktopThumb src={view.thumbnail} alt={view.appName} />
        )}
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
