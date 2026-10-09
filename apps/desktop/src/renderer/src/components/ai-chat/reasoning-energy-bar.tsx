/**
 * 思考强度能量条：拖动时滑块跟着指针，松手再吸到最近档。只有跨档才写入。
 */
import { useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent, type RefObject } from "react"
import { cx } from "@/utils/cx"
import type { ReasoningEffort } from "@renderer/components/settings/providers/providers.types"
import { useT } from "@renderer/i18n"
import { EFFORT_LEVELS, getEffortLevels, getEffortMeta } from "./reasoning-effort-config"
import { effortIndexAt, markEnergyDrag, pointerRatio } from "./reasoning-energy-drag"

export function ReasoningEnergyBar({
  value,
  onChange,
  size = "md",
  showLabels = true,
  className
}: {
  value: ReasoningEffort | "none" | undefined
  onChange: (value: ReasoningEffort | undefined) => void
  size?: "sm" | "md"
  showLabels?: boolean
  className?: string
}) {
  const t = useT()
  const currentMeta = getEffortMeta(value, t)
  const drag = useEnergyDrag(EFFORT_LEVELS.length, currentMeta.index, (index) => {
    const level = EFFORT_LEVELS[index]
    if (level) onChange(level.effortValue)
  })
  return (
    <div className={cx("flex flex-col gap-2 select-none", className)}>
      <EnergyTrack
        size={size}
        dragging={drag.dragging}
        activeIndex={currentMeta.index}
        fillClass={cx(currentMeta.barGradient, currentMeta.glowClass)}
        trackRef={drag.trackRef}
        onPointerDown={drag.onPointerDown}
        fill={drag.liveFill ?? fillPercent(currentMeta.index, EFFORT_LEVELS.length)}
      />
      {showLabels ? <EnergyLabels value={currentMeta.value} onChange={onChange} /> : null}
    </div>
  )
}

function useEnergyDrag(count: number, currentIndex: number, onIndex: (index: number) => void) {
  const trackRef = useRef<HTMLDivElement>(null)
  const lastIndex = useRef(currentIndex)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [liveFill, setLiveFill] = useState<number | null>(null)
  useEffect(() => {
    lastIndex.current = currentIndex
  }, [currentIndex])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    beginEnergyDrag({
      clientX: event.clientX,
      count,
      trackRef,
      lastIndex,
      draggingRef,
      setDragging,
      setLiveFill,
      onIndex
    })
  }
  return { trackRef, dragging, liveFill, onPointerDown }
}

function beginEnergyDrag(input: {
  clientX: number
  count: number
  trackRef: RefObject<HTMLDivElement | null>
  lastIndex: MutableRefObject<number>
  draggingRef: MutableRefObject<boolean>
  setDragging: (value: boolean) => void
  setLiveFill: (value: number | null) => void
  onIndex: (index: number) => void
}): void {
  const track = input.trackRef.current
  if (!track) return
  input.draggingRef.current = true
  markEnergyDrag(true)
  input.setDragging(true)
  placeEnergyThumb(input.clientX, track, input)
  const move = (event: PointerEvent) => placeEnergyThumb(event.clientX, track, input)
  const up = () => finishEnergyDrag(move, up, input)
  window.addEventListener("pointermove", move)
  window.addEventListener("pointerup", up)
}

function placeEnergyThumb(
  clientX: number,
  track: HTMLDivElement,
  input: {
    count: number
    lastIndex: MutableRefObject<number>
    setLiveFill: (value: number | null) => void
    onIndex: (index: number) => void
  }
): void {
  const rect = track.getBoundingClientRect()
  input.setLiveFill(pointerRatio(clientX, rect) * 100)
  const index = effortIndexAt(clientX, rect, input.count)
  if (index === input.lastIndex.current) return
  input.lastIndex.current = index
  input.onIndex(index)
}

function finishEnergyDrag(
  move: (event: PointerEvent) => void,
  up: () => void,
  input: {
    draggingRef: MutableRefObject<boolean>
    setDragging: (value: boolean) => void
    setLiveFill: (value: number | null) => void
  }
): void {
  input.draggingRef.current = false
  markEnergyDrag(false)
  input.setDragging(false)
  window.removeEventListener("pointermove", move)
  window.removeEventListener("pointerup", up)
  window.requestAnimationFrame(() => input.setLiveFill(null))
}

function EnergyTrack({
  size,
  dragging,
  activeIndex,
  fill,
  fillClass,
  trackRef,
  onPointerDown
}: {
  size: "sm" | "md"
  dragging: boolean
  activeIndex: number
  fill: number
  fillClass: string
  trackRef: RefObject<HTMLDivElement | null>
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
}) {
  const motion = dragging ? "transition-none" : "transition-[width,left] duration-150 ease-out"
  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      className={cx(
        "group relative flex touch-none items-center cursor-pointer rounded-full border border-border-button-default/80 bg-background-tertiary-default shadow-inner",
        size === "sm" ? "h-3.5 px-1" : "h-5 px-1.5",
        dragging && "ring-2 ring-accent-500/30"
      )}
    >
      <EnergyTicks size={size} activeIndex={activeIndex} />
      <div className={cx("absolute top-0 bottom-0 left-0 rounded-full", motion, fillClass)} style={{ width: `${Math.max(8, fill)}%` }} />
      <EnergyThumb size={size} dragging={dragging} left={fill} motion={motion} fillClass={fillClass} />
    </div>
  )
}

function fillPercent(index: number, count: number): number {
  if (count <= 1) return 0
  return (index / (count - 1)) * 100
}

function EnergyTicks({ size, activeIndex }: { size: "sm" | "md"; activeIndex: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-2.5 z-0 flex items-center justify-between">
      {EFFORT_LEVELS.map((level) => (
        <span
          key={level.value}
          className={cx(
            "rounded-full",
            size === "sm" ? "size-1" : "size-1.5",
            level.index <= activeIndex ? "bg-background-primary-default/80 shadow-2xs dark:bg-background-primary-default/90" : "bg-border-button-default/70"
          )}
        />
      ))}
    </div>
  )
}

function EnergyThumb({
  size,
  dragging,
  left,
  motion,
  fillClass
}: {
  size: "sm" | "md"
  dragging: boolean
  left: number
  motion: string
  fillClass: string
}) {
  return (
    <div
      className={cx(
        "absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-background-primary-default shadow-md",
        motion,
        size === "sm" ? "size-4.5" : "size-6",
        dragging ? "scale-110" : "group-hover:scale-105",
        fillClass
      )}
      style={{ left: `${left}%` }}
    >
      <span className={cx("rounded-full", size === "sm" ? "size-2" : "size-2.5", fillClass)} />
    </div>
  )
}

function EnergyLabels({
  value,
  onChange
}: {
  value: string
  onChange: (value: ReasoningEffort | undefined) => void
}) {
  const t = useT()
  return (
    <div className="flex items-center justify-between px-0.5">
      {getEffortLevels(t).map((level) => (
        <button
          key={level.value}
          type="button"
          onClick={() => onChange(level.effortValue)}
          className={cx(
            "cursor-pointer rounded px-1 text-caption-2-medium font-medium outline-none",
            level.value === value ? cx("scale-105 font-semibold", level.iconColorClass) : "text-text-tertiary hover:text-text-primary"
          )}
        >
          {level.label}
        </button>
      ))}
    </div>
  )
}

/** 输入框按钮上的五格能量，不参与拖动。 */
/** 任意档数的同一条能量轨，供本机助手的官方思考档复用。 */
export function IndexedEnergyBar({
  count,
  index,
  onIndex,
  fillClass,
  size = "sm"
}: {
  count: number
  index: number
  onIndex: (index: number) => void
  fillClass: string
  size?: "sm" | "md"
}) {
  const drag = useEnergyDrag(count, index, onIndex)
  return (
    <EnergyTrack
      size={size}
      dragging={drag.dragging}
      activeIndex={index}
      fillClass={fillClass}
      trackRef={drag.trackRef}
      onPointerDown={drag.onPointerDown}
      fill={drag.liveFill ?? fillPercent(index, count)}
    />
  )
}

export function MiniEnergyMeter({
  value,
  className
}: {
  value: ReasoningEffort | "none" | undefined
  className?: string
}) {
  const meta = getEffortMeta(value)
  return (
    <div className={cx("inline-flex h-3 items-end gap-0.5", className)}>
      {[0, 1, 2, 3, 4].map((step) => (
        <span
          key={step}
          style={{ height: `${28 + step * 18}%` }}
          className={cx("w-1 rounded-xs", step <= meta.index ? meta.barGradient : "bg-border-button-default/50")}
        />
      ))}
    </div>
  )
}
