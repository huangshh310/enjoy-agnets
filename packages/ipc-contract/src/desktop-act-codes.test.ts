/**
 * 裸坐标硬拒码：审批与执行共用同一常量与 result 形状。
 */
import assert from "node:assert/strict"
import test from "node:test"
import {
  DESKTOP_ACT_BARE_COORDS_DISABLED,
  desktopActBareCoordsDeniedResult,
  readDesktopActBareCoordsDeniedCode
} from "./desktop-act-codes.ts"

test("denied result 形状固定：success false + 稳定码", () => {
  assert.deepEqual(desktopActBareCoordsDeniedResult(), {
    success: false,
    code: "bare_coords_disabled"
  })
  assert.equal(DESKTOP_ACT_BARE_COORDS_DISABLED, "bare_coords_disabled")
})

test("能从决策 / SDK part / tool.result 读出码", () => {
  assert.equal(
    readDesktopActBareCoordsDeniedCode({ type: "denied", code: DESKTOP_ACT_BARE_COORDS_DISABLED }),
    DESKTOP_ACT_BARE_COORDS_DISABLED
  )
  assert.equal(
    readDesktopActBareCoordsDeniedCode({
      type: "tool-output-denied",
      approval: { reason: DESKTOP_ACT_BARE_COORDS_DISABLED }
    }),
    DESKTOP_ACT_BARE_COORDS_DISABLED
  )
  assert.equal(
    readDesktopActBareCoordsDeniedCode({ result: desktopActBareCoordsDeniedResult() }),
    DESKTOP_ACT_BARE_COORDS_DISABLED
  )
  assert.equal(readDesktopActBareCoordsDeniedCode({ type: "denied", reason: "plan mode is read-only." }), undefined)
})
