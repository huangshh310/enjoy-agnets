/**
 * CU-P0-B 桌面审批名片：左缩略图 + 应用/控件/appKey，选项绑此应用。
 * 禁止裸「允许桌面工具」。待批文案写 TTL 冻结（时钟实现见 kai §3.2a）。
 */
import { useState } from "react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ApprovalChrome } from "./approval-chrome"
import type { ApprovalDecide } from "./approval.types"
import { desktopApprovalView } from "./desktop-approval-args"

const OPTION_ONCE = "allow_once"
const OPTION_SESSION = "allow_session"

export function DesktopApprovalCard({ args, decide }: { args: unknown; decide: ApprovalDecide }) {
  const t = useT()
  const view = desktopApprovalView(args)
  const [picked, setPicked] = useState(OPTION_ONCE)
  return (
    <ApprovalChrome
      variant="desktop"
      title={t("chat.desktopApprovalTitle", { app: view.appName })}
      approveLabel={t("chat.approvalContinue")}
      denyLabel={t("chat.deny")}
      showAlways={false}
      approveDisabled={!picked}
      decide={{
        onDeny: decide.onDeny,
        onAllowSession: decide.onAllowSession,
        onApprove: () => {
          if (picked === OPTION_SESSION && view.canSessionAllow) decide.onAllowSession()
          else decide.onApprove()
        }
      }}
    >
      <div className="flex flex-wrap items-start gap-3" data-testid="desktop-approval-card">
        <DesktopThumb src={view.thumbnail} alt={view.appName} />
        <div className="min-w-0 flex-1">
          <p className="text-caption-1-medium text-text-secondary">{view.summary}</p>
          <p className="mt-1 text-caption-2-medium text-text-tertiary">{t("chat.desktopApprovalTtlFrozen")}</p>
          <div role="radiogroup" className="mt-2 flex flex-col gap-1.5">
            <DesktopOption
              selected={picked === OPTION_ONCE}
              label={t("chat.desktopAllowOnce")}
              onSelect={() => setPicked(OPTION_ONCE)}
            />
            <DesktopOption
              selected={picked === OPTION_SESSION}
              disabled={!view.canSessionAllow}
              label={t("chat.desktopAllowSessionApp", { app: view.appName })}
              onSelect={() => view.canSessionAllow && setPicked(OPTION_SESSION)}
            />
          </div>
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

function DesktopOption({
  selected,
  disabled,
  label,
  onSelect
}: {
  selected: boolean
  disabled?: boolean
  label: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-caption-1-regular",
        selected
          ? "border-accent-500 bg-accent-500/10 text-text-primary ring-1 ring-accent-500/30"
          : "border-border-button-default text-text-primary hover:bg-background-secondary-hover",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cx(
          "size-3.5 shrink-0 rounded-full border",
          selected ? "border-accent-500 bg-accent-500" : "border-border-button-default"
        )}
      />
      {label}
    </button>
  )
}
