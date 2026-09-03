import assert from "node:assert/strict"
import { test } from "node:test"
import type { InboxNotification, InboxSeed } from "../inbox.types.ts"
import { filterInbox, inboxNavCounts, materializeInbox, resolveSelected } from "./filter-inbox.ts"
import { groupInbox, inboxGroupId, inboxTimeParts, startOfLocalDay } from "./inbox-time.ts"

const t = (path: string) => path

const seeds: InboxSeed[] = [
  { id: "a", copyKey: "rustRefactor", category: "agent", offsetMs: 10_000, actionKey: "openSession" },
  { id: "b", copyKey: "hmacBound", category: "system", offsetMs: 20_000 }
]

function note(partial: Partial<InboxNotification> & Pick<InboxNotification, "id">): InboxNotification {
  return {
    copyKey: "rustRefactor",
    title: partial.title ?? partial.id,
    summary: partial.summary ?? "",
    category: partial.category ?? "agent",
    read: partial.read ?? false,
    occurredAt: partial.occurredAt ?? 0,
    ...partial
  }
}

test("物化种子：隐藏项丢弃，已读与相对时间写入", () => {
  const items = materializeInbox(seeds, {
    t,
    now: 100_000,
    readIds: new Set(["a"]),
    hiddenIds: new Set(["b"])
  })
  assert.equal(items.length, 1)
  assert.equal(items[0]?.id, "a")
  assert.equal(items[0]?.read, true)
  assert.equal(items[0]?.occurredAt, 90_000)
  assert.equal(items[0]?.actionLabel, "pages.inbox.actions.openSession")
  assert.equal(items[0]?.copyKey, "rustRefactor")
})

test("选中项：命中 id，否则回落第一封，空列表为 null", () => {
  const items = [note({ id: "1" }), note({ id: "2" })]
  assert.equal(resolveSelected(items, "2")?.id, "2")
  assert.equal(resolveSelected(items, "missing")?.id, "1")
  assert.equal(resolveSelected([], "1"), null)
})

test("过滤：未读 / 分类 / 搜索同时生效", () => {
  const items = [
    note({ id: "1", title: "Rust 重构", category: "agent", read: false }),
    note({ id: "2", title: "HMAC 绑定", category: "system", read: false }),
    note({ id: "3", title: "旧运行", category: "agent", read: true })
  ]
  assert.equal(filterInbox(items, "unread", "").length, 2)
  assert.equal(filterInbox(items, "agent", "").length, 2)
  assert.equal(filterInbox(items, "system", "").map((item) => item.id).join(), "2")
  assert.equal(filterInbox(items, "all", "hmac").map((item) => item.id).join(), "2")
})

test("侧栏徽标只数未读", () => {
  const counts = inboxNavCounts([
    note({ id: "1", category: "agent", read: false }),
    note({ id: "2", category: "agent", read: true }),
    note({ id: "3", category: "system", read: false })
  ])
  assert.deepEqual(counts, { all: 2, unread: 2, agent: 1, system: 1 })
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
