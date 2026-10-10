/**
 * 归档当前会话：下一条，否则上一条；名单空则没有落点。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { RepositoryNode } from "../stores/chat-store.types.ts"
import { pickAdjacentSessionId, visibleSessionIdsForArchive } from "./adjacent-session.ts"

test("下一条优先，否则上一条，空名单为空", () => {
  assert.equal(pickAdjacentSessionId(["a", "b", "c"], "b"), "c")
  assert.equal(pickAdjacentSessionId(["a", "b", "c"], "c"), "b")
  assert.equal(pickAdjacentSessionId(["only"], "only"), null)
  assert.equal(pickAdjacentSessionId([], "gone"), null)
})

test("按项目只在同一项目里找相邻", () => {
  const nodes: RepositoryNode[] = [
    session("ws", "workspace", 0),
    session("s29", "session", 290, "ws", "Seed session 29"),
    session("s28", "session", 280, "ws", "Seed session 28"),
    session("s27", "session", 270, "ws", "Seed session 27")
  ]
  const ids = visibleSessionIdsForArchive(nodes, "project", "updated", "s28")
  assert.deepEqual(ids, ["s29", "s28", "s27"])
  assert.equal(pickAdjacentSessionId(ids, "s28"), "s27")
})

function session(
  id: string,
  kind: "workspace" | "session",
  updatedAt: number,
  parentId?: string,
  name = id
): RepositoryNode {
  return {
    id,
    name,
    kind,
    updatedAt,
    parentId,
    flagged: false,
    workflowStatus: null
  } as RepositoryNode
}
