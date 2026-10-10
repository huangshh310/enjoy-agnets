/**
 * 后台 parks 也算运行中；审批优先于转圈。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  pickActiveSessions,
  sessionActivity,
  sessionIsRunning,
  sessionWaitingReview
} from "./session-activity.ts"

const base = {
  currentId: "ses_fg",
  running: true,
  parks: { ses_bg: { running: true }, ses_idle: { running: false } },
  items: [
    {
      sessionId: "ses_wait",
      kind: "pending_approval" as const,
      status: "active" as const
    }
  ]
}

test("当前会话 running 跟 Composer", () => {
  assert.equal(sessionIsRunning({ ...base, sessionId: "ses_fg" }), true)
  assert.equal(sessionIsRunning({ ...base, sessionId: "ses_fg", running: false }), false)
})

test("后台会话 running 跟 parks，不要求当前选中", () => {
  assert.equal(sessionIsRunning({ ...base, sessionId: "ses_bg" }), true)
  assert.equal(sessionIsRunning({ ...base, sessionId: "ses_idle" }), false)
  assert.equal(sessionIsRunning({ ...base, sessionId: "ses_none" }), false)
})

test("审批槽才是 waitingReview", () => {
  assert.equal(sessionWaitingReview("ses_wait", base.items), true)
  assert.equal(sessionWaitingReview("ses_fg", base.items), false)
})

test("activity 同时给出 running 与 waitingReview", () => {
  const wait = sessionActivity({ ...base, sessionId: "ses_wait" })
  assert.equal(wait.waitingReview, true)
  assert.equal(wait.running, false)
  const bg = sessionActivity({ ...base, sessionId: "ses_bg" })
  assert.equal(bg.running, true)
  assert.equal(bg.waitingReview, false)
})

test("进行中钉住：等你优先，最多 8 条", () => {
  const sessions = [
    { id: "ses_bg", updatedAt: 1 },
    { id: "ses_wait", updatedAt: 2 },
    { id: "ses_idle", updatedAt: 9 }
  ]
  const picked = pickActiveSessions(sessions, (id) => sessionActivity({ ...base, sessionId: id }))
  assert.deepEqual(
    picked.map((item) => item.id),
    ["ses_wait", "ses_bg"]
  )
})

test("运行完成后立刻离开进行中，不会留两行", () => {
  const sessions = [
    { id: "ses_fg", updatedAt: 3 },
    { id: "ses_bg", updatedAt: 2 },
    { id: "ses_wait", updatedAt: 1 }
  ]
  const stopped = {
    ...base,
    running: false,
    parks: { ses_bg: { running: false }, ses_idle: { running: false } }
  }
  const picked = pickActiveSessions(sessions, (id) => sessionActivity({ ...stopped, sessionId: id }))
  assert.deepEqual(
    picked.map((item) => item.id),
    ["ses_wait"]
  )
  assert.equal(
    picked.some((item) => item.id === "ses_fg" || item.id === "ses_bg"),
    false
  )
})

test("侧栏不得只给当前会话画运行灯", () => {
  const dir = dirname(fileURLToPath(import.meta.url))
  const repos = readFileSync(join(dir, "sidebar-repos.tsx"), "utf8")
  const row = readFileSync(join(dir, "sidebar-workspace-row.tsx"), "utf8")
  assert.equal(repos.includes("session.id === sessionId && running"), false)
  assert.equal(row.includes("session.id === sessionId && running"), false)
})
