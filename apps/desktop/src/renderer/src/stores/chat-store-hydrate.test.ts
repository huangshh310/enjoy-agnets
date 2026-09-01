/**
 * 侧栏树灌入：仅首次默认展开当前工作区。
 */
import test from "node:test"
import assert from "node:assert/strict"
import { buildWorkspaceTree } from "./chat-store-hydrate.ts"

const items = [
  {
    workspace: { id: "ws1", name: "A", rootPath: "/a" },
    sessions: [{ id: "s1", title: "chat", updatedAt: 1, workspaceId: "ws1" }]
  }
]

test("首次灌入默认展开当前工作区", () => {
  const tree = buildWorkspaceTree(items, [], [], false, "ws1")
  assert.deepEqual(tree.expandedIds, ["ws1"])
  assert.equal(tree.repositories.length, 2)
})

test("已有树时不再把当前工作区写回 expandedIds", () => {
  const tree = buildWorkspaceTree(items, [], [], true, "ws1")
  assert.deepEqual(tree.expandedIds, [])
})
