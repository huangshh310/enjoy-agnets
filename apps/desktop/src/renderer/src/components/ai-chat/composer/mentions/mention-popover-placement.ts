/**
 * Composer @ / 浮层贴边：默认在输入框上方，空间不够或会撞标题栏时翻到下方并限高。
 */
export const MENTION_POPOVER_COLLISION = {
  top: 44,
  right: 8,
  bottom: 8,
  left: 8
} as const

export const MENTION_POPOVER_GAP = 8
export const MENTION_POPOVER_MIN_HEIGHT = 96

export type MentionPopoverAnchor = {
  top: number
  bottom: number
  left: number
  width: number
}

export type MentionPopoverViewport = {
  width: number
  height: number
}

export type MentionPopoverPlacement = {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
  placement: "above" | "below"
}

export function placeMentionPopover(
  anchor: MentionPopoverAnchor,
  viewport: MentionPopoverViewport,
  padding = MENTION_POPOVER_COLLISION
): MentionPopoverPlacement {
  const width = Math.min(
    Math.max(280, anchor.width - 20),
    Math.max(160, viewport.width - padding.left - padding.right)
  )
  const left = Math.min(
    Math.max(padding.left, anchor.left + 10),
    viewport.width - padding.right - width
  )
  const spaceAbove = anchor.top - padding.top
  const spaceBelow = viewport.height - padding.bottom - anchor.bottom
  const desired = Math.min(288, Math.floor(viewport.height * 0.42))
  const placement: "above" | "below" =
    spaceAbove >= desired || spaceAbove >= spaceBelow ? "above" : "below"
  const available = placement === "above" ? spaceAbove : spaceBelow
  const maxHeight = Math.max(MENTION_POPOVER_MIN_HEIGHT, Math.floor(available - MENTION_POPOVER_GAP))
  if (placement === "above") {
    return {
      left,
      width,
      maxHeight,
      placement,
      bottom: Math.max(padding.bottom, viewport.height - anchor.top + MENTION_POPOVER_GAP)
    }
  }
  return {
    left,
    width,
    maxHeight,
    placement,
    top: anchor.bottom + MENTION_POPOVER_GAP
  }
}

export function mentionPopoverEdges(
  placed: MentionPopoverPlacement,
  viewportHeight: number
): { top: number; bottom: number } {
  if (placed.placement === "below") {
    const top = placed.top ?? 0
    return { top, bottom: top + placed.maxHeight }
  }
  const bottom = viewportHeight - (placed.bottom ?? 0)
  return { top: bottom - placed.maxHeight, bottom }
}
