import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { composerRailSections } from "./composer-agents.ts"

function tool(partial: Partial<AgentToolPublic> & Pick<AgentToolPublic, "id" | "label">): AgentToolPublic {
  return {
    transport: partial.id === "enjoy-local" ? "local" : "acp-host",
    binaries: [],
    acpArgs: [],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: true,
    detectedPath: null,
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

test("导轨把 Enjoy Local 与 CLI 引擎拆开，DeepSeek / OMP 走 CLI 组", () => {
  const sections = composerRailSections([
    tool({ id: "enjoy-local", label: "Enjoy 本地" }),
    tool({ id: "claude", label: "Claude" }),
    tool({ id: "deepseek", label: "DeepSeek" }),
    tool({ id: "omp", label: "Oh My Pi" }),
    tool({ id: "pi", label: "Pi", comingSoon: true, available: false, status: "comingSoon" })
  ])
  assert.deepEqual(
    sections.local.map((item) => item.id),
    ["enjoy-local"]
  )
  assert.deepEqual(
    sections.cli.map((item) => item.id),
    ["claude", "deepseek", "omp"]
  )
  assert.deepEqual(
    sections.soon.map((item) => item.id),
    ["pi"]
  )
  assert.ok(!sections.local.some((item) => item.id === "deepseek"))
})
