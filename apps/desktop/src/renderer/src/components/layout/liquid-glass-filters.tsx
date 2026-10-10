/**
 * Liquid Glass 光学滤镜：棱镜描边用的轻微 RGB 色差。
 * 只挂在外壳 ::after（1px 镂空边）上，禁止位移卡片正文。
 * 指针写入 --glass-light-x/y（百分比）和 --glass-light-angle（只给描边）。
 */
import { useEffect, useState } from "react"

function gpuCompositingConfirmed(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-gpu-compositing") === "on"
  )
}

export function LiquidGlassFilters() {
  const [gpuOn, setGpuOn] = useState(gpuCompositingConfirmed)

  useEffect(() => {
    const doc = document.documentElement
    const sync = () => setGpuOn(doc.getAttribute("data-gpu-compositing") === "on")
    const observer = new MutationObserver(sync)
    observer.observe(doc, { attributes: true, attributeFilter: ["data-gpu-compositing"] })
    sync()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!gpuOn) return
    let frameId: number | null = null
    let targetX = 50
    let targetY = 28
    let targetAngle = 135

    const updateCssProps = () => {
      const doc = document.documentElement
      if (doc.getAttribute("data-skin") === "glass") {
        doc.style.setProperty("--glass-light-x", `${targetX.toFixed(1)}%`)
        doc.style.setProperty("--glass-light-y", `${targetY.toFixed(1)}%`)
        doc.style.setProperty("--glass-light-angle", `${targetAngle.toFixed(1)}deg`)
      }
      frameId = null
    }

    const handlePointerMove = (e: MouseEvent) => {
      if (document.documentElement.getAttribute("data-skin") !== "glass") return

      const w = window.innerWidth || 1000
      const h = window.innerHeight || 800
      targetX = Math.max(8, Math.min(92, (e.clientX / w) * 100))
      targetY = Math.max(12, Math.min(72, (e.clientY / h) * 100))
      targetAngle = 135 + ((e.clientX - w / 2) / w) * 48

      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateCssProps)
      }
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [gpuOn])

  if (!gpuOn) return null

  return (
    <svg
      className="pointer-events-none absolute h-0 w-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      <defs>
        <filter id="skin-liquid-glass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceGraphic" dx="0.6" dy="0" result="SHIFT_R" />
          <feOffset in="SourceGraphic" dx="-0.6" dy="0" result="SHIFT_B" />
          <feColorMatrix
            in="SHIFT_R"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"
            result="RED"
          />
          <feColorMatrix
            in="SHIFT_B"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0.55 0"
            result="BLUE"
          />
          <feBlend in="SourceGraphic" in2="RED" mode="screen" result="WITH_R" />
          <feBlend in="WITH_R" in2="BLUE" mode="screen" />
        </filter>
      </defs>
    </svg>
  )
}
