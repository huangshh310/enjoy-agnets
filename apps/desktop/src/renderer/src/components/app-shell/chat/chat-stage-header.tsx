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
import { ReviewGateHeader } from "@renderer/components/ai-chat/review-gate/review-gate-header"
import type { ReviewGatePhase } from "@renderer/components/ai-chat/review-gate/review-gate.types"
import { useT } from "@renderer/i18n"

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
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-5">
      <RiFolder6Line className="size-4 text-foreground-icon-secondary" aria-hidden />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <span className="text-body-medium text-text-secondary">{workspaceName}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-body-medium text-text-primary">{sessionTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        {onToggleEnvironment ? (
          <QuietIconButton
            icon={RiDashboard3Line}
            aria-label={t("chat.environmentToggle")}
            aria-pressed={Boolean(environmentOpen)}
            onClick={onToggleEnvironment}
            className={environmentOpen ? "bg-background-secondary-default text-text-primary" : undefined}
          />
        ) : null}
        {hasLedger && onToggleLedger ? (
          <button
            type="button"
            onClick={onToggleLedger}
            title={ledgerOpen ? t("chat.collapsePane") : t("sessionOps.ledgerTitle")}
            aria-pressed={ledgerOpen}
            className={cx(
              "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-caption-2-medium transition-colors cursor-pointer",
              ledgerOpen
                ? "border-border-button-default bg-background-secondary-default text-text-primary shadow-2xs"
                : "border-transparent text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
            )}
          >
            <RiFileList3Line className="size-3.5 text-foreground-icon-secondary" aria-hidden />
            <span>{t("sessionOps.ledgerTitle")}</span>
          </button>
        ) : null}
        {reviewPhase ? <ReviewGateHeader phase={reviewPhase} /> : null}
        <QuietIconButton
          icon={RiLayoutRight2Line}
          aria-label={rightPanelCollapsed ? t("chat.expandPane") : t("chat.collapsePane")}
          aria-pressed={!rightPanelCollapsed}
          onClick={onToggleRightPane}
          className={!rightPanelCollapsed ? "bg-background-secondary-default text-text-primary" : undefined}
        />
      </div>
    </header>
  )
}
