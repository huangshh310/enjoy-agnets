/**
 * Blobatar 头像：确定性哈希五官、表情、色相与呼吸微动。
 */
import { Blobatar } from "@blobatar/react"
import * as expressions from "blobatar/expression"
import { cx } from "@/utils/cx"
import type { BlobatarConfig } from "./blobatar.types"
import { DEFAULT_BLOBATAR_CONFIG } from "./blobatar.types"

export interface BlobatarAvatarProps {
  config?: Partial<BlobatarConfig>
  name?: string
  size?: number
  expression?: BlobatarConfig["expression"]
  hue?: number
  tone?: number
  background?: BlobatarConfig["background"]
  animate?: BlobatarConfig["animate"]
  presence?: "online" | "busy" | "thinking" | "offline"
  className?: string
  title?: string
}

const PRESENCE_CLASS: Record<NonNullable<BlobatarAvatarProps["presence"]>, string> = {
  online: "bg-accent-500",
  busy: "bg-text-error-primary",
  thinking: "bg-accent-500 animate-pulse",
  offline: "bg-text-tertiary"
}

export function BlobatarAvatar({
  config,
  name,
  size = 40,
  expression,
  hue,
  tone,
  background,
  animate,
  presence,
  className,
  title
}: BlobatarAvatarProps) {
  const resolvedName = name ?? config?.name ?? DEFAULT_BLOBATAR_CONFIG.name
  const resolvedExpression =
    expression ?? config?.expression ?? DEFAULT_BLOBATAR_CONFIG.expression ?? "idle"
  const resolvedHue = hue ?? config?.hue ?? DEFAULT_BLOBATAR_CONFIG.hue
  const resolvedTone = tone ?? config?.tone ?? DEFAULT_BLOBATAR_CONFIG.tone
  const resolvedBg = background ?? config?.background ?? DEFAULT_BLOBATAR_CONFIG.background ?? "squircle"
  const resolvedAnimate = animate ?? config?.animate ?? DEFAULT_BLOBATAR_CONFIG.animate ?? "always"
  const bgProp: boolean | "square" | "circle" | "squircle" =
    resolvedBg === "none" ? false : resolvedBg
  // blobatar 把每个表情挂在同名 namespace 导出上，只能按名取。
  // eslint-disable-next-line import/namespace
  const expressionObj = expressions[resolvedExpression as keyof typeof expressions]
  const expr = typeof expressionObj === "object" ? (expressionObj as expressions.Expression) : undefined
  const live = resolvedAnimate === "always" || resolvedAnimate === "hover"

  return (
    <div
      className={cx("relative inline-flex shrink-0 items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
      title={title ?? resolvedName}
    >
      <Blobatar
        name={resolvedName || "Enjoy"}
        size={size}
        background={bgProp}
        hue={resolvedHue}
        tone={resolvedTone}
        expression={expr}
        animate={live ? resolvedAnimate : undefined}
        className="h-full w-full overflow-visible object-contain"
      />
      {presence ? (
        <span
          className={cx(
            "absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-background-primary-default",
            PRESENCE_CLASS[presence]
          )}
        />
      ) : null}
    </div>
  )
}
