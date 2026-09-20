import assert from "node:assert/strict"
import { test } from "node:test"
import { HostInjectSnapshot, emptyHostInjectLane } from "./host-inject.ts"

test("空启用快照可 parse，injected 为空", () => {
  const parsed = HostInjectSnapshot.safeParse({
    runtimeId: "cursor",
    mcp: emptyHostInjectLane("acp-passthrough"),
    skills: { ...emptyHostInjectLane("catalog-prompt"), mounted: false }
  })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.mcp.injected.length, 0)
    assert.equal(parsed.data.skills.injected.length, 0)
  }
})

test("Pi 不支持 MCP 时 capability 为 none", () => {
  const parsed = HostInjectSnapshot.safeParse({
    runtimeId: "pi",
    mcp: {
      capability: "none",
      enabled: ["Filesystem"],
      injected: [],
      skipped: [{ name: "Filesystem", reason: "unsupported" }]
    },
    skills: {
      capability: "catalog-prompt",
      enabled: ["form-a11y"],
      injected: ["form-a11y"],
      skipped: [],
      mounted: false
    }
  })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.mcp.capability, "none")
    assert.deepEqual(parsed.data.mcp.injected, [])
  }
})
