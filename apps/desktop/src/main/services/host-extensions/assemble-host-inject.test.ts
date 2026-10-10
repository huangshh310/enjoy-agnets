import assert from "node:assert/strict"
import { test } from "node:test"
import { assembleHostInject } from "./assemble-host-inject.ts"

test("支持引擎：已启用且解析成功的进 injected", () => {
  const snap = assembleHostInject({
    runtimeId: "cursor",
    mcpEnabled: ["Filesystem", "GitHub"],
    mcpInjected: ["Filesystem", "GitHub"],
    skillEnabled: ["form-a11y", "Superpowers"],
    skillInjected: ["form-a11y", "Superpowers"]
  })
  assert.equal(snap.mcp.capability, "acp-passthrough")
  assert.deepEqual(snap.mcp.injected, ["Filesystem", "GitHub"])
  assert.equal(snap.skills.capability, "catalog-prompt")
  assert.deepEqual(snap.skills.injected, ["form-a11y", "Superpowers"])
  assert.equal(snap.skills.mounted, false)
})

test("Pi 不把 Enjoy MCP 标成已注入", () => {
  const snap = assembleHostInject({
    runtimeId: "pi",
    mcpEnabled: ["Filesystem"],
    mcpInjected: ["Filesystem"],
    skillEnabled: ["form-a11y"],
    skillInjected: ["form-a11y"]
  })
  assert.equal(snap.mcp.capability, "none")
  assert.deepEqual(snap.mcp.injected, [])
  assert.deepEqual(snap.mcp.skipped, [{ name: "Filesystem", reason: "unsupported" }])
  assert.deepEqual(snap.skills.injected, ["form-a11y"])
})

test("沙箱两路都是 none，禁止空成功名单", () => {
  const snap = assembleHostInject({
    runtimeId: "sandbox-harness",
    mcpEnabled: ["Filesystem"],
    mcpInjected: ["Filesystem"],
    skillEnabled: ["form-a11y"],
    skillInjected: ["form-a11y"]
  })
  assert.equal(snap.mcp.capability, "none")
  assert.equal(snap.skills.capability, "none")
  assert.deepEqual(snap.mcp.injected, [])
  assert.deepEqual(snap.skills.injected, [])
  assert.equal(snap.skills.mounted, false)
})

test("空启用：injected 为空，不造假行", () => {
  const snap = assembleHostInject({
    runtimeId: "claude",
    mcpEnabled: [],
    mcpInjected: [],
    skillEnabled: [],
    skillInjected: []
  })
  assert.deepEqual(snap.mcp.enabled, [])
  assert.deepEqual(snap.mcp.injected, [])
  assert.deepEqual(snap.skills.enabled, [])
  assert.deepEqual(snap.skills.injected, [])
})

test("stdio 解析失败单服进 skipped，其余仍注入", () => {
  const snap = assembleHostInject({
    runtimeId: "cursor",
    mcpEnabled: ["Filesystem", "Broken"],
    mcpInjected: ["Filesystem"],
    mcpSkipped: [{ name: "Broken", reason: "unresolved" }],
    skillEnabled: ["form-a11y"],
    skillInjected: ["form-a11y"]
  })
  assert.deepEqual(snap.mcp.injected, ["Filesystem"])
  assert.deepEqual(snap.mcp.skipped, [{ name: "Broken", reason: "unresolved" }])
})

test("过长名称与过多 skipped 截断后仍过闸", () => {
  const long = "n".repeat(160)
  const names = Array.from({ length: 140 }, (_, i) => `${i}-${long}`)
  const snap = assembleHostInject({
    runtimeId: "cursor",
    mcpEnabled: names,
    mcpInjected: names,
    mcpSkipped: names.map((name) => ({ name, reason: "truncated" as const })),
    skillEnabled: names,
    skillInjected: names,
    skillSkipped: names.map((name) => ({ name, reason: "unresolved" as const }))
  })
  assert.ok(snap.mcp.enabled.length <= 128)
  assert.ok(snap.mcp.skipped.length <= 128)
  assert.ok(snap.mcp.enabled.every((name) => name.length <= 120))
})

test("Grok 可标 mounted，SSH 调用方传 false", () => {
  const local = assembleHostInject({
    runtimeId: "grok",
    mcpEnabled: [],
    mcpInjected: [],
    skillEnabled: ["impeccable"],
    skillInjected: ["impeccable"],
    skillsMounted: true
  })
  assert.equal(local.skills.mounted, true)
  const ssh = assembleHostInject({
    runtimeId: "grok",
    mcpEnabled: [],
    mcpInjected: [],
    skillEnabled: ["impeccable"],
    skillInjected: ["impeccable"],
    skillsMounted: false
  })
  assert.equal(ssh.skills.mounted, false)
})
