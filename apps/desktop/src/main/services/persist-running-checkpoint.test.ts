import assert from "node:assert/strict"
import { test } from "node:test"
import { DESKTOP_ACT_ANY_SESSION_KEY } from "../../../../../packages/agent-core/src/computer-use/desktop-act-policy.ts"
import { stripAnyDesktopSessionAllow } from "../../../../../packages/agent-core/src/computer-use/conversation-desktop-allow.ts"
import { trustedAutomationFlags } from "./agent-run-trust.ts"
import { parseAgentCheckpointExtras, runningCheckpointFlags } from "./running-orphan-plan.ts"

const source = {
  automationId: "auto_1",
  automationName: "晨间",
  scheduledAt: 1,
  isCatchUp: true
}

test("running checkpoint 带上 denyAnyDesktop，恢复后仍丢掉 *", () => {
  const flags = runningCheckpointFlags({ denyAnyDesktop: true, automationSource: source })
  const extras = parseAgentCheckpointExtras(JSON.stringify(flags))
  const restored = trustedAutomationFlags(extras)
  assert.equal(restored.denyAnyDesktop, true)
  assert.deepEqual(restored.automationSource, source)
  const tools = stripAnyDesktopSessionAllow(new Set([DESKTOP_ACT_ANY_SESSION_KEY, "desktop_act:notes"]))
  assert.equal(tools.has(DESKTOP_ACT_ANY_SESSION_KEY), false)
  assert.equal(tools.has("desktop_act:notes"), true)
})

test("手动续跑 extras 同样保留补跑闸", () => {
  const flags = trustedAutomationFlags({ denyAnyDesktop: true, automationSource: source }, undefined)
  assert.equal(flags.denyAnyDesktop, true)
})
