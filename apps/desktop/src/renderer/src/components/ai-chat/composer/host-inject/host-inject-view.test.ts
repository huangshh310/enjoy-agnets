import assert from "node:assert/strict"
import { test } from "node:test"
import { hostInjectBarView } from "./host-inject-view.ts"

const injectedSnap = {
  runtimeId: "cursor",
  mcp: {
    capability: "acp-passthrough" as const,
    enabled: ["Filesystem", "GitHub"],
    injected: ["Filesystem", "GitHub"],
    skipped: []
  },
  skills: {
    capability: "catalog-prompt" as const,
    enabled: ["form-a11y", "Superpowers", "impeccable"],
    injected: ["form-a11y", "Superpowers", "impeccable"],
    skipped: [],
    mounted: false
  }
}

test("支持引擎开流后画已注入本轮，不写已同步", () => {
  const view = hostInjectBarView({
    runtimeId: "cursor",
    snapshot: injectedSnap,
    enabledMcp: 2,
    enabledSkills: 3
  })
  assert.deepEqual(view, {
    kind: "injected",
    mcp: 2,
    skills: 3,
    names: ["Filesystem", "GitHub", "form-a11y", "Superpowers", "impeccable"],
    skipped: []
  })
})

test("空启用不画微条", () => {
  const view = hostInjectBarView({
    runtimeId: "cursor",
    snapshot: {
      runtimeId: "cursor",
      mcp: { capability: "acp-passthrough", enabled: [], injected: [], skipped: [] },
      skills: {
        capability: "catalog-prompt",
        enabled: [],
        injected: [],
        skipped: [],
        mounted: false
      }
    },
    enabledMcp: 0,
    enabledSkills: 0
  })
  assert.equal(view.kind, "hidden")
})

test("Pi 有已启用 MCP 时诚实未注入，不画空成功", () => {
  const view = hostInjectBarView({
    runtimeId: "pi",
    snapshot: {
      runtimeId: "pi",
      mcp: {
        capability: "none",
        enabled: ["Filesystem"],
        injected: [],
        skipped: [{ name: "Filesystem", reason: "unsupported" }]
      },
      skills: {
        capability: "catalog-prompt",
        enabled: [],
        injected: [],
        skipped: [],
        mounted: false
      }
    },
    enabledMcp: 1,
    enabledSkills: 0
  })
  assert.deepEqual(view, { kind: "unsupported", mcp: true, skills: false })
})

test("沙箱技能也不假装已注入", () => {
  const view = hostInjectBarView({
    runtimeId: "sandbox-harness",
    enabledMcp: 1,
    enabledSkills: 2
  })
  assert.deepEqual(view, { kind: "unsupported", mcp: true, skills: true })
})

test("尚未开流但有已启用项：画 SoT 计数，不是已注入 0", () => {
  const view = hostInjectBarView({
    runtimeId: "claude",
    enabledMcp: 2,
    enabledSkills: 3
  })
  assert.deepEqual(view, { kind: "enabled", mcp: 2, skills: 3 })
})

test("单服解析失败且本轮 0 注入：失败态，不是绿灯", () => {
  const view = hostInjectBarView({
    runtimeId: "cursor",
    snapshot: {
      runtimeId: "cursor",
      mcp: {
        capability: "acp-passthrough",
        enabled: ["Broken"],
        injected: [],
        skipped: [{ name: "Broken", reason: "unresolved" }]
      },
      skills: {
        capability: "catalog-prompt",
        enabled: [],
        injected: [],
        skipped: [],
        mounted: false
      }
    },
    enabledMcp: 1,
    enabledSkills: 0
  })
  assert.equal(view.kind, "failed")
  if (view.kind === "failed") {
    assert.deepEqual(view.skipped.map((item) => item.name), ["Broken"])
  }
})
