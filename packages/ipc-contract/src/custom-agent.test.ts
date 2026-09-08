import assert from "node:assert/strict"
import { test } from "node:test"
import { AgentToolId, isAcpHostRuntimeId, isCustomAgentId, UpsertCustomAgentInput } from "./agent-tools.ts"
import { capabilitiesFor, composerChromeFor } from "./runtime-capabilities.ts"

test("custom:<slug> 是合法 AgentToolId，也是 ACP 宿主", () => {
  assert.equal(isCustomAgentId("custom:lab"), true)
  assert.equal(isCustomAgentId("claude"), false)
  assert.equal(AgentToolId.safeParse("custom:lab").success, true)
  assert.equal(AgentToolId.safeParse("custom:Bad").success, false)
  assert.equal(isAcpHostRuntimeId("custom:lab"), true)
  assert.equal(isAcpHostRuntimeId("sandbox-harness"), false)
})

test("自定义 ACP 能力保守：可 spawn、HMAC、无额度", () => {
  const cap = capabilitiesFor("custom:lab")
  assert.equal(cap.spawn, true)
  assert.equal(cap.quota, false)
  assert.equal(cap.login, false)
  assert.equal(cap.permissionUi, "enjoy-hmac")
  assert.equal(cap.fast, "none")
  const chrome = composerChromeFor("custom:lab")
  assert.equal(chrome.pathKind, "acp-host")
  assert.equal(chrome.showOnEngineRail, true)
  assert.equal(chrome.quota, false)
})

test("自定义入库校验 command/args/cwd", () => {
  const parsed = UpsertCustomAgentInput.parse({
    label: "Lab",
    command: "/opt/bin/opencode",
    args: ["acp"],
    cwdMode: "workspace"
  })
  assert.equal(parsed.label, "Lab")
  assert.equal(parsed.cwdMode, "workspace")
  assert.equal(UpsertCustomAgentInput.safeParse({ label: "", command: "opencode" }).success, false)
})
