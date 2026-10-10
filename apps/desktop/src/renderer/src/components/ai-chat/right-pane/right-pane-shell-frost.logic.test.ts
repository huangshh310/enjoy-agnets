import assert from "node:assert/strict"
import { test } from "node:test"
import { isReviewDecorEmpty, shouldRightPaneShellFrost } from "./right-pane-shell-frost.logic"

test("启动页不挂 shell 装饰", () => {
  assert.equal(
    shouldRightPaneShellFrost({ emptyPicker: true, reviewActive: false, reviewDecorEmpty: false }),
    false
  )
})

test("审查无 scoped 改动：装饰关", () => {
  assert.equal(
    isReviewDecorEmpty({
      reviewActive: true,
      reviewScope: "uncommitted",
      changes: [],
      lastTurnPaths: [],
      branchFiles: [],
      commits: [],
      checkpoints: []
    }),
    true
  )
  assert.equal(
    shouldRightPaneShellFrost({ emptyPicker: false, reviewActive: true, reviewDecorEmpty: true }),
    false
  )
})

test("有改动但 last-turn scoped 为空：装饰关", () => {
  assert.equal(
    isReviewDecorEmpty({
      reviewActive: true,
      reviewScope: "last-turn",
      changes: [{ path: "a.ts", status: "modified", additions: 1, deletions: 0 }],
      lastTurnPaths: [],
      branchFiles: [],
      commits: [],
      checkpoints: []
    }),
    true
  )
})

test("提交历史空列表：装饰关", () => {
  assert.equal(
    isReviewDecorEmpty({
      reviewActive: true,
      reviewScope: "commits",
      changes: [{ path: "a.ts", status: "modified", additions: 1, deletions: 0 }],
      lastTurnPaths: [],
      branchFiles: [],
      commits: [],
      checkpoints: []
    }),
    true
  )
})

test("审查有 scoped 文件：装饰开", () => {
  assert.equal(
    isReviewDecorEmpty({
      reviewActive: true,
      reviewScope: "uncommitted",
      changes: [{ path: "a.ts", status: "modified", additions: 1, deletions: 0 }],
      lastTurnPaths: [],
      branchFiles: [],
      commits: [],
      checkpoints: []
    }),
    false
  )
  assert.equal(
    shouldRightPaneShellFrost({ emptyPicker: false, reviewActive: true, reviewDecorEmpty: false }),
    true
  )
})
