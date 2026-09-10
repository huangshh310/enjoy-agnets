import assert from "node:assert/strict"
import { test } from "node:test"
import { assertGitBranchName } from "./workspace-git-branch.ts"

test("合法分支名通过", () => {
  assert.equal(assertGitBranchName("feat/repo-outline"), "feat/repo-outline")
})

test("拒绝危险分支名", () => {
  assert.throws(() => assertGitBranchName("-rf"), /Invalid/)
  assert.throws(() => assertGitBranchName("a..b"), /Invalid/)
  assert.throws(() => assertGitBranchName("foo;rm"), /Invalid/)
})
