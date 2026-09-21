/**
 * 工作流状态图标：侧栏分组 / 会话行 / 看板列共用，禁止再写一套 if。
 */
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiPlayCircleLine,
  RiTimeLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { WORKFLOW_STATUSES, type SessionWorkflowStatus } from "./session-workflow"

export const WORKFLOW_STATUS_ICONS = {
  todo: RiTimeLine,
  in_progress: RiPlayCircleLine,
  needs_review: RiErrorWarningLine,
  done: RiCheckboxCircleLine
} as const

export function WorkflowStatusGlyph({
  status,
  className,
  sizeClass = "size-3"
}: {
  status: SessionWorkflowStatus
  className?: string
  sizeClass?: string
}) {
  const meta = WORKFLOW_STATUSES[status]
  const Icon = WORKFLOW_STATUS_ICONS[meta.iconName]
  return <Icon className={cx(sizeClass, "shrink-0", className ?? meta.colorClass)} aria-hidden />
}
