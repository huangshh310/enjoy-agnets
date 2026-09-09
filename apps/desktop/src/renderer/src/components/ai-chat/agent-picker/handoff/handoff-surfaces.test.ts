import assert from "node:assert/strict"
import { test } from "node:test"
import { handoffSurfaces } from "./handoff-surfaces.ts"

const banner = { sessionId: "s1", fromRuntimeId: "claude", toRuntimeId: "cursor" }

test("确认卡打开时绝不叠已交接微条", () => {
  assert.deepEqual(handoffSurfaces("handoff_pending", banner), { showCard: true, showBanner: false })
  assert.deepEqual(handoffSurfaces("blocked_by_approval", banner), { showCard: true, showBanner: false })
  assert.deepEqual(handoffSurfaces("disposing", banner), { showCard: true, showBanner: false })
})

test("确认成功后只留微条；取消后无卡无条", () => {
  assert.deepEqual(handoffSurfaces("idle", banner), { showCard: false, showBanner: true })
  assert.deepEqual(handoffSurfaces("idle", null), { showCard: false, showBanner: false })
})
