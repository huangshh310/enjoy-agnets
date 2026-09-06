import assert from "node:assert/strict"
import { test } from "node:test"
import { sitX, spriteTransform, stepRunner } from "./session-mascot-track.ts"

test("往返到右缘后掉头", () => {
  const next = stepRunner({ x: 200, y: 0, facing: 1 }, 120, 1000)
  assert.equal(next.facing, -1)
  assert.ok(next.x < 120)
})

test("静止位在右侧约七成处", () => {
  assert.ok(sitX(200) > 100)
})

test("双参数变换落在轨道内部，不写 -100%", () => {
  const css = spriteTransform(48, 1)
  assert.match(css, /translate3d\(48px, \d+px, 0\)/)
  assert.doesNotMatch(css, /-100%/)
})
