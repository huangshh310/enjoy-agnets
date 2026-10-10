import assert from "node:assert/strict"
import { test } from "node:test"
import { isUnknownWorkspaceRememberError } from "./unknown-workspace-remember.ts"

test("Unknown workspace 才中止 loadWorkspace", () => {
  assert.equal(isUnknownWorkspaceRememberError("Unknown workspace: ws_gone"), true)
  assert.equal(isUnknownWorkspaceRememberError("EPERM: remember failed"), false)
})
