/**
 * 侧栏会话行入参：选中、运行中、归档。
 */
import type { SessionWorkflowStatus } from "@enjoy-agents/ipc-contract"

export type SidebarSessionRowProps = {
  sessionId: string
  name: string
  active: boolean
  updatedAt: number
  formatTime: (timestamp: number) => string
  onSelect: () => void
  onArchive?: () => void
  flagged?: boolean
  workflowStatus?: SessionWorkflowStatus | null
  changesSummary?: { additions: number; deletions: number } | null
  className?: string
  nameClassName?: string
}
