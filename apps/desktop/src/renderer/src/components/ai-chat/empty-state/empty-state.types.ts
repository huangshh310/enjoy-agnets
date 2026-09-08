/**
 * 会话空状态（工作清单）类型。
 */
import type { RemixiconComponentType } from "@remixicon/react"

export interface EmptyStateIntentItem {
  id: string
  title: string
  shortTitle?: string
  description: string
  tag: string
  icon: RemixiconComponentType
  iconColor?: string
  prompt: string
}

export interface AiChatEmptyStateProps {
  workspaceName?: string
  workspaceRootLabel?: string
  changesCount?: number
  onSelectPrompt?: (prompt: string) => void
  className?: string
}
