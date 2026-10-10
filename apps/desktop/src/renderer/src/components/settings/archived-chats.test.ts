import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { interpolate } from "../../i18n/lookup.ts"
import { zhSettings } from "../../i18n/catalogs/zh/settings.ts"
import { filterArchivedChats, groupArchivedByWorkspace } from "./archived-chats.ts"

const rows = [
  {
    id: "s1",
    workspaceId: "ws-a",
    workspaceName: "enjoy-agents",
    title: "设计计划",
    updatedAt: 1,
    archivedAt: 2
  },
  {
    id: "s2",
    workspaceId: "ws-b",
    workspaceName: "img",
    title: "新对话",
    updatedAt: 3,
    archivedAt: 4
  }
]

test("按关键词与项目筛选已归档会话", () => {
  assert.equal(filterArchivedChats(rows, "设计", "all").length, 1)
  assert.equal(filterArchivedChats(rows, "", "ws-b")[0]?.id, "s2")
})

test("按工作区分组", () => {
  const groups = groupArchivedByWorkspace(rows)
  assert.equal(groups.length, 2)
  assert.equal(groups[0]?.chats.length, 1)
})

test("全部删除确认写明条数且不可恢复；行删除已有确认", () => {
  assert.equal(
    interpolate(zhSettings.archived.deleteAllConfirm, { count: 3 }),
    "将永久删除 3 条已归档会话，此操作不可恢复。"
  )
  assert.equal(zhSettings.archived.unarchive, "恢复")
  const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "archived-chats-page.tsx"), "utf8")
  assert.match(page, /variant="secondary"/)
  assert.match(page, /data-testid="delete-all-archived"/)
  assert.match(page, /ConfirmDialog/)
  assert.match(page, /pendingDeleteId/)
  assert.match(page, /settings\.archived\.deleteConfirm/)
  assert.match(page, /data-testid="archived-row-delete"/)
})
