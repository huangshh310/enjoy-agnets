/**
 * S1-5 / S1-7：无项目才出空态；已有项目绝不写打开工作区。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { shouldShowNoProjectEmpty } from "./no-project-empty.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("无项目且在对话表面才出空态", () => {
  assert.equal(
    shouldShowNoProjectEmpty({ workspaceId: null, surface: "thread", workspacesSettled: true, workspaceCount: 0 }),
    true
  )
})

test("已有项目或名单未到齐不出空态", () => {
  assert.equal(
    shouldShowNoProjectEmpty({ workspaceId: null, surface: "thread", workspacesSettled: true, workspaceCount: 2 }),
    false
  )
  assert.equal(
    shouldShowNoProjectEmpty({ workspaceId: null, surface: "thread", workspacesSettled: false, workspaceCount: 0 }),
    false
  )
  assert.equal(
    shouldShowNoProjectEmpty({ workspaceId: "ws-1", surface: "thread", workspacesSettled: true, workspaceCount: 0 }),
    false
  )
  assert.equal(
    shouldShowNoProjectEmpty({ workspaceId: null, surface: "kanban", workspacesSettled: true, workspaceCount: 0 }),
    false
  )
})

test("主区空态不再写打开工作区", () => {
  const stage = readFileSync(join(dir, "chat-stage.tsx"), "utf8")
  const empty = readFileSync(join(dir, "no-project-empty.tsx"), "utf8")
  assert.match(empty, /chat\.noProjectEmpty/)
  assert.match(empty, /chat\.selectFolder/)
  assert.doesNotMatch(empty, /chat\.openWorkspace/)
  assert.doesNotMatch(stage, /chat\.openWorkspace/)
})
