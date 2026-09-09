import assert from "node:assert/strict"
import { test } from "node:test"
import { agentToolCardId, resolveAgentDocsJump } from "./agent-tool-anchor.ts"

test("沙箱行切进阶沙箱分段，其余滚到卡片", () => {
  assert.deepEqual(resolveAgentDocsJump("sandbox-harness"), { kind: "harness" })
  assert.deepEqual(resolveAgentDocsJump("omp"), { kind: "card", id: "omp" })
  assert.equal(agentToolCardId("omp"), "agent-tool-omp")
  assert.equal(agentToolCardId("custom:my bot"), "agent-tool-custom:my-bot")
})
