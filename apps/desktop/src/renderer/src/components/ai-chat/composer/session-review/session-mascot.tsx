/**
 * 8×8 像素猫。跑动时切 talk 帧。
 */
import { cx } from "@/utils/cx"
import { MASCOT_GRID, SESSION_CAT } from "./session-mascots"
import "./session-mascot.css"

export function SessionMascot({
  active,
  className
}: {
  active?: boolean
  className?: string
}) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${MASCOT_GRID} ${MASCOT_GRID}`}
      shapeRendering="crispEdges"
      className={cx("size-5 shrink-0", active && "session-mascot-active", className)}
      fill="currentColor"
    >
      {active ? (
        <>
          <path className="session-mascot-rest" d={SESSION_CAT.restPath} />
          <path className="session-mascot-talk" d={SESSION_CAT.talkPath} />
        </>
      ) : (
        <path d={SESSION_CAT.restPath} />
      )}
    </svg>
  )
}
