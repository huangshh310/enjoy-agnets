import assert from "node:assert/strict"
import { test } from "node:test"
import { nativePluginHonesty } from "./native-plugin-honesty.ts"

test("支持引擎报已启用，不报已就绪", () => {
  const view = nativePluginHonesty({ runtimeId: "cursor", trustedMcp: 2, skillCount: 3 })
  assert.deepEqual(view, { kind: "enabled", mcpCount: 2, skillCount: 3 })
})

test("Pi 有已启用 MCP 时诚实未注入", () => {
  const view = nativePluginHonesty({ runtimeId: "pi", trustedMcp: 1, skillCount: 0 })
  assert.deepEqual(view, {
    kind: "unsupported",
    mcp: true,
    skills: false,
    mcpCount: 1,
    skillCount: 0
  })
})

test("空启用仍是 enabled 计数 0，不升绿灯成功", () => {
  const view = nativePluginHonesty({ runtimeId: "claude", trustedMcp: 0, skillCount: 0 })
  assert.deepEqual(view, { kind: "enabled", mcpCount: 0, skillCount: 0 })
})
