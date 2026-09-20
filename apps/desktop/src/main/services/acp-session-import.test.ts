import assert from "node:assert/strict"
import { test } from "node:test"
import { projectListedAcpSessions } from "./acp-session-import-project.ts"

test("未广告 list 不带 error", () => {
  assert.deepEqual(
    projectListedAcpSessions({
      supported: false,
      sessions: [{ sessionId: "a", cwd: "/ws" }],
      imported: new Set(),
      cwd: "/ws"
    }),
    { supported: false, sessions: [] }
  )
})

test("只投影本工作区，并标已导入", () => {
  const result = projectListedAcpSessions({
    supported: true,
    sessions: [
      { sessionId: "a", title: "hi", cwd: "/ws" },
      { sessionId: "b", title: "other", cwd: "/other" }
    ],
    imported: new Set(["a"]),
    cwd: "/ws"
  })
  assert.equal(result.supported, true)
  assert.deepEqual(result.sessions, [{ sessionId: "a", title: "hi", updatedAt: undefined, imported: true }])
})

test("spawn 失败仍 supported，带 error", () => {
  const result = projectListedAcpSessions({
    supported: true,
    sessions: [],
    imported: new Set(),
    cwd: "/ws",
    error: "spawn grok failed"
  })
  assert.deepEqual(result, { supported: true, sessions: [], error: "spawn grok failed" })
})
