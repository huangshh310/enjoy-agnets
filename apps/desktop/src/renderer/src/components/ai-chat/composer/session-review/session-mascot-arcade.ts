/**
 * 金币街机：随机出币、走近起跳、从下往上顶。走动交给 CSS，这里只判距离。
 */
export const LEAP_GAP_PX = 36
export const COIN_GAP_MIN_MS = 2600
export const COIN_GAP_MAX_MS = 5200
export const COIN_FIRST_MIN_MS = 700
export const COIN_FIRST_MAX_MS = 1600

export function nextCoinDelay(first = false): number {
  if (first) return COIN_FIRST_MIN_MS + Math.random() * (COIN_FIRST_MAX_MS - COIN_FIRST_MIN_MS)
  return COIN_GAP_MIN_MS + Math.random() * (COIN_GAP_MAX_MS - COIN_GAP_MIN_MS)
}

/** 金币放在跑道另一半，小猫必须走一段再跳。 */
export function pickCoinLeftPct(catLeftPct: number): number {
  if (catLeftPct < 50) return 58 + Math.random() * 28
  return 8 + Math.random() * 28
}

export function shouldLeap(cat: DOMRect, coin: DOMRect): boolean {
  const ahead = coin.left - cat.right
  const behind = cat.left - coin.right
  return (ahead > 0 && ahead < LEAP_GAP_PX) || (behind > 0 && behind < LEAP_GAP_PX)
}

/** 头从底下顶到金币。 */
export function coinHitFromBelow(cat: DOMRect, coin: DOMRect): boolean {
  const overlapX = cat.right > coin.left + 2 && cat.left < coin.right - 2
  const headHits = cat.top <= coin.bottom && cat.top >= coin.top - 24
  return overlapX && headHits
}

export function catLeftPct(track: DOMRect, cat: DOMRect): number {
  if (track.width <= 0) return 0
  return ((cat.left - track.left) / track.width) * 100
}
