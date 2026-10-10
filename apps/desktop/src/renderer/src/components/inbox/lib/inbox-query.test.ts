import assert from "node:assert/strict"
import { test } from "node:test"
import { DESKTOP_ACT_BARE_COORDS_DISABLED } from "@enjoy-agents/ipc-contract/desktop-act-codes"
import type { AttentionItem } from "@renderer/stores/attention/attention.types.ts"
import type { RepositoryNode } from "@renderer/stores/chat-store.types.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import type { InboxNotification } from "../inbox.types.ts"
import {
  filterInbox,
  inboxFromAttention,
  inboxFromPendingApprovals,
  inboxNavCounts,
  resolveSelected
} from "./filter-inbox.ts"
import {
  inboxFromNeedsReviewSessions,
  synthesizeNeedsReviewInbox
} from "./synthesize-needs-review-inbox.ts"
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
    copyKey: partial.copyKey ?? "pending_approval",
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

test("已决审批与已归档会话不进拍板", () => {
  const repositories: RepositoryNode[] = [
    { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
    { id: "ses_live", name: "活着", kind: "session", parentId: "ws", updatedAt: 2 }
  ]
  const items = inboxFromAttention(
    [
      attention({
        id: "ses_live:pending_approval",
        sessionId: "ses_live",
        kind: "pending_approval",
        status: "active",
        summary: "活着 · write_file"
      }),
      attention({
        id: "ses_live:pending_done",
        sessionId: "ses_live",
        kind: "pending_approval",
        status: "resolved",
        summary: "已决 · write_file"
      }),
      attention({
        id: "ses_arch:pending_approval",
        sessionId: "ses_arch",
        kind: "pending_approval",
        status: "active",
        summary: "归档 · write_file"
      })
    ],
    { t, readIds: new Set(), hiddenIds: new Set(), repositories }
  )
  assert.equal(items.length, 1)
  assert.equal(items[0]?.sessionId, "ses_live")
  assert.equal(inboxNavCounts(items).approval, 1)
})

test("空会话列表不得把所有 Attention 当成活着", () => {
  const items = inboxFromAttention(
    [
      attention({
        id: "ses_ghost:pending_approval",
        sessionId: "ses_ghost",
        kind: "pending_approval",
        status: "active",
        summary: "幽灵 · write_file"
      })
    ],
    { t, readIds: new Set(), hiddenIds: new Set(), repositories: [] }
  )
  assert.equal(items.length, 0)
  assert.equal(inboxNavCounts(items).approval, 0)
})

test("拍板行来自 main 未决，不靠 Attention 槽", () => {
  const rows = inboxFromPendingApprovals(
    [
      {
        id: "apr_main",
        runId: "run_1",
        sessionId: "ses_live",
        workspaceId: "ws",
        sessionTitle: "活着",
        name: "write_file",
        toolCallId: "tool_1",
        createdAt: 2
      }
    ],
    {
      t,
      readIds: new Set(),
      hiddenIds: new Set(),
      repositories: [
        { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
        { id: "ses_live", name: "活着", kind: "session", parentId: "ws", updatedAt: 2 }
      ]
    }
  )
  const fromAttention = inboxFromAttention(
    [
      attention({
        id: "ses_live:pending_approval",
        sessionId: "ses_live",
        kind: "pending_approval",
        status: "active",
        summary: "活着 · write_file"
      })
    ],
    {
      t,
      readIds: new Set(),
      hiddenIds: new Set(),
      omitAttentionApprovals: true,
      repositories: [
        { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
        { id: "ses_live", name: "活着", kind: "session", parentId: "ws", updatedAt: 2 }
      ]
    }
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.id, "apr:apr_main")
  assert.equal(fromAttention.length, 0)
})

test("complete 不进安静 Inbox，不占拍板徽标", () => {
  const items = inboxFromAttention(
    [attention({ id: "c", sessionId: "ses_c", kind: "complete", summary: "done" })],
    { t, readIds: new Set(), hiddenIds: new Set() }
  )
  assert.equal(items.length, 0)
  assert.equal(inboxNavCounts(items).approval, 0)
})

test("拍板 main 行摘要走人话工具名，不摊 sessionTitle · write_file", () => {
  const zhTool: Record<string, string> = {
    "chat.toolName.writeFile": "写入文件",
    "attention.kind.pending_approval": "待审批"
  }
  const tZh = (path: string) => zhTool[path] ?? path
  const items = inboxFromPendingApprovals(
    [
      {
        id: "apr_main",
        runId: "run_1",
        sessionId: "ses_live",
        workspaceId: "ws",
        sessionTitle: "stub-title",
        name: "write_file",
        toolCallId: "tool_1",
        createdAt: 2
      }
    ],
    {
      t: tZh,
      readIds: new Set(),
      hiddenIds: new Set(),
      repositories: [
        { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
        { id: "ses_live", name: "stub-title", kind: "session", parentId: "ws", updatedAt: 2 }
      ]
    }
  )
  assert.equal(items[0]?.summary, "写入文件")
  assert.equal(items[0]?.toolName, "write_file")
  assert.doesNotMatch(items[0]?.summary ?? "", /write_file|stub-title/)
})

test("拍板摘要是人话工具名加文件短名，不摊 write_file", () => {
  const zhTool: Record<string, string> = {
    "chat.toolName.writeFile": "写入文件",
    "attention.kind.pending_approval": "待审批"
  }
  const tZh = (path: string) => zhTool[path] ?? path
  const items = inboxFromAttention(
    [
      attention({
        id: "ses_live:pending_approval",
        sessionId: "ses_live",
        kind: "pending_approval",
        status: "active",
        summary: "活着 · write_file",
        approval: {
          type: "approval.required",
          runId: "run_1",
          toolCallId: "tool_1",
          approvalId: "apr_1",
          name: "write_file",
          args: { path: "notes/e2e-stub.txt" }
        }
      })
    ],
    { t: tZh, readIds: new Set(), hiddenIds: new Set() }
  )
  assert.equal(items.length, 1)
  assert.equal(items[0]?.summary, "写入文件 e2e-stub.txt")
  assert.equal(items[0]?.toolName, "write_file")
  assert.doesNotMatch(items[0]?.summary ?? "", /write_file/)
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

test("过滤：拍板 / 待验收 / 失败，拍板列不含待验收", () => {
  const items = [
    note({ id: "1", title: "待审批", copyKey: "pending_approval", read: false }),
    note({ id: "2", title: "运行出错 HMAC", copyKey: "error", read: false }),
    note({ id: "3", title: "登录页改版", copyKey: "needs_review", read: true }),
    note({ id: "4", title: "提问", copyKey: "ask_user", read: false })
  ]
  assert.deepEqual(filterInbox(items, "approval", "").map((item) => item.id), ["1", "4"])
  assert.deepEqual(filterInbox(items, "needs_review", "").map((item) => item.id), ["3"])
  assert.equal(filterInbox(items, "failed", "").length, 1)
  assert.equal(filterInbox(items, "failed", "hmac").map((item) => item.id).join(), "2")
})

test("导航计数：徽标口径与拍板列一致", () => {
  const counts = inboxNavCounts([
    note({ id: "1", copyKey: "pending_approval", read: false }),
    note({ id: "2", copyKey: "error", read: false }),
    note({ id: "3", copyKey: "needs_review", read: true }),
    note({ id: "4", copyKey: "ask_user", read: false })
  ])
  assert.deepEqual(counts, {
    approval: 2,
    needs_review: 1,
    failed: 1
  })
})

test("失败 / 已取消走失败筛，不进待验收，也不进拍板计数", () => {
  const items = [
    note({ id: "e", copyKey: "error", read: false }),
    note({ id: "a", copyKey: "aborted", read: true }),
    note({ id: "r", copyKey: "needs_review", read: true }),
    note({ id: "p", copyKey: "pending_approval", read: false })
  ]
  assert.deepEqual(filterInbox(items, "failed", "").map((item) => item.id), ["e", "a"])
  assert.deepEqual(filterInbox(items, "needs_review", "").map((item) => item.id), ["r"])
  assert.equal(inboxNavCounts(items).approval, 1)
  assert.equal(inboxNavCounts(items).failed, 2)
  assert.equal(inboxNavCounts(items).needs_review, 1)
})

test("Inbox 失败预览不露 bare_coords_disabled", () => {
  const tInbox = (path: string) => {
    const leaf = path.replace(/^chat\./, "") as keyof typeof zhChat
    return String(zhChat[leaf] ?? path)
  }
  const items = inboxFromAttention(
    [
      attention({
        id: "ses_xy:error",
        sessionId: "ses_xy",
        kind: "error",
        summary: DESKTOP_ACT_BARE_COORDS_DISABLED,
        errorMessage: DESKTOP_ACT_BARE_COORDS_DISABLED
      })
    ],
    { t: tInbox, readIds: new Set(), hiddenIds: new Set() }
  )
  const row = items[0]
  assert.ok(row)
  assert.equal(row.copyKey, "error")
  assert.equal(row.summary, zhChat.desktopCoordsDisabledBody)
  assert.equal(row.errorMessage, zhChat.desktopCoordsDisabledBody)
  assert.doesNotMatch(row.summary, /bare_coords_disabled/)
  assert.doesNotMatch(row.errorMessage ?? "", /bare_coords_disabled/)
})

test("Attention error 含 abort 标已取消，合成待验收只看 workflowStatus", () => {
  const aborted = inboxFromAttention(
    [attention({ id: "ses_x:error", sessionId: "ses_x", kind: "error", errorMessage: "Aborted by user.", summary: "Aborted by user." })],
    { t, readIds: new Set(), hiddenIds: new Set() }
  )
  assert.equal(aborted[0]?.copyKey, "aborted")
  assert.equal(aborted[0]?.isAborted, true)
  const failedSession: RepositoryNode = {
    id: "ses_fail",
    name: "失败轮",
    kind: "session",
    parentId: "ws",
    updatedAt: 4,
    workflowStatus: "in_progress"
  }
  assert.equal(synthesizeNeedsReviewInbox({ repositories: [failedSession], t, now: 5 }).length, 0)
})

test("待验收只认 main 的 needs_review，不看 git dirty / 裸 run.end", () => {
  const fromGitOrEnd = inboxFromNeedsReviewSessions([], {
    t,
    now: 10,
    repositories: [
      { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
      { id: "ses_dirty", name: "脏仓", kind: "session", parentId: "ws", updatedAt: 8 }
    ]
  })
  assert.equal(fromGitOrEnd.length, 0)
  const rows = inboxFromNeedsReviewSessions(
    [
      {
        id: "ses_r",
        workspaceId: "ws",
        title: "登录页改版",
        updatedAt: 9,
        workflowStatus: "needs_review"
      }
    ],
    {
      t,
      now: 10,
      repositories: [
        { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
        { id: "ses_r", name: "登录页改版", kind: "session", parentId: "ws", updatedAt: 9 }
      ]
    }
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.sessionId, "ses_r")
  assert.equal(inboxNavCounts(rows).needs_review, 1)
})

test("待验收与拍板一样要和会话列表求交，空列表 fail-closed", () => {
  const row = {
    id: "ses_ghost",
    workspaceId: "ws",
    title: "幽灵",
    updatedAt: 9,
    workflowStatus: "needs_review" as const
  }
  assert.equal(
    inboxFromNeedsReviewSessions([row], { t, now: 10, repositories: [] }).length,
    0
  )
  assert.equal(
    inboxFromNeedsReviewSessions([row], {
      t,
      now: 10,
      repositories: [{ id: "ws", name: "app", kind: "workspace", updatedAt: 1 }]
    }).length,
    0
  )
  assert.equal(
    inboxFromNeedsReviewSessions([row], {
      t,
      now: 10,
      repositories: [
        { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
        { id: "ses_ghost", name: "幽灵", kind: "session", parentId: "ws", updatedAt: 9 }
      ]
    }).length,
    1
  )
})

test("待验收行带上改动文件与完成时间", () => {
  const rows = inboxFromNeedsReviewSessions(
    [
      {
        id: "ses_r",
        workspaceId: "ws",
        title: "待看",
        updatedAt: 9,
        workflowStatus: "needs_review",
        changedFiles: { names: ["a.ts", "b.ts"], total: 4 },
        completedAt: "2026-10-10T00:00:00.000Z"
      }
    ],
    {
      t,
      now: 10,
      repositories: [
        { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
        { id: "ses_r", name: "待看", kind: "session", parentId: "ws", updatedAt: 9 }
      ]
    }
  )
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0]?.changedFiles, { names: ["a.ts", "b.ts"], total: 4 })
  assert.equal(rows[0]?.completedAt, "2026-10-10T00:00:00.000Z")
})

test("待验收从会话 workflowStatus 合成，不进拍板计数", () => {
  const repositories: RepositoryNode[] = [
    { id: "ws", name: "app", kind: "workspace", updatedAt: 1 },
    {
      id: "ses_r",
      name: "登录页改版",
      kind: "session",
      parentId: "ws",
      updatedAt: 9,
      workflowStatus: "needs_review"
    },
    { id: "ses_d", name: "已完成", kind: "session", parentId: "ws", updatedAt: 8, workflowStatus: "done" }
  ]
  const rows = synthesizeNeedsReviewInbox({ repositories, t, now: 10 })
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.sessionId, "ses_r")
  assert.equal(rows[0]?.copyKey, "needs_review")
  assert.equal(inboxNavCounts(rows).approval, 0)
  assert.equal(inboxNavCounts(rows).needs_review, 1)
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
