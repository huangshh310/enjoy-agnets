import assert from "node:assert/strict"
import { test } from "node:test"
import { e2eWorkspaceCount } from "./e2e-workspace-count.ts"

test("未设置时只种 1 个项目", () => {
  assert.equal(e2eWorkspaceCount(undefined), 1)
  assert.equal(e2eWorkspaceCount(""), 1)
  assert.equal(e2eWorkspaceCount("nope"), 1)
})

test("ENJOY_E2E_WORKSPACES=2 种两个，上限 2", () => {
  assert.equal(e2eWorkspaceCount("2"), 2)
  assert.equal(e2eWorkspaceCount("9"), 2)
  assert.equal(e2eWorkspaceCount("0"), 1)
})
