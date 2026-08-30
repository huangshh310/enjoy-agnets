/**
 * 思考强度能量条组件 (Reasoning Energy Bar)：
 * 1. 类似能量槽的渐变填充条与发光滑块
 * 2. 支持点击任意位置或拖拽滑块切换 5 档思考深度
 * 3. 实时联动颜色变换（浅蓝 -> 翠绿 -> 琥珀金 -> 活力橙 -> 炫彩极光紫）
 */
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { cx } from "@/utils/cx"
import type { ReasoningEffort } from "@renderer/components/settings/providers/providers.types"
import {
  EFFORT_LEVELS,
  getEffortMeta
} from "./reasoning-effort-config"

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
  const currentMeta = getEffortMeta(value)
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerAtX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return

      const rect = track.getBoundingClientRect()
      const rawX = clientX - rect.left
      const ratio = Math.max(0, Math.min(1, rawX / rect.width))

      // 计算距离最近的档位 (0, 1, 2, 3, 4)
      const closestIndex = Math.round(ratio * (EFFORT_LEVELS.length - 1))
      const targetLevel = EFFORT_LEVELS[closestIndex]
      if (targetLevel && targetLevel.value !== currentMeta.value) {
        onChange(targetLevel.effortValue)
      }
    },
    [currentMeta.value, onChange]
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    handlePointerAtX(e.clientX)

    const onPointerMove = (ev: PointerEvent) => {
      handlePointerAtX(ev.clientX)
    }

    const onPointerUp = () => {
      setIsDragging(false)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  const activeIndex = currentMeta.index
  const fillWidthPercent = (activeIndex / (EFFORT_LEVELS.length - 1)) * 100

  return (
    <div className={cx("flex flex-col gap-2 select-none", className)}>
      {/* 能量条交互主轨道 */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        className={cx(
          "group relative flex items-center cursor-pointer rounded-full bg-background-tertiary-default border border-border-button-default/80 transition-all shadow-inner",
          size === "sm" ? "h-3.5 px-1" : "h-5 px-1.5",
          isDragging && "ring-2 ring-accent-500/30"
        )}
      >
        {/* 能量背景刻度点 (Ticks) */}
        <div className="absolute inset-x-2.5 flex items-center justify-between pointer-events-none z-0">
          {EFFORT_LEVELS.map((level) => {
            const isPassed = level.index <= activeIndex
            return (
              <span
                key={level.value}
                className={cx(
                  "rounded-full transition-all duration-300",
                  size === "sm" ? "size-1" : "size-1.5",
                  isPassed
                    ? "bg-white/80 dark:bg-white/90 shadow-2xs"
                    : "bg-border-button-default/70"
                )}
              />
            )
          })}
        </div>

        {/* 能量渐变动态填充条 (Energy Fill Bar) */}
        <div
          className={cx(
            "absolute left-0 top-0 bottom-0 rounded-full transition-all duration-200",
            currentMeta.barGradient,
            currentMeta.glowClass
          )}
          style={{ width: `${Math.max(8, fillWidthPercent)}%` }}
        />

        {/* 动态滑块 (Knob / Thumb) */}
        <div
          className={cx(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-background-primary-default shadow-md transition-all duration-200 z-10 flex items-center justify-center",
            size === "sm" ? "size-4.5" : "size-6",
            isDragging ? "scale-110 ring-4 ring-white/30" : "group-hover:scale-105",
            currentMeta.glowClass
          )}
          style={{ left: `${fillWidthPercent}%` }}
        >
          <span
            className={cx(
              "rounded-full transition-colors",
              size === "sm" ? "size-2" : "size-2.5",
              currentMeta.barGradient
            )}
          />
        </div>
      </div>

      {/* 底部 5 档刻度标签 */}
      {showLabels ? (
        <div className="flex items-center justify-between px-0.5">
          {EFFORT_LEVELS.map((level) => {
            const isSelected = level.value === currentMeta.value

            return (
              <button
                key={level.value}
                type="button"
                onClick={() => onChange(level.effortValue)}
                className={cx(
                  "text-[11px] font-medium transition-all cursor-pointer outline-none rounded px-1",
                  isSelected
                    ? cx("font-semibold scale-105", level.iconColorClass)
                    : "text-text-tertiary hover:text-text-primary"
                )}
              >
                {level.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/**
 * 紧凑型微型能量阶梯指示器 (Mini Energy Gauge)，用于在输入框按钮中精简呈现能量级别。
 */
export function MiniEnergyMeter({
  value,
  className
}: {
  value: ReasoningEffort | "none" | undefined
  className?: string
}) {
  const meta = getEffortMeta(value)
  const activeCount = meta.index // 0, 1, 2, 3, 4

  return (
    <div className={cx("inline-flex items-end gap-0.5 h-3", className)}>
      {[0, 1, 2, 3, 4].map((step) => {
        const isActive = step <= activeCount
        const heightPercent = 28 + step * 18 // 28%, 46%, 64%, 82%, 100%

        return (
          <span
            key={step}
            style={{ height: `${heightPercent}%` }}
            className={cx(
              "w-1 rounded-xs transition-all duration-300",
              isActive
                ? cx(meta.barGradient, meta.glowClass)
                : "bg-border-button-default/50"
            )}
          />
        )
      })}
    </div>
  )
}
