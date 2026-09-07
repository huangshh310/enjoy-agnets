/**
 * 宠物在改动条顶边的巡逻走动与吃金币跳跃。
 */
export const RUNNER_SIZE = 18
export const RUNNER_SPEED_PX = 140
export const RUNNER_INSET = 6
export const RUNNER_Y_PX = 0
export const SIT_RATIO = 0.72

export const COIN_SIZE = 12
export const COIN_HOVER = 16
export const COIN_WIDTH = 8
export const COIN_JUMP_LEAD = 24
export const COLLECT_X = 10
export const COIN_GAP_MIN_MS = 4000
export const COIN_GAP_MAX_MS = 8500

export function spriteTransform(x: number, y: number, facing: 1 | -1): string {
  return `translate3d(${Math.round(x)}px, ${Math.round(-y)}px, 0) scaleX(${facing})`
}

export type RunnerPose = {
  x: number
  y: number
  facing: 1 | -1
  airborne?: boolean
}

export type Coin = {
  id: number
  x: number
  height: number
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function sitX(width: number): number {
  return Math.max(RUNNER_INSET, width * SIT_RATIO - RUNNER_SIZE / 2)
}

function arc(x: number, left: number, right: number, peak: number, lead = 0): number {
  const start = left - lead
  const end = right + lead
  if (x < start || x > end) return 0
  const width = end - start
  if (width <= 0) return 0
  const t = (x - start) / width
  return Math.sin(t * Math.PI) * peak
}

export function jumpHeight(x: number, coins: readonly Coin[] = []): number {
  let height = 0
  for (const coin of coins) {
    height = Math.max(
      height,
      arc(x, coin.x - COIN_WIDTH / 2, coin.x + COIN_WIDTH / 2, coin.height, COIN_JUMP_LEAD)
    )
  }
  return height
}

export function stepRunner(
  pose: RunnerPose,
  width: number,
  dtMs: number,
  coins: readonly Coin[] = []
): RunnerPose {
  const insetTrack = Math.max(0, width - RUNNER_INSET * 2 - RUNNER_SIZE)
  if (insetTrack <= 0) return { x: RUNNER_INSET, y: 0, facing: 1, airborne: false }

  let { x, facing } = pose
  x += facing * RUNNER_SPEED_PX * (dtMs / 1000)
  const min = RUNNER_INSET
  const max = RUNNER_INSET + insetTrack

  if (x >= max) {
    x = max
    facing = -1
  } else if (x <= min) {
    x = min
    facing = 1
  }

  const y = jumpHeight(x, coins)
  return { x, y, facing, airborne: y > 1 }
}

export function coinCollected(pose: RunnerPose, coin: Coin): boolean {
  if (Math.abs(pose.x - coin.x) > COLLECT_X) return false
  const mascotTop = pose.y + RUNNER_SIZE
  return mascotTop >= coin.height - COIN_SIZE / 2
}

export function pickCoinX(width: number, runnerX: number): number | null {
  const trackWidth = width - RUNNER_INSET * 2 - COIN_SIZE
  if (trackWidth < 80) return null
  const minDistance = 60
  for (let i = 0; i < 4; i++) {
    const candidate = RUNNER_INSET + Math.random() * trackWidth
    if (Math.abs(candidate - runnerX) >= minDistance) return candidate
  }
  return null
}

export function nextCoinDelay(): number {
  return COIN_GAP_MIN_MS + Math.random() * (COIN_GAP_MAX_MS - COIN_GAP_MIN_MS)
}

export function scaleX(x: number, prevWidth: number, nextWidth: number): number {
  if (prevWidth <= 0 || nextWidth <= 0) return x
  return (x / prevWidth) * nextWidth
}
