/**
 * 归档未决审批：确认后走 Dock 同一条 deny；取消不动。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { interpolate } from "../i18n/lookup.ts"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { zhCommon } from "../i18n/catalogs/zh/common.ts"
import { stripApprovalCount, stripVisibleForOpenSessions } from "../stores/attention/ingest-attention.ts"
import type { AttentionItem } from "../stores/attention/attention.types.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("确认文案与按钮钉死", () => {
  assert.equal(zhChat.archivePendingDesc, "这条对话还有一个操作等你决定。归档会拒绝它。")
  assert.equal(zhChat.archivePendingConfirm, "拒绝并归档")
  assert.equal(zhCommon.cancel, "取消")
  assert.equal(interpolate(zhChat.archivePendingDesc), zhChat.archivePendingDesc)
})

test("接线：确认走 decide deny，取消只关框", () => {
  const deny = readFileSync(join(dir, "deny-then-archive.ts"), "utf8")
  const dock = readFileSync(
    join(dir, "../components/ai-chat/attention/permission-dock.tsx"),
    "utf8"
  )
  const guard = readFileSync(
    join(dir, "../components/ai-chat/sidebar/archive-approval-guard.tsx"),
    "utf8"
  )
  const life = readFileSync(join(dir, "workspace-lifecycle.ts"), "utf8")
  assert.match(dock, /decidePendingApproval\("deny"\)/)
  assert.match(deny, /decidePendingApprovalOrThrow\("deny"\)/)
  assert.match(deny, /decision:\s*"deny"/)
  assert.match(deny, /notifyArchiveFailed/)
  assert.match(deny, /archiveCurrentSession/)
  assert.match(deny, /hideSessionAttention/)
  assert.match(guard, /confirmDenyAndArchive/)
  assert.match(guard, /cancelArchivePrompt/)
  assert.match(guard, /chat\.archivePendingConfirm/)
  assert.doesNotMatch(life, /requestArchiveSession/)
  const confirm = readFileSync(
    join(dir, "../components/app-pages/confirm-dialog.tsx"),
    "utf8"
  )
  assert.match(confirm, /await Promise\.resolve\(onConfirm\(\)\)/)
  assert.match(confirm, /onSubmit/)
  assert.match(confirm, /type="submit"/)
  assert.match(deny, /confirming/)
  assert.match(guard, /onConfirm=\{\(\) => confirmDenyAndArchive\(\)\}/)
})

test("归档后胶囊不计隐藏会话，徽标为 0", () => {
  const items: AttentionItem[] = [
    {
      id: "s-hidden:pending_approval",
      sessionId: "s-hidden",
      sessionTitle: "已归档",
      kind: "pending_approval",
      status: "active",
      runId: "run",
      occurredAt: 1,
      summary: "待审批"
    }
  ]
  const open = new Set<string>(["s-open"])
  assert.equal(stripApprovalCount(items), 1)
  assert.equal(stripVisibleForOpenSessions(items, open).length, 0)
})
