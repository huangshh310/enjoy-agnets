import assert from "node:assert/strict"
import { test } from "node:test"
import { decideAfterConsume } from "./park-for-approval.ts"

test("还有未决审批：停着等人，不自动再泵", () => {
  assert.equal(
    decideAfterConsume({ pendingCount: 1, resumeAfterPump: false, lastToolState: "approval-requested" }),
    "park"
  )
})

test("点过 Allow 但本轮工具已经跑完：收工，不再开第二圈", () => {
  assert.equal(
    decideAfterConsume({
      pendingCount: 0,
      resumeAfterPump: true,
      lastToolState: "output-available"
    }),
    "complete"
  )
})

test("点过 Allow 且 stream 停在审批/待执行：再泵一轮续跑", () => {
  assert.equal(
    decideAfterConsume({
      pendingCount: 0,
      resumeAfterPump: true,
      lastToolState: "input-available"
    }),
    "continue"
  )
  assert.equal(
    decideAfterConsume({
      pendingCount: 0,
      resumeAfterPump: true,
      lastToolState: "output-denied"
    }),
    "continue"
  )
})

test("没审批也没 resume：收工", () => {
  assert.equal(decideAfterConsume({ pendingCount: 0, resumeAfterPump: false }), "complete")
})
