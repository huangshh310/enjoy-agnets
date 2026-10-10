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
    from: undefined,
    create: undefined,
    edit: undefined,
    focus: undefined
  })
  assert.deepEqual(parseSettingsSectionSearch({ tool: "  " }), {
    tab: undefined,
    tool: undefined,
    from: undefined,
    create: undefined,
    edit: undefined,
    focus: undefined
  })
})

test("审批发现性 from 进 search，空串丢掉", () => {
  assert.deepEqual(parseSettingsSectionSearch({ from: "agent" }), {
    tab: undefined,
    tool: undefined,
    from: "agent",
    create: undefined,
    edit: undefined,
    focus: undefined
  })
  assert.deepEqual(parseSettingsSectionSearch({ from: "  " }), {
    tab: undefined,
    tool: undefined,
    from: undefined,
    create: undefined,
    edit: undefined,
    focus: undefined
  })
})

test("向导添加密钥 create=official 进 search", () => {
  assert.deepEqual(parseSettingsSectionSearch({ create: "official", from: "setup-guide" }), {
    tab: undefined,
    tool: undefined,
    from: "setup-guide",
    create: "official",
    edit: undefined,
    focus: undefined
  })
})

test("改密钥深链 edit + focus=key", () => {
  assert.deepEqual(parseSettingsSectionSearch({ edit: "p1", focus: "key" }), {
    tab: undefined,
    tool: undefined,
    from: undefined,
    create: undefined,
    edit: "p1",
    focus: "key"
  })
})
