import assert from "node:assert/strict"
import { test } from "node:test"
import { CURATED_MCP_FINGERPRINTS } from "@enjoy-agents/ipc-contract/mcp-curated"
import { CURATED_MCP_FINGERPRINT_FIXTURE } from "./mcp-curated-fingerprint.fixture.ts"
import { FEATURED_MCP_PRESETS } from "./mcp-presets.ts"

test("精选预设 command/transport 对照独立 fixture，不自己比自己", () => {
  assert.equal(FEATURED_MCP_PRESETS.length, CURATED_MCP_FINGERPRINT_FIXTURE.length)
  assert.equal(CURATED_MCP_FINGERPRINTS.length, CURATED_MCP_FINGERPRINT_FIXTURE.length)
  for (const expected of CURATED_MCP_FINGERPRINT_FIXTURE) {
    const preset = FEATURED_MCP_PRESETS.find((item) => item.id === expected.id)
    const fingerprint = CURATED_MCP_FINGERPRINTS.find((item) => item.id === expected.id)
    assert.ok(preset, expected.id)
    assert.ok(fingerprint, expected.id)
    assert.equal(preset?.command, expected.command)
    assert.equal(preset?.transport, expected.transport)
    assert.equal(fingerprint?.command, expected.command)
    assert.equal(fingerprint?.transport, expected.transport)
  }
})
