/**
 * 已归档页恢复与 toast 撤销共用一条路径，updated_at 不变则下标不变。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { sortSessions } from "../components/ai-chat/sidebar/sort-sessions.ts"
import type { RepositoryNode } from "../stores/chat-store.types.ts"

const dir = dirname(fileURLToPath(import.meta.url))

function session(id: string, updatedAt: number): RepositoryNode {
  return { id, name: id, kind: "session", updatedAt, parentId: "ws" }
}

test("恢复与撤销共用 restoreUnarchivedSession，不另走会跳顶的刷新", () => {
  const restore = readFileSync(join(dir, "restore-unarchived-session.ts"), "utf8")
  const undo = readFileSync(join(dir, "archive-session-undo.ts"), "utf8")
  const life = readFileSync(join(dir, "workspace-lifecycle.ts"), "utf8")
  const page = readFileSync(join(dir, "../components/settings/archived-chats-page.tsx"), "utf8")
  const hydrate = readFileSync(join(dir, "../stores/chat-store-hydrate.ts"), "utf8")
  assert.match(restore, /refreshAllWorkspaces/)
  assert.match(restore, /\["workspaces"\]/)
  assert.match(undo, /restoreUnarchivedSession/)
  assert.match(life, /restoreUnarchivedSession/)
  assert.match(page, /unarchiveSession/)
  assert.match(page, /settings\.archived\.backToChat/)
  assert.match(hydrate, /updatedAt: session\.updatedAt/)
  assert.doesNotMatch(
    hydrate,
    /sessions\.map\(\([\s\S]*updatedAt: Date\.now\(\)/
  )
})

test("updated_at 不变时恢复后仍在原位，不会跳到顶", () => {
  const before = [session("a", 300), session("b", 200), session("c", 100)]
  const afterArchive = [session("a", 300), session("c", 100)]
  const afterRestore = [session("a", 300), session("b", 200), session("c", 100)]
  const sortedArchive = sortSessions(afterArchive, { sortOrder: "updated" }).map((row) => row.id)
  const sortedRestore = sortSessions(afterRestore, { sortOrder: "updated" }).map((row) => row.id)
  assert.deepEqual(
    sortSessions(before, { sortOrder: "updated" }).map((row) => row.id),
    ["a", "b", "c"]
  )
  assert.deepEqual(sortedArchive, ["a", "c"])
  assert.deepEqual(sortedRestore, ["a", "b", "c"])
  assert.equal(sortedRestore[0], "a")
})
