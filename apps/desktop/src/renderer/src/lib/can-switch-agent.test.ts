import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { canSwitchAgent } from "./can-switch-agent.ts"

function tool(partial: Partial<AgentToolPublic> & Pick<AgentToolPublic, "id">): AgentToolPublic {
  return {
    label: partial.id,
    transport: "acp-host",
    binaries: ["opencode"],
    acpArgs: ["acp"],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: true,
    detectedPath: "/opt/opencode",
    version: null,
    status: "ready",
    models: [],
    installKind: "copy",
    installCommand: "",
    docsUrl: "",
    useCustomProvider: false,
    supportedApiStyles: [],
    ...partial
  }
}

test("即将推出不能选为当前引擎；自定义必须 ready", () => {
  assert.equal(canSwitchAgent(tool({ id: "pi", comingSoon: true, available: false, status: "comingSoon" })), false)
  assert.equal(canSwitchAgent(tool({ id: "opencode", status: "ready" })), true)
  assert.equal(
    canSwitchAgent(tool({ id: "custom:lab", origin: "custom", status: "missing", binaryPath: "/opt/opencode" })),
    false
  )
  assert.equal(canSwitchAgent(tool({ id: "custom:lab", origin: "custom", status: "ready" })), true)
})
