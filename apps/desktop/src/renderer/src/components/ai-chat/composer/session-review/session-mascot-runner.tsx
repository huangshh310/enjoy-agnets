/**
 * 小猫沿审查条顶边满宽巡逻；金币由 arcade 随机投放并起跳去顶。
 */
import { useLayoutEffect, useRef } from "react"
import { SessionMascot } from "./session-mascot"
import { runCoinArcade } from "./session-mascot-loop"
import { startMascotWalk } from "./session-mascot-patrol"

export function SessionMascotRunner({ active }: { active: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const walkRef = useRef<HTMLDivElement>(null)
  const leapRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const track = trackRef.current
    const walk = walkRef.current
    const leap = leapRef.current
    if (!active || !track || !walk || !leap) return
    const stopWalk = startMascotWalk(walk)
    const stopCoins = runCoinArcade(track, walk, leap)
    return () => {
      stopWalk()
      stopCoins()
    }
  }, [active])

  if (!active) return null

  return (
    <div
      ref={trackRef}
      className="pointer-events-none absolute inset-x-0 -top-5 z-30 h-6 w-full overflow-visible select-none"
    >
      <div
        ref={walkRef}
        aria-hidden
        className="session-mascot-walk text-state-success-text drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]"
      >
        <div
          ref={leapRef}
          onAnimationEnd={(event) => {
            if (event.animationName === "session-mascot-leap") {
              event.currentTarget.classList.remove("session-mascot-leap")
            }
          }}
        >
          <SessionMascot active />
        </div>
      </div>
    </div>
  )
}
