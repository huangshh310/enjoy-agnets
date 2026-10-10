import assert from "node:assert/strict"
import { test } from "node:test"
import {
  HOST_INJECT_LIST_MAX,
  HOST_INJECT_NAME_MAX,
  HostInjectSnapshot,
  clampHostInjectSnapshot,
  clampHostNames,
  clampHostSkips,
  emptyHostInjectLane
} from "./host-inject.ts"

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

test("过长名称截断，过多 skipped 封顶，过闸", () => {
  const long = "n".repeat(HOST_INJECT_NAME_MAX + 40)
  const names = Array.from({ length: HOST_INJECT_LIST_MAX + 20 }, (_, i) => `skill-${i}-${long}`)
  const clamped = clampHostNames(names)
  assert.equal(clamped.length, HOST_INJECT_LIST_MAX)
  assert.ok(clamped.every((name) => name.length <= HOST_INJECT_NAME_MAX))
  const skips = clampHostSkips(
    names.map((name) => ({ name, reason: "truncated" as const }))
  )
  assert.equal(skips.length, HOST_INJECT_LIST_MAX)
  const snap = clampHostInjectSnapshot({
    runtimeId: "cursor",
    mcp: {
      capability: "acp-passthrough",
      enabled: names,
      injected: names,
      skipped: names.map((name) => ({ name, reason: "truncated" as const }))
    },
    skills: {
      capability: "catalog-prompt",
      enabled: names,
      injected: names,
      skipped: names.map((name) => ({ name, reason: "unresolved" as const })),
      mounted: false
    }
  })
  assert.equal(HostInjectSnapshot.safeParse(snap).success, true)
  assert.equal(snap.mcp.enabled.length, HOST_INJECT_LIST_MAX)
  assert.equal(snap.mcp.skipped.length, HOST_INJECT_LIST_MAX)
})
