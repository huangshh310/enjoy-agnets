import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { registryCommandFor, registryInstallAction } from "./acp-registry-model.ts"
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

test("未找到：Pi 一键，Hermes 仅复制，不假一键", () => {
  assert.equal(registryInstallAction(tool({ id: "pi", installKind: "npm" }), "missing"), "install")
  assert.equal(
    registryInstallAction(tool({ id: "hermes", installKind: "copy", installCommand: "uv pip" }), "missing"),
    "copy"
  )
  assert.equal(registryInstallAction(tool({ id: "hermes", installKind: "copy" }), "ready"), "none")
  assert.equal(registryInstallAction(tool({ id: "pi", installKind: "npm" }), "comingSoon"), "none")
})

test("未找到展示安装命令，已装才展示启动预览", () => {
  const pi = tool({
    id: "pi",
    binaries: ["pi-acp"],
    acpArgs: [],
    installCommand: "npm i -g @earendil-works/pi-coding-agent pi-acp"
  })
  assert.equal(registryCommandFor(pi, "missing"), "npm i -g @earendil-works/pi-coding-agent pi-acp")
  assert.equal(registryCommandFor(pi, "ready"), "pi-acp")
})
