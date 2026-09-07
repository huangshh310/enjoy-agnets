/**
 * 随机出金币，走近给小猫加起跳 class，顶到后弹出并迸星。
 * 不改小猫的 left——走动只信 CSS。
 */
import { COIN_EDGE_PATH, COIN_FACE_PATH, STAR_EDGE_PATH, STAR_FACE_PATH } from "./session-mascots"
import {
  catLeftPct,
  coinHitFromBelow,
  nextCoinDelay,
  pickCoinLeftPct,
  shouldLeap
} from "./session-mascot-arcade"

const COIN_SIZE = 12
const COIN_SVG = `<svg viewBox="0 0 8 8" width="${COIN_SIZE}" height="${COIN_SIZE}" shape-rendering="crispEdges" class="composer-coin-fill composer-coin-bob" aria-hidden="true"><path class="composer-coin-face" d="${COIN_FACE_PATH}"/><path class="composer-coin-edge" d="${COIN_EDGE_PATH}"/></svg>`
const STAR_SVG = `<svg viewBox="0 0 8 8" width="8" height="8" shape-rendering="crispEdges" class="composer-star-fill" aria-hidden="true"><path class="composer-coin-face" d="${STAR_FACE_PATH}"/><path class="composer-coin-edge" d="${STAR_EDGE_PATH}"/></svg>`

type LiveCoin = { el: HTMLDivElement; collectedAt: number | null }

export function runCoinArcade(
  track: HTMLElement,
  walk: HTMLElement,
  leap: HTMLElement
): () => void {
  const coins: LiveCoin[] = []
  let nextAt = performance.now() + nextCoinDelay(true)
  let raf = 0

  const frame = (now: number) => {
    spawnIfDue(track, walk, coins, now, nextAt, (stamp) => {
      nextAt = stamp
    })
    tickHits(track, walk, leap, coins, now)
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => {
    cancelAnimationFrame(raf)
    for (const coin of coins) coin.el.remove()
    coins.length = 0
    leap.classList.remove("session-mascot-leap")
  }
}

function spawnIfDue(
  track: HTMLElement,
  walk: HTMLElement,
  coins: LiveCoin[],
  now: number,
  nextAt: number,
  setNext: (stamp: number) => void
): void {
  if (now < nextAt || coins.some((coin) => coin.collectedAt === null)) return
  if (track.getBoundingClientRect().width < 160) return
  const el = document.createElement("div")
  el.className = "session-mascot-coin"
  el.style.left = `${pickCoinLeftPct(catLeftPct(track.getBoundingClientRect(), walk.getBoundingClientRect()))}%`
  el.innerHTML = COIN_SVG
  track.append(el)
  coins.push({ el, collectedAt: null })
  setNext(now + nextCoinDelay())
}

function tickHits(
  track: HTMLElement,
  walk: HTMLElement,
  leap: HTMLElement,
  coins: LiveCoin[],
  now: number
): void {
  const walkBox = walk.getBoundingClientRect()
  const leapBox = leap.getBoundingClientRect()
  for (const coin of coins) {
    if (coin.collectedAt !== null) continue
    const box = coin.el.getBoundingClientRect()
    if (shouldLeap(walkBox, box)) leap.classList.add("session-mascot-leap")
    if (!coinHitFromBelow(leapBox, box)) continue
    collectCoin(track, coin, now)
  }
  pruneCoins(coins, now)
}

function collectCoin(track: HTMLElement, coin: LiveCoin, now: number): void {
  coin.collectedAt = now
  coin.el.classList.add("session-mascot-coin-pop")
  const box = coin.el.getBoundingClientRect()
  const trackBox = track.getBoundingClientRect()
  popStar(track, box.left - trackBox.left, trackBox.bottom - box.top)
  setTimeout(() => coin.el.remove(), 280)
}

function pruneCoins(coins: LiveCoin[], now: number): void {
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i]
    if (coin && coin.collectedAt !== null && now - coin.collectedAt > 320) {
      coin.el.remove()
      coins.splice(i, 1)
    }
  }
}

function popStar(track: HTMLElement, x: number, y: number): void {
  const star = document.createElement("div")
  star.className = "session-mascot-star"
  star.style.left = `${Math.round(x)}px`
  star.style.bottom = `${Math.round(y)}px`
  star.innerHTML = STAR_SVG
  track.append(star)
  requestAnimationFrame(() => star.classList.add("session-mascot-star-out"))
  setTimeout(() => star.remove(), 420)
}
