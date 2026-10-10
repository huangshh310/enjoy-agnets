/**
 * Chat 工作台顶栏：工作区 / 会话面包屑与 Inspector 开关。
 */
import { RiDashboard3Line, RiFileList3Line, RiFolder6Line, RiLayoutRight2Line } from "@remixicon/react"
import { cx } from "@/utils/cx"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { QuietIconButton } from "@/components/base/buttons/quiet-icon-button"
import { AttentionCompleteStatus } from "@renderer/components/ai-chat/attention/attention-strip"
import { ReviewGateHeader } from "@renderer/components/ai-chat/review-gate/review-gate-header"
import type { ReviewGatePhase } from "@renderer/components/ai-chat/review-gate/review-gate.types"
import { useT } from "@renderer/i18n"
import { displaySessionTitle } from "@renderer/lib/session-title"

export function ChatStageHeader({
  workspaceName,
  sessionTitle,
  reviewPhase,
  rightPanelCollapsed,
  onToggleRightPane,
  hasLedger,
  ledgerOpen,
  onToggleLedger,
  environmentOpen,
  onToggleEnvironment
}: {
  workspaceName: string
  sessionTitle: string
  reviewPhase?: ReviewGatePhase | null
  rightPanelCollapsed: boolean
  onToggleRightPane: () => void
  hasLedger?: boolean
  ledgerOpen?: boolean
  onToggleLedger?: () => void
  environmentOpen?: boolean
  onToggleEnvironment?: () => void
}) {
  const t = useT()
  const title = displaySessionTitle(sessionTitle, t("chat.newAgent"))
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 overflow-hidden px-5">
      <RiFolder6Line className="size-4 shrink-0 text-text-secondary" aria-hidden />
      <Breadcrumb
        data-testid="chat-breadcrumb"
        className="min-w-[12rem] flex-1 overflow-hidden"
      >
        <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
          <BreadcrumbItem className="min-w-[4.5rem] max-w-[60%] shrink-0">
            <span
              data-testid="chat-breadcrumb-project"
              title={workspaceName}
              className="block truncate text-body-medium text-text-secondary"
            >
              {workspaceName}
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="shrink-0" />
          <BreadcrumbItem className="min-w-0 flex-1">
            <BreadcrumbPage
              data-testid="chat-breadcrumb-title"
              title={title}
              className="block truncate text-body-medium text-text-primary"
            >
              {title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <AttentionCompleteStatus />
        {onToggleEnvironment ? (
          <QuietIconButton
            icon={RiDashboard3Line}
            data-testid="environment-toggle"
            aria-label={t("chat.environmentToggle")}
            aria-pressed={Boolean(environmentOpen)}
            onClick={onToggleEnvironment}
            className={
              environmentOpen
                ? "bg-background-secondary-default text-text-primary"
                : "text-text-secondary"
            }
          />
        ) : null}
        {hasLedger && onToggleLedger ? (
          <button
            type="button"
            data-testid="run-ledger-toggle"
            onClick={onToggleLedger}
            title={ledgerOpen ? t("chat.collapsePane") : t("sessionOps.ledgerTitle")}
            aria-pressed={ledgerOpen}
            className={cx(
              "flex h-7 max-w-36 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-caption-2-medium transition-colors cursor-pointer",
              ledgerOpen
                ? "border-border-button-default bg-background-secondary-default text-text-primary shadow-2xs"
                : "border-transparent text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
            )}
          >
            <RiFileList3Line className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
            <span className="truncate">{t("sessionOps.ledgerTitle")}</span>
          </button>
        ) : null}
        {reviewPhase ? <ReviewGateHeader phase={reviewPhase} /> : null}
        <QuietIconButton
          icon={RiLayoutRight2Line}
          aria-label={rightPanelCollapsed ? t("chat.expandPane") : t("chat.collapsePane")}
          aria-pressed={!rightPanelCollapsed}
          onClick={onToggleRightPane}
          className={
            !rightPanelCollapsed
              ? "bg-background-secondary-default text-text-primary"
              : "text-text-secondary"
          }
        />
      </div>
    </header>
  )
}
