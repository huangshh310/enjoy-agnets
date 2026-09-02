/**
 * BeUI Preview Rail 的条目与公开 props。交互抄 Codex 刻度条，皮走 BoardUI。
 */
import type { ReactNode } from "react"

export type PreviewRailItem = {
  id: string
  label: string
  ariaLabel?: string
  description?: ReactNode
}

export type PreviewRailProps = {
  items: PreviewRailItem[]
  label?: string
  activeId?: string
  defaultActiveId?: string
  onActiveChange?: (id: string) => void
  onItemSelect?: (item: PreviewRailItem) => void
  renderPreview?: (item: PreviewRailItem) => ReactNode
  showPreview?: boolean
  highlightActive?: boolean
  itemSize?: number
  className?: string
  railClassName?: string
  previewClassName?: string
}
