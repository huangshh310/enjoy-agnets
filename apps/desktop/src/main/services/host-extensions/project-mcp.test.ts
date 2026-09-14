import assert from "node:assert/strict"
import { test } from "node:test"
import { filterAcpMcpServers } from "@enjoy-agents/agent-harness/acp-mcp"
import { projectStdioCommand } from "./project-stdio.ts"

test("握手无 http 时丢掉 URL，stdio 仍保留", () => {
  const filtered = filterAcpMcpServers(
    [
      { name: "fs", command: "/usr/bin/npx", args: ["-y", "x"] },
      { type: "http", name: "api", url: "https://example.com/mcp" }
    ],
    { http: false, sse: false }
  )
  assert.equal(filtered.length, 1)
  assert.equal("command" in filtered[0]!, true)
})

test("SSH stdio 用远端绝对路径，找不到则跳过，禁止本机 abs", async () => {
  const hit = await projectStdioCommand("npx -y @scope/mcp", {
    ssh: true,
    lookupRemoteBin: async (bin) => (bin === "npx" ? "/usr/bin/npx" : undefined)
  })
  assert.deepEqual(hit, { command: "/usr/bin/npx", args: ["-y", "@scope/mcp"] })
  const miss = await projectStdioCommand("npx -y x", { ssh: true, lookupRemoteBin: async () => undefined })
  assert.equal(miss, undefined)
  const noLookup = await projectStdioCommand("npx -y x", { ssh: true })
  assert.equal(noLookup, undefined)
})
