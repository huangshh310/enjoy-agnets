import assert from "node:assert/strict"
import { test } from "node:test"
import {
  MASCOT_WALK_KEYFRAMES,
  MASCOT_WALK_MS,
  mascotWalkDuration
} from "./session-mascot-patrol.ts"

test("巡逻用满宽 calc，不写死像素轨道", () => {
  const rights = MASCOT_WALK_KEYFRAMES.map((frame) => frame.left)
  assert.ok(rights.includes("calc(100% - 22px)"))
  assert.ok(rights.includes("0px"))
  assert.equal(mascotWalkDuration(false), MASCOT_WALK_MS)
  assert.ok(mascotWalkDuration(true) > MASCOT_WALK_MS)
})
