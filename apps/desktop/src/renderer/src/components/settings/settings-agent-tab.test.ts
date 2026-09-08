import assert from "node:assert/strict"
import { test } from "node:test"
import { agentTabFromHash, parseAgentSettingsTab } from "./settings-agent-tab.ts"

test("空态深链 tab=registry，非法值回落本机 CLI", () => {
  assert.equal(parseAgentSettingsTab("registry"), "registry")
  assert.equal(parseAgentSettingsTab("harness"), "harness")
  assert.equal(parseAgentSettingsTab("unknown"), "racks")
  assert.equal(parseAgentSettingsTab(undefined), "racks")
  assert.equal(agentTabFromHash("#/settings/agent?tab=registry"), "registry")
  assert.equal(agentTabFromHash("#/settings/agent"), "racks")
})
