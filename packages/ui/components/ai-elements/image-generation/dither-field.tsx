/**
 * 生成中点阵层：细指针可把簇吸过去。
 */
import { motion } from "motion/react"
import { useEffect, useRef } from "react"
import { EASE_OUT } from "@/lib/ease"
import { useHoverCapable } from "@/lib/use-hover-capable"
import { fitDitherCanvas, paintDitherDots, stepPointer, wanderPointer, type DitherPointer } from "./dither-draw"
import { OVERLAY_OPACITY, type ImageGenerationStatus } from "./image-generation.types"

export function DitherField({
  interactive,
  reduce,
  status
}: {
  interactive: boolean
  reduce: boolean
  status: ImageGenerationStatus
}) {
  const canHover = useHoverCapable()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    return runDitherLoop(canvas, context, interactive && canHover && !reduce, reduce)
  }, [canHover, interactive, reduce])

  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={{ opacity: OVERLAY_OPACITY[status] }}
      transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT }}
      className="absolute inset-0 overflow-hidden bg-background-secondary-default text-text-primary"
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full text-text-primary" />
    </motion.div>
  )
}

function runDitherLoop(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  pointerEnabled: boolean,
  reduce: boolean
) {
  let frame = 0
  let size = { width: 208, height: 208, color: "currentColor" }
  const pointer: DitherPointer = { x: 0, y: 0, targetX: 0, targetY: 0, inside: false }
  const resize = () => {
    size = fitDitherCanvas(canvas, context, pointer)
  }
  const draw = (time: number) => {
    context.clearRect(0, 0, size.width, size.height)
    wanderPointer(pointer, size.width, size.height, time, reduce)
    stepPointer(pointer, reduce)
    paintDitherDots(context, size.width, size.height, pointer, size.color)
    if (!reduce) frame = window.requestAnimationFrame(draw)
  }
  const onMove = (event: PointerEvent) => {
    if (!pointerEnabled) return
    const rect = canvas.getBoundingClientRect()
    pointer.inside = true
    pointer.targetX = event.clientX - rect.left
    pointer.targetY = event.clientY - rect.top
  }
  resize()
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize)
  observer?.observe(canvas)
  const onLeave = () => {
    pointer.inside = false
  }
  canvas.addEventListener("pointermove", onMove, { passive: true })
  canvas.addEventListener("pointerleave", onLeave)
  draw(0)
  return () => {
    if (frame) window.cancelAnimationFrame(frame)
    observer?.disconnect()
    canvas.removeEventListener("pointermove", onMove)
    canvas.removeEventListener("pointerleave", onLeave)
  }
}
