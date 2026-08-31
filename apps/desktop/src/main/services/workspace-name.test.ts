import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveWorkspaceName } from "./workspace-name.ts"

test("有显式名称时用显式名称", () => {
  assert.equal(resolveWorkspaceName("C:\\repo\\enjoy-agents", "我的项目"), "我的项目")
})

test("空名称回退到路径最后一段", () => {
  assert.equal(resolveWorkspaceName("C:\\repo\\enjoy-agents", "  "), "enjoy-agents")
  assert.equal(resolveWorkspaceName("/home/dev/app"), "app")
})
