import assert from "node:assert/strict"
import { test } from "node:test"
import { filterQuickSearchSessions } from "./filter-quick-search-sessions.ts"

const sessions = Array.from({ length: 30 }, (_, index) => ({
  id: `ses_${index + 1}`,
  name: `Seed session ${index + 1}`
}))

test("空查询只列最近 8 条，有关键字搜全部标题", () => {
  assert.equal(filterQuickSearchSessions(sessions, "").length, 8)
  const hits = filterQuickSearchSessions(sessions, "Seed")
  assert.equal(hits.length, 30)
  assert.equal(filterQuickSearchSessions(sessions, "session 28")[0]?.name, "Seed session 28")
  assert.equal(filterQuickSearchSessions(sessions, "missing").length, 0)
})
