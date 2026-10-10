import assert from "node:assert/strict"
import { test } from "node:test"
import {
  ListSessionAllowsInput,
  RevokeSessionAllowInput,
  RevokeSessionAllowResult,
  SessionAllowScope
} from "./session-allow.ts"

test("sessionAllowScope 认 tool 全名与 bash 前缀", () => {
  const tool = SessionAllowScope.parse({ kind: "tool", toolName: "mcp_demo__edit" })
  const bash = SessionAllowScope.parse({ kind: "bash_prefix", prefix: "git push" })
  assert.equal(tool.kind, "tool")
  assert.equal(tool.toolName, "mcp_demo__edit")
  assert.equal(bash.kind, "bash_prefix")
  assert.equal(bash.prefix, "git push")
  assert.equal(SessionAllowScope.safeParse({ kind: "tool" }).success, false)
  assert.equal(SessionAllowScope.safeParse({ kind: "desktop", appKey: "x" }).success, false)
})

test("list / revoke 入参过闸，撤销回 ok 与剩余列表", () => {
  assert.equal(ListSessionAllowsInput.safeParse({ sessionId: "ses_1" }).success, true)
  assert.equal(ListSessionAllowsInput.safeParse({}).success, false)
  const revoke = RevokeSessionAllowInput.parse({
    sessionId: "ses_1",
    scope: { kind: "tool", toolName: "write_file" }
  })
  assert.equal(revoke.runtimeId, undefined)
  const result = RevokeSessionAllowResult.parse({
    ok: true,
    items: [{ runtimeId: "enjoy-local", scope: { kind: "bash_prefix", prefix: "pnpm test" } }]
  })
  assert.equal(result.ok, true)
  assert.equal(result.items[0]?.scope.kind, "bash_prefix")
})
