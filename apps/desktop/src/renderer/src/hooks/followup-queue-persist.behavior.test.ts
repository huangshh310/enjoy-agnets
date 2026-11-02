/**
 * t3-b：renderer 队列写穿落盘；模拟重启后回灌；暂停 reason 防误自启。
 */
import assert from "node:assert/strict"
import { test, beforeEach } from "node:test"

let fqStore: { items: unknown[]; paused: Record<string, string> } = { items: [], paused: {} }
;(globalThis as { window?: unknown }).window = {
  ide: {
    session: {
      followupQueue: {
        loadSync: () => JSON.parse(JSON.stringify(fqStore)),
        save: (input: { items: unknown[]; paused: Record<string, string> }) => {
          fqStore = { items: input.items, paused: { ...input.paused } }
        }
      }
    }
  }
}

const {
  enqueueFollowup,
  followupPausedReason,
  listFollowups,
  moveFollowup,
  pauseFollowups,
  removeFollowup,
  resetFollowupHydrationForTest,
  resetFollowupsForTest,
  setFollowupPersistEnabledForTest
} = await import("./followup-queue.ts")
const { loadFollowupQueueSnapshot } = await import("../lib/followup-queue-storage.ts")

beforeEach(() => {
  fqStore = { items: [], paused: {} }
  setFollowupPersistEnabledForTest(true)
  resetFollowupsForTest()
  fqStore = { items: [], paused: {} }
})

test("入队后落盘；模拟重启回灌队列与暂停 reason", () => {
  enqueueFollowup({ sessionId: "ses_p1", text: "第一件", assets: [] })
  enqueueFollowup({ sessionId: "ses_p1", text: "第二件", assets: [] })
  assert.equal(pauseFollowups("ses_p1", "stopped"), true)
  assert.equal(loadFollowupQueueSnapshot().items.length, 2)
  assert.equal(loadFollowupQueueSnapshot().paused.ses_p1, "stopped")

  resetFollowupHydrationForTest()
  // ensureHydrated via list → 从 bridge 回灌
  const restored = listFollowups("ses_p1")
  assert.deepEqual(
    restored.map((i) => i.text),
    ["第一件", "第二件"]
  )
  assert.equal(followupPausedReason("ses_p1"), "stopped")
})

test("改序 / 删除写穿落盘", () => {
  enqueueFollowup({ sessionId: "ses_p2", text: "A", assets: [] })
  enqueueFollowup({ sessionId: "ses_p2", text: "B", assets: [] })
  const second = listFollowups("ses_p2")[1]!
  moveFollowup(second.id, -1)
  assert.deepEqual(
    loadFollowupQueueSnapshot().items.filter((i) => i.sessionId === "ses_p2").map((i) => i.text),
    ["B", "A"]
  )
  removeFollowup(listFollowups("ses_p2")[0]!.id)
  assert.deepEqual(
    loadFollowupQueueSnapshot().items.filter((i) => i.sessionId === "ses_p2").map((i) => i.text),
    ["A"]
  )
})
