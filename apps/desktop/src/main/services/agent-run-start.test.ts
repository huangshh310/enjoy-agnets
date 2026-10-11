/**
 * 开跑接线：三条入口都进 beginAgentRun；runtimeId 走 resolveRuntimeId（会话覆盖生效）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(dir, "agent-run-start.ts"), "utf8")
const runtime = readFileSync(join(dir, "resolve-runtime-id.ts"), "utf8")

test("runAgent / resume / heartbeat 都走 beginAgentRun，且 resolveRuntimeId", () => {
  assert.match(src, /return beginAgentRun\(window, input, \{/)
  assert.match(src, /return beginAgentRun\(window, input, \{ persistUser: true, promptEcho: true \}\)/)
  assert.match(src, /return beginAgentRun\(\s*window,\s*RunAgentInput\.parse/)
  assert.match(src, /const runtimeId = resolveRuntimeId\(input, prefs\)/)
  assert.match(src, /holdAgentRun\(/)
  assert.match(src, /void prepareAndPump\(runId\)/)
  assert.match(runtime, /readSessionRuntime\(input\.sessionId\)/)
  assert.match(runtime, /会话覆盖 > 入参/)
})
