import assert from "node:assert/strict"
import { test } from "node:test"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { countAgentToolsByTab, matchAgentTool } from "./agent-tool-list-filter.ts"

function tool(partial: Partial<AgentToolPublic> & Pick<AgentToolPublic, "id" | "label" | "status">): AgentToolPublic {
  return {
    transport: "acp-host",
    binaries: [partial.id],
    acpArgs: ["acp"],
    needsLoginHint: "",
    available: true,
    comingSoon: false,
    skillOnly: false,
    enabled: true,
    detectedPath: null,
    version: null,
    models: [],
    installKind: "copy",
    installCommand: "",
    docsUrl: "",
    useCustomProvider: false,
    supportedApiStyles: [],
    ...partial
  }
}

const sample = [
  tool({ id: "enjoy-local", label: "Enjoy 本地", status: "ready", transport: "local", binaries: [] }),
  tool({ id: "droid", label: "Factory Droid", status: "missing" }),
  tool({ id: "devin", label: "Devin CLI", status: "ready" }),
  tool({ id: "qwen", label: "Qwen Code", status: "missing" }),
  tool({ id: "qoder", label: "Qoder CLI", status: "ready" })
]

test("国外含 Droid/Devin，不含 Enjoy 本地与国产", () => {
  assert.equal(matchAgentTool(sample[1]!, "international", ""), true)
  assert.equal(matchAgentTool(sample[2]!, "international", ""), true)
  assert.equal(matchAgentTool(sample[0]!, "international", ""), false)
  assert.equal(matchAgentTool(sample[3]!, "international", ""), false)
  assert.equal(countAgentToolsByTab(sample, "international"), 2)
  assert.equal(countAgentToolsByTab(sample, "domestic"), 2)
})

test("搜索与安装态仍可用", () => {
  assert.equal(matchAgentTool(sample[1]!, "all", "droid"), true)
  assert.equal(matchAgentTool(sample[3]!, "all", "droid"), false)
  assert.equal(matchAgentTool(sample[2]!, "ready", ""), true)
  assert.equal(matchAgentTool(sample[1]!, "available", ""), true)
})
