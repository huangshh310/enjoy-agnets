/**
 * 刻度旁的浮动预览层。pointer-events 全关，不挡会话滚动。
 */
"use client"

import { AnimatePresence, motion } from "motion/react"
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease"
import { cn } from "@/lib/utils"
import { PreviewRailCard } from "./preview-rail-card"
import type { PreviewRailItem, PreviewRailProps } from "./preview-rail.types"

export function PreviewRailLayer({
  items,
  displayedId,
  itemSize,
  uid,
  reduce,
  renderPreview,
  previewClassName
}: {
  items: PreviewRailItem[]
  displayedId: string
  itemSize: number
  uid: string
  reduce: boolean
  renderPreview?: PreviewRailProps["renderPreview"]
  previewClassName?: string
}) {
  return (
    <div
      aria-hidden="true"
      style={{ gridTemplateRows: items.length ? `repeat(${items.length}, ${itemSize}px)` : undefined }}
      className="pointer-events-none absolute inset-y-0 right-12 left-0 z-50 grid content-center"
    >
      {items.map((item) => (
        <div key={item.id} style={{ height: itemSize }} className="relative flex items-center">
          {item.id === displayedId ? (
            <PreviewMotion
              item={item}
              uid={uid}
              reduce={reduce}
              renderPreview={renderPreview}
              previewClassName={previewClassName}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

function PreviewMotion({
  item,
  uid,
  reduce,
  renderPreview,
  previewClassName
}: {
  item: PreviewRailItem
  uid: string
  reduce: boolean
  renderPreview?: PreviewRailProps["renderPreview"]
  previewClassName?: string
}) {
  return (
    <div className={cn("mr-1 ml-auto w-[min(13.5rem,100%)] overflow-hidden", previewClassName)}>
      <motion.div layoutId={`preview-rail-card-${uid}`} transition={reduce ? { duration: 0 } : SPRING_LAYOUT}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(6px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: -2, filter: "blur(4px)", transition: { duration: 0.12, ease: EASE_OUT } }
            }
            transition={{ duration: reduce ? 0 : 0.18, ease: EASE_OUT }}
          >
            {renderPreview ? renderPreview(item) : <PreviewRailCard item={item} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
