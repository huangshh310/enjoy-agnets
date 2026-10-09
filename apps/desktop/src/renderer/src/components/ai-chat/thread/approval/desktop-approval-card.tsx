/**
 * CU-P0-B 桌面审批名片。首次允许是四选一；二次确认仍是同一张卡的 warn/danger。
 */
import { useState } from "react"
import { useT } from "@renderer/i18n"
import { isDevCopyEnabled } from "@renderer/lib/dev-copy"
import { ApprovalChrome } from "./approval-chrome"
import { desktopApprovalSummaryKey, desktopApprovalVerb, desktopApprovalVerbKey } from "./desktop-approval-summary"
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
import { AutomationSourceLine } from "@renderer/components/automations/components/automation-source-line"
import { useDesktopPreviewFrame } from "./desktop-preview-frame"

export function DesktopApprovalCard({
  args,
  decide,
  sourceLine
}: {
  args: unknown
  decide: ApprovalDecide
  sourceLine?: string | null
}) {
  const t = useT()
  const view = desktopApprovalView(args)
  if (view.secondConfirm || isDesktopSecondConfirm(args)) {
    return <SecondConfirmChrome args={args} decide={decide} />
  }
  return (
    <FirstAllowChrome
      view={view}
      decide={decide}
      title={t("chat.desktopApprovalTitle", { app: view.appName })}
      sourceLine={sourceLine}
    />
  )
}

function FirstAllowChrome({
  view,
  decide,
  title,
  sourceLine
}: {
  view: ReturnType<typeof desktopApprovalView>
  decide: ApprovalDecide
  title: string
  sourceLine?: string | null
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
          <DesktopApprovalSummary view={view} sourceLine={sourceLine} />
        </div>
        {view.sensitive ? (
          <p
            data-testid="desktop-approval-sensitive"
            className="mt-1.5 rounded-lg border border-status-yellow-text/25 bg-status-yellow-text/10 px-2.5 py-1 text-caption-1-medium leading-snug text-status-yellow-text"
          >
            {t("chat.desktopSensitiveWarn")}
          </p>
        ) : null}
        {view.bypassesSessionAllow && !view.sensitive ? (
          <p className="mt-1.5 inline-flex rounded-full bg-status-yellow-text/10 px-2 py-0.5 text-caption-2-semibold text-status-yellow-text">
            {t("chat.desktopCoordsBypassHint")}
          </p>
        ) : null}
        <DesktopApprovalChoices
          appName={view.appName}
          canSessionAllow={view.canSessionAllow}
          canAlwaysAllow={view.canAlwaysAllow}
          strikeSessionAllow={view.strikeSessionAllow}
          strikeAlwaysAllow={view.strikeAlwaysAllow}
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
  sourceLine
}: {
  view: ReturnType<typeof desktopApprovalView>
  sourceLine?: string | null
}) {
  const t = useT()
  const verb = desktopApprovalVerb(view.action)
  const actionLabel = t(desktopApprovalVerbKey(verb))
  const summary = t(desktopApprovalSummaryKey(view.controlName), {
    app: view.appName,
    action: actionLabel,
    control: view.controlName
  })
  const showDev = isDevCopyEnabled()
  return (
    <div className="min-w-0 flex-1">
      <p className="text-caption-1-medium text-text-secondary">{summary}</p>
      <p className="mt-0.5 text-caption-2-medium text-text-secondary">{t("chat.desktopApprovalTtlFrozen")}</p>
      <AutomationSourceLine text={sourceLine ?? null} />
      {showDev ? <DesktopApprovalDevDetails view={view} /> : null}
    </div>
  )
}

function DesktopApprovalDevDetails({ view }: { view: ReturnType<typeof desktopApprovalView> }) {
  const t = useT()
  return (
    <div data-testid="desktop-approval-dev" className="mt-1 flex flex-col gap-0.5 text-caption-2-medium text-text-tertiary">
      {view.appKey ? <p data-testid="desktop-approval-app-key">{view.appKey}</p> : null}
      <p>{t("chat.desktopApprovalDevMeta", { action: view.action || "act", summary: view.summary })}</p>
    </div>
  )
}

function DesktopThumb({ src, alt }: { src: string; alt: string }) {
  const frame = useDesktopPreviewFrame()
  // 没有真实截图时不要占一块空盒子，否则普通审批卡会被撑出内滚。
  if (!src || !frame.show) return null
  return (
    <div
      className={
        frame.large
          ? "h-40 w-full shrink-0 overflow-hidden rounded-lg border border-border-button-default bg-background-secondary-default"
          : "h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border-button-default bg-background-secondary-default"
      }
    >
      {src ? <img src={src} alt={alt} className="size-full object-cover" /> : null}
    </div>
  )
}
