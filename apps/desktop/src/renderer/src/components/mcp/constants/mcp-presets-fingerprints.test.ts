import assert from "node:assert/strict"
import { test } from "node:test"
import { CURATED_MCP_FINGERPRINTS } from "@enjoy-agents/ipc-contract/mcp-curated"
import { FEATURED_MCP_PRESETS } from "./mcp-presets.ts"

test("精选预设 command/transport 与共用指纹表一致", () => {
  assert.equal(FEATURED_MCP_PRESETS.length, CURATED_MCP_FINGERPRINTS.length)
  for (const fingerprint of CURATED_MCP_FINGERPRINTS) {
    const preset = FEATURED_MCP_PRESETS.find((item) => item.id === fingerprint.id)
    assert.ok(preset, fingerprint.id)
    assert.equal(preset?.command, fingerprint.command)
    assert.equal(preset?.transport, fingerprint.transport)
  }
})
