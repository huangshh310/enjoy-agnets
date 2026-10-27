/**
 * 输入框流光边。
 * 只在边上走一截彩色，半径跟内壳的真实圆角，不跟系统深色。
 */
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react"
import "./border-beam.css"

type BeamTheme = "dark" | "light" | "auto"

export type BorderBeamProps = {
  children?: ReactNode
  /** 保留给调用方。流光不再按库的 size 换一套色块。 */
  size?: "sm" | "md" | "line" | "pulse-outside" | "pulse-inner"
  /** 保留给调用方。彩色只走边框环，不再按这个值换一套铺进卡片的色块。 */
  colorVariant?: "colorful" | "mono" | "ocean" | "sunset"
  theme?: BeamTheme
  active?: boolean
  strength?: number
  borderRadius?: number
  className?: string
  style?: CSSProperties
}

function subscribeAppDark(onStoreChange: () => void) {
  const root = document.documentElement
  const observer = new MutationObserver(onStoreChange)
  observer.observe(root, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}

function appIsDark() {
  return document.documentElement.classList.contains("dark")
}

/** auto 跟应用的 html.dark，不跟操作系统的 prefers-color-scheme。 */
function useBeamTheme(theme: BeamTheme) {
  const dark = useSyncExternalStore(subscribeAppDark, appIsDark, () => false)
  if (theme === "light" || theme === "dark") return theme
  return dark ? "dark" : "light"
}

/** 没传半径时跟第一个子节点的圆角，皮肤把壳改成 12px 时边也不要停在 22px。 */
function useShellRadius(forced: number | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const [detected, setDetected] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (forced != null) return
    const node = ref.current?.firstElementChild
    if (!(node instanceof Element)) return
    const read = () => {
      const next = Number.parseFloat(getComputedStyle(node).borderTopLeftRadius)
      if (!Number.isFinite(next) || next <= 0) return
      setDetected((prev) => (prev === next ? prev : next))
    }
    read()
    const resize = new ResizeObserver(read)
    resize.observe(node)
    const skin = new MutationObserver(read)
    skin.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-skin"] })
    return () => {
      resize.disconnect()
      skin.disconnect()
    }
  }, [forced])

  return { ref, radius: forced ?? detected ?? undefined }
}

export function BorderBeam({
  children,
  active = true,
  strength = 1,
  borderRadius,
  theme = "auto",
  className,
  style
}: BorderBeamProps) {
  const resolved = useBeamTheme(theme)
  const { ref, radius } = useShellRadius(borderRadius)
  const lit = active && strength > 0
  const beamStrength = Math.max(0, Math.min(1, strength))

  return (
    <div
      ref={ref}
      data-beam=""
      data-on={lit ? "" : undefined}
      data-beam-theme={resolved}
      className={className}
      style={{
        ...style,
        ...(radius != null ? { borderRadius: radius } : {}),
        "--beam-strength": String(beamStrength)
      } as CSSProperties}
    >
      {children}
    </div>
  )
}

export default BorderBeam
