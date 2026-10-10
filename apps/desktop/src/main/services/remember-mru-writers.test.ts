/**
 * 工作流子步与 ai.generate 走 BACKGROUND_AGENT_TRUST，不得写 MRU。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { BACKGROUND_AGENT_TRUST } from "./agent-run-trust.ts"
import { shouldRememberWorkspaceOnRun } from "./workspace-mru.ts"

test("workflow-step-agent / ai-generation 开跑不写 MRU", () => {
  assert.equal(BACKGROUND_AGENT_TRUST.rememberMru, false)
  assert.equal(shouldRememberWorkspaceOnRun(BACKGROUND_AGENT_TRUST), false)
  assert.equal(shouldRememberWorkspaceOnRun({}), true)
})
