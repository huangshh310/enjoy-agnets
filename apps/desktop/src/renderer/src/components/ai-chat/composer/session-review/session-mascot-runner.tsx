/**
 * 像素小猫沿改动条顶边巡逻，随机金币抛物线起跳并迸星花。
 */
import { useLayoutEffect, useRef, type RefObject } from "react"
import { SessionMascot } from "./session-mascot"
import {
  COIN_HOVER,
  COIN_SIZE,
  RUNNER_INSET,
  RUNNER_SIZE,
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

const COIN_SVG = `<svg viewBox="0 0 8 8" width="${COIN_SIZE}" height="${COIN_SIZE}" shape-rendering="crispEdges" fill="#e8b923" aria-hidden="true"><path class="composer-coin-face" d="${COIN_FACE_PATH}"/><path class="composer-coin-edge" d="${COIN_EDGE_PATH}"/></svg>`
const STAR_SVG = `<svg viewBox="0 0 8 8" width="8" height="8" shape-rendering="crispEdges" fill="#f4e27a" aria-hidden="true"><path class="composer-coin-face" d="${STAR_FACE_PATH}"/><path class="composer-coin-edge" d="${STAR_EDGE_PATH}"/></svg>`

type LiveCoin = Coin & {
  el: HTMLDivElement
  collectedAt: number | null
}

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

function runMascotLoop(
  sprite: HTMLDivElement,
  box: HTMLElement,
  coinsLayer: HTMLDivElement,
  active: boolean
): () => void {
  let pose: RunnerPose = { x: sitX(box.offsetWidth), y: 0, facing: 1 }
  let prevWidth = box.offsetWidth
  let last = performance.now()
  let raf = 0
  let coinId = 0
  let nextCoinAt = last + 3000
  const coins: LiveCoin[] = []
  const reduced = prefersReducedMotion()

  const clearCoins = () => {
    for (const coin of coins) coin.el.remove()
    coins.length = 0
  }

  const apply = (now: number) => {
    const width = box.offsetWidth
    if (prevWidth > 0 && prevWidth !== width) {
      pose = { ...pose, x: scaleX(pose.x, prevWidth, width) }
      for (const coin of coins) {
        coin.x = scaleX(coin.x, prevWidth, width)
        coin.el.style.transform = `translate3d(${Math.round(coin.x)}px, -${coin.height}px, 0)`
      }
    }
    prevWidth = width

    if (!active || reduced) {
      clearCoins()
      pose = { x: sitX(width), y: 0, facing: 1 }
      last = now
      sprite.style.transform = spriteTransform(pose.x, pose.y, pose.facing)
      return
    }

    spawnCoinIfDue(now)
    const dt = Math.min(48, now - last)
    const activeCoins = coins.filter((c) => c.collectedAt === null)
    pose = stepRunner(pose, width, dt, activeCoins)
    collectHits(now, activeCoins)
    pruneCoins(now)
    last = now
    sprite.style.transform = spriteTransform(pose.x, pose.y, pose.facing)

    function spawnCoinIfDue(stamp: number) {
      if (stamp < nextCoinAt || coins.length >= 2 || width <= 120) return
      const coinX = pickCoinX(width, pose.x)
      if (coinX === null) return
      const el = document.createElement("div")
      el.className = "absolute bottom-0 left-0 pointer-events-none transition-opacity duration-200"
      el.style.width = `${COIN_SIZE}px`
      el.style.height = `${COIN_SIZE}px`
      el.style.transform = `translate3d(${Math.round(coinX)}px, -${COIN_HOVER}px, 0)`
      el.innerHTML = COIN_SVG
      coinsLayer.append(el)
      coins.push({ id: ++coinId, x: coinX, height: COIN_HOVER, el, collectedAt: null })
      nextCoinAt = stamp + nextCoinDelay()
    }

    function collectHits(stamp: number, live: LiveCoin[]) {
      for (const coin of live) {
        if (!coinCollected(pose, coin)) continue
        coin.collectedAt = stamp
        coin.el.style.transform = `translate3d(${Math.round(coin.x)}px, -${coin.height + 12}px, 0) scale(1.3)`
        coin.el.style.opacity = "0"
        setTimeout(() => coin.el.remove(), 250)
        popStar(coinsLayer, coin.x, coin.height)
      }
    }

    function pruneCoins(stamp: number) {
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]!
        if (c.collectedAt !== null && stamp - c.collectedAt > 300) {
          c.el.remove()
          coins.splice(i, 1)
        }
      }
    }
  }

  apply(last)
  if (!active || reduced) return () => clearCoins()

  const tick = (now: number) => {
    apply(now)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(raf)
    clearCoins()
  }
}

function popStar(layer: HTMLDivElement, x: number, y: number) {
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
