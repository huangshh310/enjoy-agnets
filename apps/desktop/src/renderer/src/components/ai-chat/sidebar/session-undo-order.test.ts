/**
 * 撤销归档：不 bump 时下标与选中行不变；bump 会跳顶并挤开高亮。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { afterArchiveUndo, sidebarIdsByUpdatedAt } from "./session-undo-order.ts"

const sessions = [
  { id: "sel", updatedAt: 300 },
  { id: "mid", updatedAt: 200 },
  { id: "old", updatedAt: 100 }
]

test("撤销后下标与选中行不变", () => {
  const before = sidebarIdsByUpdatedAt(sessions)
  assert.deepEqual(before, ["sel", "mid", "old"])
  const kept = afterArchiveUndo(sessions, "old", "sel", 100)
  assert.equal(kept.index, before.indexOf("old"))
  assert.equal(kept.selectedId, "sel")
  assert.equal(kept.ids.indexOf("sel"), 0)
  assert.deepEqual(kept.ids, before)
})

test("若恢复时 bump updated_at 会跳到顶并挤开当前高亮", () => {
  const bumped = afterArchiveUndo(sessions, "old", "sel", 400)
  assert.equal(bumped.index, 0)
  assert.equal(bumped.ids.indexOf("sel"), 1)
  assert.equal(bumped.selectedId, "sel")
})
