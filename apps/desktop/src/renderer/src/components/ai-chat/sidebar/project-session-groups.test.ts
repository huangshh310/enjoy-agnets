/**
 * 「按项目」每条会话只渲染一次；种 30 条时 Seed session 28/29 各一次。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  countTitleInProjectView,
  orphanSessions,
  projectViewSessionRows,
  seedProjectNodes,
  seedSessionTitle,
  workspaceIdsOf
} from "./project-session-groups.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("种 30 条时 Seed session 28 与 29 在按项目视图各出现一次", () => {
  const nodes = seedProjectNodes(30)
  assert.equal(seedSessionTitle(28), "Seed session 28")
  assert.equal(seedSessionTitle(29), "Seed session 29")
  assert.equal(countTitleInProjectView(nodes, "Seed session 28"), 1)
  assert.equal(countTitleInProjectView(nodes, "Seed session 29"), 1)
  const rows = projectViewSessionRows(nodes)
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length)
  assert.equal(rows.length, 30)
  assert.ok(rows.every((row) => row.group === "project"))
})

test("无匹配项目的会话进其他对话，且仍只出现一次", () => {
  const nodes = [
    ...seedProjectNodes(3),
    { id: "orphan-1", name: "Loose chat", kind: "session" as const }
  ]
  const rows = projectViewSessionRows(nodes)
  const loose = rows.filter((row) => row.name === "Loose chat")
  assert.equal(loose.length, 1)
  assert.equal(loose[0]?.group, "other")
  assert.equal(rows.at(-1)?.id, "orphan-1")
  assert.equal(orphanSessions(nodes, workspaceIdsOf(nodes)).length, 1)
})

test("侧栏按项目不再复用最近组把同一条再画一遍", () => {
  const repos = readFileSync(join(dir, "sidebar-repos.tsx"), "utf8")
  const menu = readFileSync(join(dir, "sidebar-organize-menu.tsx"), "utf8")
  assert.match(repos, /sessionsForWorkspace|orphanSessions/)
  assert.match(repos, /chat\.otherChats/)
  assert.match(menu, /chat\.viewArchived/)
  assert.match(menu, /data-testid="view-archived"/)
  assert.doesNotMatch(repos, /recent-\$\{/)
  assert.doesNotMatch(repos, /chat\.recent/)
  assert.doesNotMatch(repos, /allSessions\.slice\(0,\s*3\)/)
  assert.doesNotMatch(menu, /chat\.recent/)
})
