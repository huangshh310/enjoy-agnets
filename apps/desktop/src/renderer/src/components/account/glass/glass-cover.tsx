/**
 * Canvas UI 封面：仅挂四套官方着色器，右上角切换。底板走语义 token，不拉 Unsplash。
 */
import type { ReactNode } from "react"
import { RiCheckLine, RiImageLine } from "@remixicon/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { Frost, GlyphRain, HexFloat, RetroDither } from "../../canvasui"
import { GLASS_COVER_PRESETS } from "../constants"
import type { GlassCoverPreset } from "../types/profile.types"

interface GlassCoverProps {
  preset?: GlassCoverPreset
  onPresetChange?: (preset: GlassCoverPreset) => void
  className?: string
  height?: number
  children?: ReactNode
}

function CoverBackdrop() {
  return <div className="h-full w-full bg-background-tertiary-default" />
}

function CoverShader({
  preset,
  children
}: {
  preset: GlassCoverPreset
  children: ReactNode
}) {
  if (preset === "hex-float") {
    return (
      <HexFloat size={60} tilt={16} float={0.3} shine={0.8} flow={1.2} className="h-full w-full">
        {children}
      </HexFloat>
    )
  }
  if (preset === "retro-dither") {
    return (
      <RetroDither pixelSize={2.5} levels={4} colorize={0.25} contrast={0.6} className="h-full w-full">
        {children}
      </RetroDither>
    )
  }
  if (preset === "frost") {
    return (
      <Frost frost={0.15} strength={0.8} refraction={1.3} meltRadius={0.28} className="h-full w-full">
        {children}
      </Frost>
    )
  }
  return (
    <GlyphRain
      speed={0.2}
      cell={14}
      color={[0.27, 0.45, 1]}
      headColor={[0.65, 0.85, 1]}
      glow={2}
      stir={0.8}
      className="h-full w-full"
    >
      {children}
    </GlyphRain>
  )
}

export function GlassCover({
  preset = "glyph-rain",
  onPresetChange,
  className,
  height = 210,
  children
}: GlassCoverProps) {
  const active = GLASS_COVER_PRESETS.find((item) => item.id === preset) ?? GLASS_COVER_PRESETS[0]!

  return (
    <div
      className={cx("relative w-full overflow-hidden rounded-t-2xl select-none", className)}
      style={{ height }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <CoverShader preset={active.id}>
          <CoverBackdrop />
        </CoverShader>
      </div>

      {onPresetChange ? (
        <div className="absolute top-3.5 right-3.5 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cx(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-separator-border",
                  "bg-background-primary-default/80 px-2.5 py-1 text-caption-2-medium text-text-primary",
                  "shadow-sm backdrop-blur-md transition-all hover:bg-background-secondary-hover active:scale-95"
                )}
              >
                <RiImageLine className="size-3.5 text-foreground-icon-secondary" />
                <span>更换特效封面</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1">
              {GLASS_COVER_PRESETS.map((item) => {
                const selected = item.id === active.id
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onPresetChange(item.id)}
                    className="flex cursor-pointer items-center justify-between px-2 py-1.5 text-caption-2-medium"
                  >
                    <div className="flex min-w-0 flex-col pr-1">
                      <span className="truncate text-caption-1-medium text-text-primary">{item.label}</span>
                      <span className="mt-0.5 truncate text-caption-2-medium text-text-tertiary">
                        {item.desc}
                      </span>
                    </div>
                    {selected ? <RiCheckLine className="ml-1 size-3.5 shrink-0 text-accent-500" /> : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {children}
    </div>
  )
}
