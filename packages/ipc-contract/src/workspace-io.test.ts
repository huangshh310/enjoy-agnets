import assert from "node:assert/strict"
import { test } from "node:test"
import { OpenWorkspaceInput, PickFolderResult } from "./workspace-io.ts"

test("OpenWorkspaceInput 允许只带 path 或只带 name", () => {
  assert.equal(OpenWorkspaceInput.parse({}).path, undefined)
  assert.equal(OpenWorkspaceInput.parse({ path: "C:/repo", name: "demo" }).name, "demo")
})

test("PickFolderResult 需要 path 与 name", () => {
  const parsed = PickFolderResult.parse({ path: "C:/repo/app", name: "app" })
  assert.equal(parsed.name, "app")
})
