/**
 * 会话空状态（Zero State）类型定义
 */
import type { RemixiconComponentType } from "@remixicon/react"

/** 快捷意图卡片项 */
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

/** 快捷指令/按键提示胶囊 */
export interface EmptyStateShortcutPill {
  id: string
  label: string
  keyHint?: string
  description?: string
}

/** 空状态聚合组件 Props */
export interface AiChatEmptyStateProps {
  workspaceName?: string
  workspaceRootLabel?: string
  changesCount?: number
  onSelectPrompt?: (prompt: string) => void
  className?: string
}
