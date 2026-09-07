/**
 * 小猫巡逻 rAF：走动、吐金币、碰撞吃掉并迸星花。
 */
import {
  COIN_HOVER,
  COIN_SIZE,
  coinCollected,
  nextCoinDelay,
  pickCoinX,
  prefersReducedMotion,
  scaleX,
  sitX,
  spriteTransform,
  stepRunner,
  type Coin,
  type RunnerPose
} from "./session-mascot-track"
import {
  COIN_EDGE_PATH,
  COIN_FACE_PATH,
  STAR_EDGE_PATH,
  STAR_FACE_PATH
} from "./session-mascots"

const COIN_SVG = `<svg viewBox="0 0 8 8" width="${COIN_SIZE}" height="${COIN_SIZE}" shape-rendering="crispEdges" class="composer-coin-fill" aria-hidden="true"><path class="composer-coin-face" d="${COIN_FACE_PATH}"/><path class="composer-coin-edge" d="${COIN_EDGE_PATH}"/></svg>`
const STAR_SVG = `<svg viewBox="0 0 8 8" width="8" height="8" shape-rendering="crispEdges" class="composer-star-fill" aria-hidden="true"><path class="composer-coin-face" d="${STAR_FACE_PATH}"/><path class="composer-coin-edge" d="${STAR_EDGE_PATH}"/></svg>`

type LiveCoin = Coin & { el: HTMLDivElement; collectedAt: number | null }

type LoopEnv = {
  sprite: HTMLDivElement
  box: HTMLElement
  coinsLayer: HTMLDivElement
  active: boolean
  reduced: boolean
}

type LoopState = {
  pose: RunnerPose
  prevWidth: number
  last: number
  coinId: number
  nextCoinAt: number
  coins: LiveCoin[]
}

export function runMascotLoop(
  sprite: HTMLDivElement,
  box: HTMLElement,
  coinsLayer: HTMLDivElement,
  active: boolean
): () => void {
  const env: LoopEnv = { sprite, box, coinsLayer, active, reduced: prefersReducedMotion() }
  const now = performance.now()
  const state: LoopState = {
    pose: { x: sitX(box.offsetWidth), y: 0, facing: 1 },
    prevWidth: box.offsetWidth,
    last: now,
    coinId: 0,
    nextCoinAt: now + 3000,
    coins: []
  }
  tickMascot(state, env, now)
  if (!env.active || env.reduced) return () => clearCoins(state)
  let raf = 0
  const frame = (stamp: number) => {
    tickMascot(state, env, stamp)
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => {
    cancelAnimationFrame(raf)
    clearCoins(state)
  }
}

function tickMascot(state: LoopState, env: LoopEnv, now: number): void {
  syncTrackWidth(state, env.box.offsetWidth)
  if (!env.active || env.reduced) {
    sitStill(state, env.sprite)
    return
  }
  spawnCoinIfDue(state, env, now)
  const live = state.coins.filter((coin) => coin.collectedAt === null)
  state.pose = stepRunner(state.pose, env.box.offsetWidth, Math.min(48, now - state.last), live)
  collectHits(state, env.coinsLayer, now, live)
  pruneCoins(state, now)
  state.last = now
  env.sprite.style.transform = spriteTransform(state.pose.x, state.pose.y, state.pose.facing)
}

function syncTrackWidth(state: LoopState, width: number): void {
  if (state.prevWidth > 0 && state.prevWidth !== width) {
    state.pose = { ...state.pose, x: scaleX(state.pose.x, state.prevWidth, width) }
    for (const coin of state.coins) {
      coin.x = scaleX(coin.x, state.prevWidth, width)
      coin.el.style.transform = `translate3d(${Math.round(coin.x)}px, -${coin.height}px, 0)`
    }
  }
  state.prevWidth = width
}

function sitStill(state: LoopState, sprite: HTMLDivElement): void {
  clearCoins(state)
  state.pose = { x: sitX(state.prevWidth), y: 0, facing: 1 }
  sprite.style.transform = spriteTransform(state.pose.x, state.pose.y, state.pose.facing)
}

function spawnCoinIfDue(state: LoopState, env: LoopEnv, stamp: number): void {
  const width = env.box.offsetWidth
  if (stamp < state.nextCoinAt || state.coins.length >= 2 || width <= 120) return
  const coinX = pickCoinX(width, state.pose.x)
  if (coinX === null) return
  const el = document.createElement("div")
  el.className = "absolute bottom-0 left-0 pointer-events-none transition-opacity duration-200"
  el.style.width = `${COIN_SIZE}px`
  el.style.height = `${COIN_SIZE}px`
  el.style.transform = `translate3d(${Math.round(coinX)}px, -${COIN_HOVER}px, 0)`
  el.innerHTML = COIN_SVG
  env.coinsLayer.append(el)
  state.coins.push({ id: ++state.coinId, x: coinX, height: COIN_HOVER, el, collectedAt: null })
  state.nextCoinAt = stamp + nextCoinDelay()
}

function collectHits(state: LoopState, layer: HTMLDivElement, stamp: number, live: LiveCoin[]): void {
  for (const coin of live) {
    if (!coinCollected(state.pose, coin)) continue
    coin.collectedAt = stamp
    coin.el.style.transform = `translate3d(${Math.round(coin.x)}px, -${coin.height + 12}px, 0) scale(1.3)`
    coin.el.style.opacity = "0"
    setTimeout(() => coin.el.remove(), 250)
    popStar(layer, coin.x, coin.height)
  }
}

function pruneCoins(state: LoopState, stamp: number): void {
  for (let i = state.coins.length - 1; i >= 0; i--) {
    const coin = state.coins[i]!
    if (coin.collectedAt !== null && stamp - coin.collectedAt > 300) {
      coin.el.remove()
      state.coins.splice(i, 1)
    }
  }
}

function clearCoins(state: LoopState): void {
  for (const coin of state.coins) coin.el.remove()
  state.coins.length = 0
}

function popStar(layer: HTMLDivElement, x: number, y: number): void {
  const star = document.createElement("div")
  star.className = "absolute bottom-0 left-0 pointer-events-none"
  star.style.width = "8px"
  star.style.height = "8px"
  star.style.transform = `translate3d(${Math.round(x + 2)}px, -${Math.round(y + 6)}px, 0)`
  star.style.transition = "all 400ms ease-out"
  star.innerHTML = STAR_SVG
  layer.append(star)
  requestAnimationFrame(() => {
    star.style.transform = `translate3d(${Math.round(x + 2 + (Math.random() - 0.5) * 16)}px, -${Math.round(y + 24)}px, 0) scale(1.4)`
    star.style.opacity = "0"
  })
  setTimeout(() => star.remove(), 420)
}
