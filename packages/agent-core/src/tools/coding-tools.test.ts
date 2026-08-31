/**
 * 复现 Allow 后的工具报错：AI SDK 7 不会把 runtimeContext 放进 execute options。
 * 工具必须闭包注入 host，不能再走 workspaceHostFrom(options)。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { workspaceHostFrom } from "./host.ts"

test("SDK-style empty execute options have no workspace host", () => {
  assert.throws(() => workspaceHostFrom({}), /Workspace host is missing/)
  assert.throws(
    () => workspaceHostFrom({ context: {}, runtimeContext: {}, experimental_context: {} }),
    /Workspace host is missing/
  )
})

test("execute options.context only works when it already carries host", () => {
  const host = { bash: async () => ({ stdout: "ok", stderr: "", exitCode: 0 }) }
  const resolved = workspaceHostFrom({ context: { host } })
  assert.equal(resolved, host)
})
