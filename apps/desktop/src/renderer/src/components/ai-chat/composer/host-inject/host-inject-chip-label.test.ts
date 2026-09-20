import assert from "node:assert/strict"
import { test } from "node:test"
import { hostInjectChipLane, hostInjectEnabledCounts } from "./host-inject-chip-label.ts"

test("芯片只在有启用时出 lane，0/0 不画", () => {
  assert.equal(hostInjectChipLane(2, 3), "both")
  assert.equal(hostInjectChipLane(2, 0), "mcp")
  assert.equal(hostInjectChipLane(0, 3), "skills")
  assert.equal(hostInjectChipLane(0, 0), null)
})

test("同引擎信快照已启用数，否则信查询", () => {
  assert.deepEqual(
    hostInjectEnabledCounts({
      snapshotEnabledMcp: 2,
      snapshotEnabledSkills: 3,
      queryMcp: 9,
      querySkills: 9,
      sameRuntime: true
    }),
    { mcp: 2, skills: 3 }
  )
  assert.deepEqual(
    hostInjectEnabledCounts({
      snapshotEnabledMcp: 2,
      snapshotEnabledSkills: 3,
      queryMcp: 1,
      querySkills: 0,
      sameRuntime: false
    }),
    { mcp: 1, skills: 0 }
  )
})
