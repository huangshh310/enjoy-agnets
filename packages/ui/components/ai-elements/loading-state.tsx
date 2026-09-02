/**
 * AI Loading State：3×3 像素点阵 + 流光文案 + 耗时。
 * 交互对标 https://www.beautifului.dev/（Drive / Dots / Orbit / Surfer），皮走 BoardUI token。
 */
"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { cx } from "@/utils/cx"
import { uiT, useUiLocale } from "@/i18n/ui-locale"
import { formatElapsedMs } from "./loading-state-format"

export type LoadingStateVariant = "drive" | "dots" | "orbit" | "surfer"

export interface LoadingStateProps {
  variant?: LoadingStateVariant
  label?: string
  startedAt?: number
  showTimer?: boolean
  className?: string
}

const SHIMMER_TONE = {
  "--bui-agent-thinking-tone": "var(--color-text-secondary)"
} as CSSProperties

const DRIVE_RING = [0, 1, 2, 5, 8, 7, 6, 3] as const

/** Drive：外圈像素顺时针跑马。 */
function PixelDriveGrid() {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setFrame((n) => (n + 1) % 8), 120)
    return () => window.clearInterval(timer)
  }, [])

  const active = DRIVE_RING[frame] ?? 0
  const trail1 = DRIVE_RING[(frame + 7) % 8] ?? 0
  const trail2 = DRIVE_RING[(frame + 6) % 8] ?? 0

  return (
    <span className="grid size-3.5 grid-cols-3 gap-px">
      {Array.from({ length: 9 }, (_, idx) => (
        <span
          key={idx}
          className={cx(
            "size-1 rounded-[1px]",
            cellTone(idx, active, trail1, trail2)
          )}
        />
      ))}
    </span>
  )
}

function cellTone(idx: number, active: number, trail1: number, trail2: number) {
  if (idx === 4) return "bg-accent-500/20"
  if (idx === active) return "bg-accent-500"
  if (idx === trail1) return "bg-accent-500/60"
  if (idx === trail2) return "bg-accent-500/30"
  return "bg-background-tertiary-default"
}

/** Dots：九格错相脉冲。 */
function PixelDotsGrid() {
  return (
    <span className="grid size-3.5 grid-cols-3 gap-px">
      {Array.from({ length: 9 }, (_, idx) => (
        <span
          key={idx}
          className="size-1 animate-pulse rounded-[1px] bg-accent-500"
          style={{ animationDelay: `${((idx * 7) % 9) * 80}ms` }}
        />
      ))}
    </span>
  )
}

/** Orbit：两点绕中心转。 */
function PixelOrbitGrid() {
  return (
    <span className="relative size-3.5 animate-spin [animation-duration:1.6s]">
      <span className="absolute top-0 left-1/2 size-1 -translate-x-1/2 rounded-[1px] bg-accent-500" />
      <span className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-[1px] bg-accent-500/50" />
    </span>
  )
}

/** Surfer：五根竖条波浪。 */
function PixelSurferGrid() {
  return (
    <span className="flex h-3.5 items-center gap-px">
      {Array.from({ length: 5 }, (_, idx) => (
        <span
          key={idx}
          className="h-2.5 w-0.5 origin-center rounded-[1px] bg-accent-500"
          style={{
            animation: "ea-pixel-surf 1.1s ease-in-out infinite",
            animationDelay: `${idx * 140}ms`
          }}
        />
      ))}
      <style>{`
        @keyframes ea-pixel-surf {
          0%, 100% { transform: scaleY(0.4); opacity: 0.35; }
          50% { transform: scaleY(1.15); opacity: 1; }
        }
      `}</style>
    </span>
  )
}

/** 只画点阵，供 Thinking 头与 LoadingState 共用。 */
export function LoadingStateGlyph({
  variant = "drive",
  className
}: {
  variant?: LoadingStateVariant
  className?: string
}) {
  return (
    <span
      className={cx("inline-flex size-3.5 shrink-0 items-center justify-center", className)}
      aria-hidden
    >
      {variant === "dots" ? <PixelDotsGrid /> : null}
      {variant === "orbit" ? <PixelOrbitGrid /> : null}
      {variant === "surfer" ? <PixelSurferGrid /> : null}
      {variant === "drive" ? <PixelDriveGrid /> : null}
    </span>
  )
}

/** 毫秒级耗时，格式与 Beautiful UI 一致。 */
export function LoadingElapsed({
  startedAt,
  className
}: {
  startedAt?: number
  className?: string
}) {
  useUiLocale()
  const [fallback] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])

  const origin = startedAt ?? fallback
  return (
    <span className={cx("font-mono text-caption-1-regular text-text-tertiary tabular-nums", className)}>
      {formatElapsedMs(now - origin)}
    </span>
  )
}

export function LoadingState({
  variant = "drive",
  label,
  startedAt,
  showTimer = true,
  className
}: LoadingStateProps) {
  useUiLocale()
  const resolvedLabel = label ?? uiT("思考中", "Thinking")
  return (
    <div role="status" className={cx("inline-flex items-center gap-2.5", className)}>
      <LoadingStateGlyph variant={variant} />
      <span
        aria-label={resolvedLabel}
        className="bui-agent-thinking-label text-body-medium"
        style={SHIMMER_TONE}
      >
        {resolvedLabel}
      </span>
      {showTimer ? <LoadingElapsed startedAt={startedAt} /> : null}
    </div>
  )
}

export { formatElapsedMs }
