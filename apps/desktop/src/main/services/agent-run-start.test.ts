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
  assert.match(src, /holdRunThenPersistUser\(/)
  assert.match(src, /void prepareAndPump\(runId\)/)
  assert.match(runtime, /readSessionRuntime\(input\.sessionId\)/)
  assert.match(runtime, /会话覆盖 > 入参/)
})

test("leo：userMessageId 只在返回前同步落库用户句后才回（renderer 据此清 main 的稿）", () => {
  const hold = src.indexOf("const held = holdRunThenPersistUser(")
  // #135 MF-1：先拿 {id, inserted}，返回 / 回执用库里的 id，回滚只认新插入的 id。
  const assign = src.indexOf("userMessageId = outcome?.id ?? persistedOutgoingUserId(input, options.persistUser)")
  assert.ok(src.indexOf("const outcome = persistOutgoingUser(input, options.persistUser)") > hold)
  const ret = src.indexOf("return userMessageId ? { ok: true, runId, userMessageId } : { ok: true, runId }")
  assert.ok(hold > 0 && assign > hold && ret > assign)
  // 回执去重：带回第一次落库的 userMessageId（leo），没落库就不带。
  assert.match(src, /runId: existing\.runId, userMessageId: existing\.userMessageId/)
})
