/**
 * CU-P0-B 桌面审批名片。首次允许是四选一；二次确认仍是同一张卡的 warn/danger。
 */
import { useState } from "react"
import { useT } from "@renderer/i18n"
import { ApprovalChrome } from "./approval-chrome"
import type { ApprovalDecide } from "./approval.types"
import { desktopApprovalView } from "./desktop-approval-args"
import { DesktopApprovalChoices } from "./desktop-approval-choices"
import {
  applyDesktopApprovalChoice,
  defaultDesktopApprovalChoice,
  desktopApprovalChoiceIds,
  resolveDesktopApprovalChoice,
  type DesktopApprovalChoice
} from "./desktop-approval-choice"
import { desktopSecondConfirmView, isDesktopSecondConfirm } from "./desktop-second-confirm-args"
import { DesktopSecondConfirmBody } from "./desktop-second-confirm-body"

export function DesktopApprovalCard({ args, decide }: { args: unknown; decide: ApprovalDecide }) {
  const t = useT()
  const view = desktopApprovalView(args)
  if (view.secondConfirm || isDesktopSecondConfirm(args)) {
    return <SecondConfirmChrome args={args} decide={decide} />
  }
  return (
    <FirstAllowChrome view={view} decide={decide} title={t("chat.desktopApprovalTitle", { app: view.appName })} />
  )
}

function FirstAllowChrome({
  view,
  decide,
  title
}: {
  view: ReturnType<typeof desktopApprovalView>
  decide: ApprovalDecide
  title: string
}) {
  const t = useT()
  const available = desktopApprovalChoiceIds({
    canSessionAllow: view.canSessionAllow,
    canAlwaysAllow: view.canAlwaysAllow
  })
  const [choice, setChoice] = useState<DesktopApprovalChoice>(() => defaultDesktopApprovalChoice(available))
  const selected = resolveDesktopApprovalChoice(choice, available)
  return (
    <ApprovalChrome
      variant="desktop"
      title={title}
      approveLabel={t("chat.approvalContinue")}
      denyLabel={t("chat.deny")}
      showAlways={false}
      footer="continue"
      decide={{
        ...decide,
        onApprove: () => applyDesktopApprovalChoice(selected, decide)
      }}
    >
      <div className="flex flex-col" data-testid="desktop-approval-card">
        <div className="flex flex-wrap items-start gap-3">
          <DesktopThumb src={view.thumbnail} alt={view.appName} />
          <DesktopApprovalSummary view={view} ttlLabel={t("chat.desktopApprovalTtlFrozen")} />
        </div>
        <DesktopApprovalChoices
          appName={view.appName}
          canSessionAllow={view.canSessionAllow}
          canAlwaysAllow={view.canAlwaysAllow}
          value={selected}
          onChange={setChoice}
        />
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
