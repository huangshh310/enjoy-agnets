import assert from "node:assert/strict"
import { test } from "node:test"
import type { AttentionItem } from "@renderer/stores/attention/attention.types.ts"
import type { InboxNotification } from "../inbox.types.ts"
import { filterInbox, inboxFromAttention, inboxNavCounts, resolveSelected } from "./filter-inbox.ts"
import { groupInbox, inboxGroupId, inboxTimeParts, startOfLocalDay } from "./inbox-time.ts"

const t = (path: string) => path

function attention(partial: Partial<AttentionItem> & Pick<AttentionItem, "id" | "sessionId" | "kind">): AttentionItem {
  return {
    sessionTitle: "B",
    status: "active",
    runId: "run_1",
    occurredAt: 1,
    summary: partial.summary ?? partial.id,
    ...partial
  }
}

function note(partial: Partial<InboxNotification> & Pick<InboxNotification, "id">): InboxNotification {
  return {
    copyKey: partial.copyKey ?? "complete",
    title: partial.title ?? partial.id,
    summary: partial.summary ?? "",
    category: partial.category ?? "agent",
    read: partial.read ?? false,
    occurredAt: partial.occurredAt ?? 0,
    sessionId: partial.sessionId ?? "ses_1",
    actionKey: "openSession",
    status: partial.status ?? "active",
    ...partial
  }
}

test("complete 默认已读，不占红点", () => {
  const items = inboxFromAttention(
    [attention({ id: "c", sessionId: "ses_c", kind: "complete", summary: "done" })],
    { t, readIds: new Set(), hiddenIds: new Set() }
  )
  assert.equal(items[0]?.read, true)
  assert.equal(inboxNavCounts(items).unread, 0)
})

test("Attention 物化：隐藏项丢弃，必须带 sessionId", () => {
  const items = inboxFromAttention(
    [
      attention({ id: "a", sessionId: "ses_a", kind: "pending_approval", summary: "bash" }),
      attention({ id: "b", sessionId: "ses_b", kind: "error", summary: "boom" })
    ],
    { t, readIds: new Set(["a"]), hiddenIds: new Set(["b"]) }
  )
  assert.equal(items.length, 1)
  assert.equal(items[0]?.sessionId, "ses_a")
  assert.equal(items[0]?.read, true)
  assert.equal(items[0]?.actionKey, "openSession")
  assert.equal(items[0]?.category, "agent")
})

test("选中项：命中 id，否则回落第一封，空列表为 null", () => {
  const items = [note({ id: "1" }), note({ id: "2" })]
  assert.equal(resolveSelected(items, "2")?.id, "2")
  assert.equal(resolveSelected(items, "missing")?.id, "1")
  assert.equal(resolveSelected([], "1"), null)
})

test("过滤：未读 / 分类 / 搜索同时生效", () => {
  const items = [
    note({ id: "1", title: "待审批", copyKey: "pending_approval", read: false }),
    note({ id: "2", title: "运行出错 HMAC", copyKey: "error", read: false }),
    note({ id: "3", title: "已完成", copyKey: "complete", read: true }),
    note({ id: "4", title: "正在跑", copyKey: "running", status: "running", read: true })
  ]
  assert.equal(filterInbox(items, "unread", "").length, 2)
  assert.equal(filterInbox(items, "waiting", "").length, 1)
  assert.equal(filterInbox(items, "failed", "").length, 1)
  assert.equal(filterInbox(items, "complete", "").length, 1)
  assert.equal(filterInbox(items, "running", "").length, 1)
  assert.equal(filterInbox(items, "all", "hmac").map((item) => item.id).join(), "2")
})

test("导航计数统计各分类数量", () => {
  const counts = inboxNavCounts([
    note({ id: "1", copyKey: "pending_approval", read: false }),
    note({ id: "2", copyKey: "error", read: false }),
    note({ id: "3", copyKey: "complete", read: true }),
    note({ id: "4", copyKey: "running", status: "running", read: true })
  ])
  assert.deepEqual(counts, {
    all: 4,
    unread: 2,
    running: 1,
    waiting: 1,
    failed: 1,
    complete: 1
  })
})

test("相对时间分档", () => {
  const now = 10_000_000
  assert.equal(inboxTimeParts(now - 20_000, now).key, "justNow")
  assert.deepEqual(inboxTimeParts(now - 5 * 60_000, now), { key: "minutesAgo", n: 5 })
  assert.deepEqual(inboxTimeParts(now - 3 * 3_600_000, now), { key: "hoursAgo", n: 3 })
  assert.deepEqual(inboxTimeParts(now - 2 * 86_400_000, now), { key: "daysAgo", n: 2 })
})

test("按本地日历分组，组内新到旧，空组丢弃", () => {
  const now = Date.parse("2026-09-03T15:00:00")
  const today = startOfLocalDay(now)
  const items = [
    note({ id: "old", occurredAt: today - 3 * 86_400_000 }),
    note({ id: "new", occurredAt: now - 60_000 }),
    note({ id: "y", occurredAt: today - 2 * 3_600_000 })
  ]
  const groups = groupInbox(items, now)
  assert.deepEqual(
    groups.map((group) => group.id),
    ["today", "yesterday", "earlier"]
  )
  assert.equal(groups[0]?.items[0]?.id, "new")
  assert.equal(inboxGroupId(now, now), "today")
  assert.equal(inboxGroupId(today - 1, now), "yesterday")
})
