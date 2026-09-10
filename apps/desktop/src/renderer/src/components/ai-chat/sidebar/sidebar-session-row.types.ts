/**
 * 侧栏会话行入参：选中、运行中、归档。
 */
export type SidebarSessionRowProps = {
  sessionId: string
  name: string
  active: boolean
  updatedAt: number
  formatTime: (timestamp: number) => string
  onSelect: () => void
  onArchive?: () => void
  className?: string
  nameClassName?: string
}
