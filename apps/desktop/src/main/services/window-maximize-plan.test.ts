import assert from "node:assert/strict"
import { test } from "node:test"
import { isFilledWorkArea, planMaximizeToggle } from "./window-maximize-plan.ts"

const work = { x: 0, y: 0, width: 1920, height: 1040 }
const windowed = { x: 80, y: 60, width: 1440, height: 920 }

test("OS 未置位但已经铺满工作区时必须还原，不能再次 maximize", () => {
  const plan = planMaximizeToggle({
    osMaximized: false,
    bounds: work,
    workArea: work,
    saved: windowed
  })
  assert.equal(plan.action, "restore")
  assert.deepEqual(plan.restoreTo, windowed)
})

test("OS 已最大化时还原", () => {
  const plan = planMaximizeToggle({
    osMaximized: true,
    bounds: work,
    workArea: work,
    saved: windowed
  })
  assert.equal(plan.action, "restore")
})

test("普通窗口尺寸走放大", () => {
  const plan = planMaximizeToggle({
    osMaximized: false,
    bounds: windowed,
    workArea: work
  })
  assert.equal(plan.action, "maximize")
})

test("工作区比对允许 8px 误差", () => {
  assert.equal(isFilledWorkArea({ x: 2, y: -1, width: 1918, height: 1042 }, work), true)
  assert.equal(isFilledWorkArea(windowed, work), false)
})
