import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { registryRows } from "./acp-registry.types.ts"

function tool(partial: Partial<AgentToolPublic> & Pick<AgentToolPublic, "id">): AgentToolPublic {
  return {
    label: partial.id,
    transport: "acp-host",
    binaries: ["gemini"],
    acpArgs: ["--acp"],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: true,
    detectedPath: null,
    version: null,
    status: "missing",
    models: [],
    installKind: "npm",
    installCommand: "npm i -g @google/gemini-cli",
    docsUrl: "https://geminicli.com/docs/cli/acp-mode/",
    useCustomProvider: false,
    supportedApiStyles: [],
    ...partial
  }
}

test("Registry 只列内置 ACP，不含 Enjoy 本地与自定义", () => {
  const rows = registryRows([
    tool({ id: "enjoy-local", transport: "local", binaries: [] }),
    tool({ id: "gemini" }),
    tool({ id: "custom:lab", origin: "custom" })
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.tool.id, "gemini")
  assert.equal(rows[0]?.commandPreview, "gemini --acp")
  assert.equal(rows[0]?.status, "missing")
})
