/**
 * Codex 风格会话刻度条：悬停金字塔 + 浮动预览。交互抄 BeUI Preview Rail。
 */
"use client"

import { motion, useReducedMotion } from "motion/react"
import { type PointerEvent, useCallback, useId, useRef, useState } from "react"
import { SPRING_LAYOUT } from "@/lib/ease"
import { useDismiss } from "@/lib/hooks/use-dismiss"
import { useHoverGesture } from "@/lib/hooks/use-hover-gesture"
import { useTapGesture } from "@/lib/hooks/use-tap-gesture"
import { cn } from "@/lib/utils"
import { uiT, useUiLocale } from "@/i18n/ui-locale"
import { PreviewRailLayer } from "./preview-rail-layer"
import type { PreviewRailItem, PreviewRailProps } from "./preview-rail.types"

export type { PreviewRailItem, PreviewRailProps }

function tickScale(distance: number, highlighted: boolean) {
  if (highlighted) return 1
  if (distance === 1) return 0.68
  if (distance === 2) return 0.44
  return 0.25
}

export function PreviewRail({
  items,
  label,
  activeId,
  defaultActiveId,
  onActiveChange,
  onItemSelect,
  renderPreview,
  showPreview = true,
  highlightActive = true,
  itemSize = 22,
  className,
  railClassName,
  previewClassName
}: PreviewRailProps) {
  useUiLocale()
  const uid = useId()
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [internalActiveId, setInternalActiveId] = useState(defaultActiveId ?? items[0]?.id ?? "")
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const tap = useTapGesture<boolean>()
  const hover = useHoverGesture()
  const clearPinned = useCallback(() => setPinnedId(null), [])
  useDismiss(pinnedId !== null, clearPinned, rootRef)

  const requested = activeId ?? internalActiveId
  const selectedId = items.some((item) => item.id === requested) ? requested : (items[0]?.id ?? "")
  const displayedId = hoveredId ?? pinnedId ?? focusedId ?? ""
  const highlightedId = displayedId || (highlightActive ? selectedId : "")
  const displayedIndex = items.findIndex((item) => item.id === highlightedId)
  const navLabel = label ?? uiT("会话位置", "Conversation")

  const selectItem = (id: string) => {
    if (activeId === undefined) setInternalActiveId(id)
    onActiveChange?.(id)
  }

  return (
    <motion.div
      layoutRoot
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusedId(null)
          setPinnedId(null)
        }
      }}
      className={cn("relative isolate flex h-full min-h-0 w-full flex-row-reverse overflow-visible", className)}
    >
      <nav
        aria-label={navLabel}
        onPointerLeave={(event) => {
          if (hover.leave(event)) setHoveredId(null)
        }}
        style={{ gridTemplateRows: items.length ? `repeat(${items.length}, ${itemSize}px)` : undefined }}
        className={cn("relative z-10 grid w-12 shrink-0 content-center", railClassName)}
      >
        {items.map((item, index) => {
          const distance =
            displayedIndex < 0 ? Number.POSITIVE_INFINITY : Math.abs(index - displayedIndex)
          return (
            <RailTick
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              highlighted={item.id === highlightedId}
              scale={tickScale(distance, item.id === highlightedId)}
              reduce={Boolean(reduce)}
              itemSize={itemSize}
              pinned={pinnedId === item.id}
              tap={tap}
              onEnter={(event) => {
                if (hover.enter(event)) setHoveredId(item.id)
              }}
              onFocus={(id) => setFocusedId(id)}
              onPin={(id) => setPinnedId(id)}
              onSelect={(next) => {
                selectItem(next.id)
                onItemSelect?.(next)
              }}
            />
          )
        })}
      </nav>

      {showPreview ? (
        <PreviewRailLayer
          items={items}
          displayedId={displayedId}
          itemSize={itemSize}
          uid={uid}
          reduce={Boolean(reduce)}
          renderPreview={renderPreview}
          previewClassName={previewClassName}
        />
      ) : null}
    </motion.div>
  )
}

function RailTick({
  item,
  selected,
  highlighted,
  scale,
  reduce,
  itemSize,
  pinned,
  tap,
  onEnter,
  onFocus,
  onPin,
  onSelect
}: {
  item: PreviewRailItem
  selected: boolean
  highlighted: boolean
  scale: number
  reduce: boolean
  itemSize: number
  pinned: boolean
  tap: ReturnType<typeof useTapGesture<boolean>>
  onEnter: (event: PointerEvent<HTMLButtonElement>) => void
  onFocus: (id: string | null) => void
  onPin: (id: string) => void
  onSelect: (item: PreviewRailItem) => void
}) {
  return (
    <button
      type="button"
      data-slot="preview-rail-item"
      aria-label={item.ariaLabel ?? item.label}
      aria-current={selected ? "location" : undefined}
      onPointerEnter={onEnter}
      onPointerDown={(event) => {
        tap.start(event, pinned)
        onFocus(null)
      }}
      onPointerCancel={() => tap.drop()}
      onKeyDown={() => tap.drop()}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) onFocus(item.id)
      }}
      onClick={() => {
        const gesture = tap.take()
        if (gesture !== null && gesture.pointerType !== "mouse") onPin(item.id)
        onSelect(item)
      }}
      style={{ height: itemSize }}
      className={cn(
        "relative flex w-12 items-center justify-end text-text-tertiary outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        highlighted ? "text-text-primary" : undefined,
        item.itemClassName
      )}
    >
      <motion.span
        data-slot="preview-rail-tick"
        aria-hidden="true"
        animate={{ scaleX: scale }}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        className={cn("block h-0.5 w-12 origin-right bg-current", item.tickClassName)}
      />
    </button>
  )
}
