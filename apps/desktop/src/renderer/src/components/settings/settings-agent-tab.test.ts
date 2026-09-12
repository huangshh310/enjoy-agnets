import assert from "node:assert/strict"
import { test } from "node:test"
import { agentTabFromHash, parseAgentSettingsTab } from "./settings-agent-tab.ts"
import { parseSettingsSectionSearch } from "./settings-section-search.ts"

test("空态深链 tab=registry，非法值回落本机 CLI", () => {
  assert.equal(parseAgentSettingsTab("subscriptions"), "subscriptions")
  assert.equal(parseAgentSettingsTab("registry"), "registry")
  assert.equal(parseAgentSettingsTab("harness"), "harness")
  assert.equal(parseAgentSettingsTab("unknown"), "racks")
  assert.equal(parseAgentSettingsTab(undefined), "racks")
  assert.equal(agentTabFromHash("#/settings/agent?tab=subscriptions"), "subscriptions")
  assert.equal(agentTabFromHash("#/settings/agent?tab=registry"), "registry")
  assert.equal(agentTabFromHash("#/settings/agent"), "racks")
})

test("供应商反链 ?tool= 会进 search，空串丢掉", () => {
  assert.deepEqual(parseSettingsSectionSearch({ tab: "registry", tool: "claude" }), {
    tab: "registry",
    tool: "claude",
    from: undefined
  })
  assert.deepEqual(parseSettingsSectionSearch({ tool: "  " }), {
    tab: undefined,
    tool: undefined,
    from: undefined
  })
})

test("审批发现性 from 进 search，空串丢掉", () => {
  assert.deepEqual(parseSettingsSectionSearch({ from: "agent" }), {
    tab: undefined,
    tool: undefined,
    from: "agent"
  })
  assert.deepEqual(parseSettingsSectionSearch({ from: "  " }), {
    tab: undefined,
    tool: undefined,
    from: undefined
  })
})
