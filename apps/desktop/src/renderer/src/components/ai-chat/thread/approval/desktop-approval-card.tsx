/**
 * CU-P0-B 桌面审批名片：左缩略图 + 一句话摘要。底栏沿用既有三按钮 testid。
 * 允许一次=allow / 本会话允许此应用=allow_session / 拒绝=deny。无 appKey 或 bypass 时藏会话钮。
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
      showAlways={view.canSessionAllow}
      decide={decide}
    >
      <div className="flex flex-wrap items-start gap-3" data-testid="desktop-approval-card">
        <DesktopThumb src={view.thumbnail} alt={view.appName} />
        <div className="min-w-0 flex-1">
          <p className="text-caption-1-medium text-text-secondary">{view.summary}</p>
          {view.appKey ? (
            <p className="mt-1 text-caption-2-medium text-text-tertiary" data-testid="desktop-approval-app-key">
              {view.appKey}
            </p>
          ) : null}
          <p className="mt-1 text-caption-2-medium text-text-tertiary">{t("chat.desktopApprovalTtlFrozen")}</p>
        </div>
      </div>
    </ApprovalChrome>
  )
}

function DesktopThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border-button-default bg-background-secondary-default">
      {src ? <img src={src} alt={alt} className="size-full object-cover" /> : null}
    </div>
  )
}
