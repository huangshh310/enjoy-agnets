/**
 * Blobatar 定制台：种子、表情矩阵、色相与底板/动效。
 */
import { useState } from "react"
import { RiDiceLine } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { BlobatarAvatar } from "./blobatar-avatar"
import {
  BLOBATAR_COLOR_PRESETS,
  BLOBATAR_EXPRESSIONS,
  DEFAULT_BLOBATAR_CONFIG,
  RANDOM_AVATAR_SEEDS,
  type BlobatarAnimateMode,
  type BlobatarBackgroundShape,
  type BlobatarConfig,
  type BlobatarExpressionName
} from "./blobatar.types"

interface BlobatarPickerProps {
  value?: BlobatarConfig
  onChange?: (config: BlobatarConfig) => void
  className?: string
}

const BACKDROP_OPTIONS: Array<{ id: BlobatarBackgroundShape; label: string }> = [
  { id: "none", label: "无底板" },
  { id: "circle", label: "圆形" },
  { id: "squircle", label: "超椭圆" },
  { id: "square", label: "方形" }
]

const ANIMATE_OPTIONS: Array<{ id: BlobatarAnimateMode; label: string }> = [
  { id: "always", label: "常驻呼吸" },
  { id: "hover", label: "悬停微动" },
  { id: "off", label: "静态节能" }
]

export function BlobatarPicker({
  value = DEFAULT_BLOBATAR_CONFIG,
  onChange,
  className
}: BlobatarPickerProps) {
  const [config, setConfig] = useState<BlobatarConfig>(value)

  function update(partial: Partial<BlobatarConfig>) {
    const next = { ...config, ...partial }
    setConfig(next)
    onChange?.(next)
  }

  function handleRandomSeed() {
    const randomIdx = Math.floor(Math.random() * RANDOM_AVATAR_SEEDS.length)
    const randomSeed = RANDOM_AVATAR_SEEDS[randomIdx] ?? `Agent-${Math.floor(Math.random() * 999)}`
    update({ name: randomSeed })
  }

  return (
    <div className={cx("flex flex-col gap-5 select-none", className)}>
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-separator-border/70 bg-background-secondary-default/40 p-6">
        <div className="rounded-full bg-background-primary-default/80 p-2 shadow-xl ring-4 ring-background-primary-default/60">
          <BlobatarAvatar config={config} size={108} />
        </div>
        <span className="mt-2.5 font-mono text-caption-2-medium text-text-tertiary">
          面孔种子: <strong className="text-text-primary">{config.name}</strong>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center justify-between text-caption-2-medium text-text-secondary">
          <span>种子名称 (驱动面孔五官几何哈希)</span>
          <button
            type="button"
            onClick={handleRandomSeed}
            className="inline-flex cursor-pointer items-center gap-1 text-caption-2-medium text-accent-500 hover:text-accent-600"
          >
            <RiDiceLine className="size-3.5" />
            <span>随机生成</span>
          </button>
        </label>
        <Input
          value={config.name}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="输入名字、邮箱或代号…"
          className="h-9"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-caption-2-medium text-text-secondary">
          表情风格 ({BLOBATAR_EXPRESSIONS.length} 种)
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {BLOBATAR_EXPRESSIONS.map((expr) => {
            const selected = (config.expression ?? "idle") === expr.id
            return (
              <button
                key={expr.id}
                type="button"
                onClick={() => update({ expression: expr.id as BlobatarExpressionName })}
                className={cx(
                  "flex cursor-pointer flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-all",
                  selected
                    ? "border-accent-500 bg-accent-500/10 shadow-xs"
                    : "border-separator-border/60 bg-background-primary-default text-text-secondary hover:bg-background-secondary-hover/50"
                )}
              >
                <span
                  className={cx(
                    "text-caption-2-medium",
                    selected ? "text-accent-500" : "text-text-primary"
                  )}
                >
                  {expr.label}
                </span>
                <span className="line-clamp-1 text-caption-2-medium text-text-tertiary">{expr.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-caption-2-medium text-text-secondary">主题色调预设</label>
        <div className="flex flex-wrap items-center gap-2">
          {BLOBATAR_COLOR_PRESETS.map((preset) => {
            const selected =
              config.hue === preset.hue && Math.abs((config.tone ?? 0.45) - preset.tone) < 0.05
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => update({ hue: preset.hue, tone: preset.tone })}
                style={{ backgroundColor: preset.previewHex }}
                className={cx(
                  "size-6 cursor-pointer rounded-full transition-transform",
                  selected ? "scale-110 ring-2 ring-accent-500 ring-offset-2" : "opacity-85 hover:scale-105"
                )}
                title={preset.label}
              />
            )
          })}
        </div>
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex justify-between text-caption-2-medium text-text-tertiary">
            <span>色相角度 (Hue)</span>
            <span className="font-mono">{config.hue ?? 235}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={config.hue ?? 235}
            onChange={(event) => update({ hue: Number(event.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--color-chart-1), var(--color-chart-2), var(--color-chart-3), var(--color-chart-4), var(--color-chart-5), var(--color-chart-1))"
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-separator-border/50 pt-1">
        <OptionGroup
          label="背景板形状"
          options={BACKDROP_OPTIONS}
          value={config.background ?? "squircle"}
          onChange={(background) => update({ background })}
        />
        <OptionGroup
          label="动画表现"
          options={ANIMATE_OPTIONS}
          value={config.animate ?? "always"}
          onChange={(animate) => update({ animate })}
        />
      </div>
    </div>
  )
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: Array<{ id: T; label: string }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-caption-2-medium text-text-secondary">{label}</label>
      <div className="flex rounded-lg border border-separator-border/70 bg-background-secondary-default/50 p-0.5 text-caption-2-medium">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cx(
              "flex-1 cursor-pointer rounded-md py-1 text-center transition-all",
              value === option.id
                ? "bg-background-primary-default text-text-primary shadow-2xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
