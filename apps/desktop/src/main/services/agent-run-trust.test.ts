import assert from "node:assert/strict"
import { test } from "node:test"
import { stripUntrustedAutomationFlags, trustedAutomationFlags } from "./agent-run-trust.ts"

const source = {
  automationId: "auto_1",
  automationName: "晨间",
  scheduledAt: 1,
  isCatchUp: true
}

test("renderer agent.run 剥掉 automationSource 与 denyAnyDesktop", () => {
  const parsed = {
    sessionId: "ses",
    workspaceId: "ws",
    modelId: "m",
    messages: [{ role: "user" as const, content: "hi" }],
    denyAnyDesktop: true,
    origin: "catch_up",
    automationSource: source
  }
  const stripped = stripUntrustedAutomationFlags(parsed)
  assert.equal(stripped.denyAnyDesktop, undefined)
  assert.equal(stripped.automationSource, undefined)
  assert.equal(stripped.origin, undefined)
  assert.equal(parsed.denyAnyDesktop, true)
})

test("续跑 / 检查点 extras 保留补跑闸", () => {
  const flags = trustedAutomationFlags({ denyAnyDesktop: true, automationSource: source })
  assert.equal(flags.denyAnyDesktop, true)
  assert.deepEqual(flags.automationSource, source)
  assert.equal(flags.origin, "catch_up")
  assert.equal(trustedAutomationFlags({ denyAnyDesktop: false }).denyAnyDesktop, undefined)
  assert.equal(trustedAutomationFlags({ origin: "heartbeat" }).origin, "heartbeat")
})
