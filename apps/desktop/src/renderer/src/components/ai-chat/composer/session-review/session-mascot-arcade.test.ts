import assert from "node:assert/strict"
import { test } from "node:test"
import { coinHitFromBelow, pickCoinLeftPct, shouldLeap } from "./session-mascot-arcade.ts"

function rect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    toJSON() {
      return {}
    }
  } as DOMRect
}

test("走近金币才起跳，离太远不起跳", () => {
  const cat = rect(10, 40, 18, 18)
  assert.equal(shouldLeap(cat, rect(40, 8, 12, 12)), true)
  assert.equal(shouldLeap(cat, rect(200, 8, 12, 12)), false)
})

test("平地走过不吃，头顶上去才算顶到", () => {
  const coin = rect(40, 8, 12, 12)
  assert.equal(coinHitFromBelow(rect(36, 40, 18, 18), coin), false)
  assert.equal(coinHitFromBelow(rect(36, 10, 18, 18), coin), true)
})

test("金币出在小猫对面那一半", () => {
  assert.ok(pickCoinLeftPct(10) >= 58)
  assert.ok(pickCoinLeftPct(80) <= 36)
})
