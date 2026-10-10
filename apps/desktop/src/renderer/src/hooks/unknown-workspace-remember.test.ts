import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isUnknownWorkspaceRememberError,
  rememberWorkspaceOnLoad
} from "./unknown-workspace-remember.ts"

test("Unknown workspace 才中止 loadWorkspace", () => {
  assert.equal(isUnknownWorkspaceRememberError("Unknown workspace: ws_gone"), true)
  assert.equal(isUnknownWorkspaceRememberError("EPERM: remember failed"), false)
})

test("remember 撞 Unknown workspace 中止；其它失败继续", async () => {
  let unknown = 0
  assert.equal(
    await rememberWorkspaceOnLoad({
      remember: async () => {
        throw new Error("Unknown workspace: ws_gone")
      },
      onUnknown: async () => {
        unknown += 1
      }
    }),
    "abort"
  )
  assert.equal(unknown, 1)
  assert.equal(
    await rememberWorkspaceOnLoad({
      remember: async () => {
        throw new Error("EPERM: remember failed")
      },
      onUnknown: async () => {
        unknown += 1
      }
    }),
    "continue"
  )
  assert.equal(unknown, 1)
  assert.equal(
    await rememberWorkspaceOnLoad({
      remember: async () => undefined,
      onUnknown: async () => {
        unknown += 1
      }
    }),
    "continue"
  )
})
