/**
 * 小猫沿审查条满宽来回。用 WAAPI 写 left，禁止读 offsetWidth（空绝对盒子经常是 0）。
 */

export const MASCOT_WALK_MS = 16000
export const MASCOT_WALK_REDUCED_MS = 22000
export const MASCOT_WALK_SIZE_PX = 22

/** 100% 相对包含块（满宽跑道），不是自身 22px。 */
export const MASCOT_WALK_KEYFRAMES: Keyframe[] = [
  { left: "0px", transform: "scaleX(1)" },
  { left: `calc(100% - ${MASCOT_WALK_SIZE_PX}px)`, transform: "scaleX(1)", offset: 0.46 },
  { left: `calc(100% - ${MASCOT_WALK_SIZE_PX}px)`, transform: "scaleX(-1)", offset: 0.5 },
  { left: "0px", transform: "scaleX(-1)", offset: 0.96 },
  { left: "0px", transform: "scaleX(1)" }
]

export function mascotWalkDuration(reduced: boolean): number {
  return reduced ? MASCOT_WALK_REDUCED_MS : MASCOT_WALK_MS
}

export function startMascotWalk(walk: HTMLElement): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const anim = walk.animate(MASCOT_WALK_KEYFRAMES, {
    duration: mascotWalkDuration(reduced),
    easing: "linear",
    iterations: Infinity
  })
  return () => anim.cancel()
}
