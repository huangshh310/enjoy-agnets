/**
 * 工作流子步与 ai.generate 不得写 MRU。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))

test("workflow-step-agent / ai-generation 开跑带 rememberMru: false", () => {
  const workflow = readFileSync(join(here, "workflow-step-agent.ts"), "utf8")
  const generation = readFileSync(join(here, "ai-generation.ts"), "utf8")
  assert.match(workflow, /rememberMru:\s*false/)
  assert.match(generation, /rememberMru:\s*false/)
})
