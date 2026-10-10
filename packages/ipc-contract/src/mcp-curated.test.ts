import assert from "node:assert/strict"
import { test } from "node:test"
import { CURATED_MCP_FINGERPRINTS, CURATED_MCP_SERVER_IDS, curatedFingerprintById } from "./mcp-curated.ts"

test("指纹表 id 与列表一一对应，github 命令钉死官方包", () => {
  assert.equal(CURATED_MCP_FINGERPRINTS.length, CURATED_MCP_SERVER_IDS.length)
  assert.equal(curatedFingerprintById("github")?.command, "npx -y @modelcontextprotocol/server-github")
  assert.equal(curatedFingerprintById("missing"), undefined)
})
