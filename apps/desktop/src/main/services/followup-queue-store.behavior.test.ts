/**
 * t3-b：followup_queue 落 DB；暂停 reason 一并持久。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { getDatabase } = await import("./restore-interrupted-running.behavior.load.ts")
const { loadFollowupQueue, saveFollowupQueue } = await import("./followup-queue-store.ts")

test("队列按会话存进 DB、读回；清空即删", () => {
  saveFollowupQueue({
    items: [
      {
        id: "follow_a",
        sessionId: "ses_fq_a",
        prompt: "第一件",
        text: "第一件",
        assets: [],
        createdAt: 1,
        status: "pending"
      },
      {
        id: "follow_b",
        sessionId: "ses_fq_b",
        prompt: "别的会话",
        text: "别的会话",
        assets: [{ id: "ast_1", name: "a.png", mediaType: "image/png" }],
        createdAt: 2,
        status: "pending"
      }
    ],
    paused: { ses_fq_a: "stopped" }
  })
  const snap = loadFollowupQueue()
  assert.equal(snap.items.length, 2)
  assert.equal(snap.items[0]?.text, "第一件")
  assert.equal(snap.items[1]?.assets[0]?.id, "ast_1")
  assert.equal(snap.paused.ses_fq_a, "stopped")
  // 空会话暂停应被清掉
  assert.equal(snap.paused.ses_fq_missing, undefined)

  saveFollowupQueue({ items: [], paused: {} })
  assert.deepEqual(loadFollowupQueue(), { items: [], paused: {} })
  const row = getDatabase().prepare("SELECT 1 as ok FROM followup_queue WHERE id = 1").get() as { ok: number } | undefined
  assert.equal(row, undefined)
})

test("暂停 reason 无对应项时不落盘", () => {
  saveFollowupQueue({
    items: [
      {
        id: "follow_c",
        sessionId: "ses_fq_c",
        prompt: "还在",
        text: "还在",
        assets: [],
        createdAt: 3,
        status: "pending"
      }
    ],
    paused: { ses_fq_c: "error", ses_orphan: "stopped" }
  })
  const snap = loadFollowupQueue()
  assert.equal(snap.paused.ses_fq_c, "error")
  assert.equal(snap.paused.ses_orphan, undefined)
  saveFollowupQueue({ items: [], paused: {} })
})
