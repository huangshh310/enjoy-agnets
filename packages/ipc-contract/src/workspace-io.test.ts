import assert from "node:assert/strict"
import { test } from "node:test"
import {
  ChangedFile,
  GitCommitInput,
  GitPatchInput,
  GitPushInput,
  GitRestoreInput,
  OpenWorkspaceInput,
  PickFolderResult
} from "./workspace-io.ts"

test("OpenWorkspaceInput 允许只带 path 或只带 name", () => {
  assert.equal(OpenWorkspaceInput.parse({}).path, undefined)
  assert.equal(OpenWorkspaceInput.parse({ path: "C:/repo", name: "demo" }).name, "demo")
})

test("PickFolderResult 需要 path 与 name", () => {
  const parsed = PickFolderResult.parse({ path: "C:/repo/app", name: "app" })
  assert.equal(parsed.name, "app")
})

test("GitCommitInput 会 trim 提交说明并拒绝空串", () => {
  const parsed = GitCommitInput.parse({ workspaceId: "ws_1", message: "  feat: x  " })
  assert.equal(parsed.message, "feat: x")
  assert.throws(() => GitCommitInput.parse({ workspaceId: "ws_1", message: "   " }))
})

test("ChangedFile 默认 staged/worktree 为 false", () => {
  const parsed = ChangedFile.parse({ path: "a.ts", status: "modified" })
  assert.equal(parsed.staged, false)
  assert.equal(parsed.worktree, false)
})

test("GitPushInput 拒绝未知字段", () => {
  assert.equal(GitPushInput.parse({ workspaceId: "ws_1" }).workspaceId, "ws_1")
  assert.throws(() => GitPushInput.parse({ workspaceId: "ws_1", extra: true }))
})

test("GitPatchInput 允许可选 paths", () => {
  const parsed = GitPatchInput.parse({ workspaceId: "ws_1", paths: ["a.ts"] })
  assert.deepEqual(parsed.paths, ["a.ts"])
})

test("GitRestoreInput 拒绝空 paths 与逃逸字段", () => {
  const parsed = GitRestoreInput.parse({ workspaceId: "ws_1", paths: ["a.ts"] })
  assert.deepEqual(parsed.paths, ["a.ts"])
  assert.throws(() => GitRestoreInput.parse({ workspaceId: "ws_1", paths: [] }))
  assert.throws(() => GitRestoreInput.parse({ workspaceId: "ws_1", paths: ["a.ts"], extra: 1 }))
})
