/**
 * Chat 工作台顶栏：工作区 / 会话面包屑与 Inspector 开关。
 */
import { RiFolder6Line, RiLayoutRight2Line } from "@remixicon/react"
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
  onToggleRightPane
}: {
  workspaceName: string
  sessionTitle: string
  reviewPhase?: ReviewGatePhase | null
  rightPanelCollapsed: boolean
  onToggleRightPane: () => void
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
