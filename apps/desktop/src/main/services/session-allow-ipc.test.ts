import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clearAllConversationSessionAllows,
  grantConversationBashPrefix,
  grantConversationToolAllow
} from "./conversation-session-allow.ts"
import { listSessionAllowsForIpc, revokeSessionAllowForIpc } from "./session-allow-ipc.ts"

test.beforeEach(() => {
  clearAllConversationSessionAllows()
})

test("approvals.listSessionAllows / revokeSessionAllow 过 Zod 并回剩余列表", () => {
  grantConversationToolAllow("ses_ipc", "write_file")
  grantConversationBashPrefix("ses_ipc", "pnpm test")
  const listed = listSessionAllowsForIpc({ sessionId: "ses_ipc" })
  assert.equal(listed.items.length, 2)
  const revoked = revokeSessionAllowForIpc({
    sessionId: "ses_ipc",
    scope: { kind: "tool", toolName: "write_file" }
  })
  assert.equal(revoked.ok, true)
  assert.equal(revoked.items.length, 1)
  assert.deepEqual(revoked.items[0]?.scope, { kind: "bash_prefix", prefix: "pnpm test" })
  assert.throws(() => listSessionAllowsForIpc({}))
  assert.throws(() => revokeSessionAllowForIpc({ sessionId: "ses_ipc" }))
  assert.throws(() => listSessionAllowsForIpc({ sessionId: "alice::bob" }))
})
