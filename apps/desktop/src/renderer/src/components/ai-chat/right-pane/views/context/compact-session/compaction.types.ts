/**
 * 会话压缩 UI 组件类型
 */
import type { SessionCompaction } from "@enjoy-agents/ipc-contract"

export type { SessionCompaction }

export interface CompactionCardProps {
  sessionId: string | null
  messageCount: number
}

export interface CompactButtonProps {
  sessionId: string | null
  messageCount: number
  className?: string
}
