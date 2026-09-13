import assert from "node:assert/strict"
import { test } from "node:test"
import { sortSessions } from "./sort-sessions.ts"
import type { RepositoryNode } from "@renderer/stores/chat-store.types"

test("sortSessions 始终将 flagged 旗标排在最顶部", () => {
  const sessions: RepositoryNode[] = [
    { id: "s1", name: "S1", kind: "session", updatedAt: 100, flagged: false },
    { id: "s2", name: "S2", kind: "session", updatedAt: 50, flagged: true },
    { id: "s3", name: "S3", kind: "session", updatedAt: 200, flagged: false }
  ]
  const sorted = sortSessions(sessions, { sortOrder: "updated" })
  assert.equal(sorted[0].id, "s2") // flagged first even with older timestamp
  assert.equal(sorted[1].id, "s3") // higher updatedAt
  assert.equal(sorted[2].id, "s1")
})

test("sortSessions priority 模式优先排列 waitingReview 与 running", () => {
  const sessions: RepositoryNode[] = [
    { id: "s1", name: "S1", kind: "session", updatedAt: 300 },
    { id: "s2", name: "S2", kind: "session", updatedAt: 200 },
    { id: "s3", name: "S3", kind: "session", updatedAt: 100 }
  ]
  const activities: Record<string, { running: boolean; waitingReview: boolean }> = {
    s1: { running: false, waitingReview: false },
    s2: { running: true, waitingReview: false },
    s3: { running: false, waitingReview: true }
  }
  const sorted = sortSessions(sessions, {
    sortOrder: "priority",
    getActivity: (id) => activities[id] || { running: false, waitingReview: false }
  })
  assert.equal(sorted[0].id, "s3") // waitingReview first
  assert.equal(sorted[1].id, "s2") // running second
  assert.equal(sorted[2].id, "s1") // idle last
})
