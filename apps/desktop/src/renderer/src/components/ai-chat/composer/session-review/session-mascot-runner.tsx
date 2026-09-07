/**
 * 像素小猫沿改动条顶边巡逻，随机金币抛物线起跳并迸星花。
 */
import { useLayoutEffect, useRef, type RefObject } from "react"
import { SessionMascot } from "./session-mascot"
import { RUNNER_INSET, RUNNER_SIZE, spriteTransform } from "./session-mascot-track"
import { runMascotLoop } from "./session-mascot-loop"

export function SessionMascotRunner({
  boxRef,
  active
}: {
  boxRef: RefObject<HTMLElement | null>
  active: boolean
}) {
  const spriteRef = useRef<HTMLDivElement>(null)
  const coinsRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const sprite = spriteRef.current
    const box = boxRef.current
    const coinsLayer = coinsRef.current
    if (!sprite || !box || !coinsLayer) return
    return runMascotLoop(sprite, box, coinsLayer, active)
  }, [active, boxRef])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible select-none">
      <div ref={coinsRef} className="absolute inset-0 overflow-visible" />
      <div
        ref={spriteRef}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 z-20 origin-bottom text-state-success-text drop-shadow-[0_1px_0_rgba(0,0,0,0.35)] will-change-transform"
        style={{
          width: RUNNER_SIZE,
          height: RUNNER_SIZE,
          transform: spriteTransform(RUNNER_INSET, 0, 1)
        }}
      >
        <SessionMascot active={active} />
      </div>
    </div>
  )
}
