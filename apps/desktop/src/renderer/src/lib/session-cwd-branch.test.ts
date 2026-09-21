import assert from "node:assert/strict"
import { test } from "node:test"
import {
  branchMismatchOf,
  recordedSessionBranch,
  rememberSessionBranch,
  resetSessionBranchesForTests,
  seedSessionBranch
} from "./session-cwd-branch.ts"

test("首次 seed 不弹横幅，切走且有用户轮才提示", () => {
  resetSessionBranchesForTests()
  seedSessionBranch("sess_1", "main")
  assert.equal(recordedSessionBranch("sess_1"), "main")
  assert.equal(
    branchMismatchOf({ sessionId: "sess_1", currentBranch: "main", hasUserTurns: true }),
    null
  )
  assert.equal(
    branchMismatchOf({ sessionId: "sess_1", currentBranch: "feat", hasUserTurns: false }),
    null
  )
  assert.deepEqual(
    branchMismatchOf({ sessionId: "sess_1", currentBranch: "feat", hasUserTurns: true }),
    { recorded: "main", current: "feat" }
  )
})

test("发送后记住当前分支，横幅消失", () => {
  resetSessionBranchesForTests()
  rememberSessionBranch("sess_1", "main")
  rememberSessionBranch("sess_1", "feat")
  assert.equal(
    branchMismatchOf({ sessionId: "sess_1", currentBranch: "feat", hasUserTurns: true }),
    null
  )
})

test("空会话、无分支、无 id 都不提示", () => {
  resetSessionBranchesForTests()
  assert.equal(branchMismatchOf({ sessionId: null, currentBranch: "main", hasUserTurns: true }), null)
  assert.equal(branchMismatchOf({ sessionId: "s", currentBranch: "", hasUserTurns: true }), null)
})
