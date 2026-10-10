/**
 * 归档 toast 文案与 5s 撤销；不直接 import toast 模块，避免一跳进 sonner。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enChat } from "../i18n/catalogs/en/chat.ts"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { enCommon } from "../i18n/catalogs/en/common.ts"
import { zhCommon } from "../i18n/catalogs/zh/common.ts"
import { interpolate } from "../i18n/lookup.ts"
import { ARCHIVE_UNDO_TOAST_MS } from "../lib/app-toast-policy.ts"
import { archivedToastMessage, restoredToastMessage, sessionTitleFromStore } from "./archive-session-copy.ts"

const dir = dirname(fileURLToPath(import.meta.url))

test("已归档 toast 中英文带书名号标题", () => {
  const t = (path: string, vars?: Record<string, string | number>) => {
    if (path === "chat.archivedToast") return interpolate(zhChat.archivedToast, vars)
    return path
  }
  assert.equal(archivedToastMessage("Seed session 28", t), "已归档「Seed session 28」")
  assert.equal(interpolate(zhChat.archivedToast, { title: "Seed session 28" }), "已归档「Seed session 28」")
  assert.equal(interpolate(enChat.archivedToast, { title: "Seed session 28" }), "Archived “Seed session 28”")
  assert.equal(zhChat.restoredToast, "已恢复到侧栏")
  assert.equal(enChat.restoredToast, "Restored to sidebar")
  assert.equal(restoredToastMessage((path) => (path === "chat.restoredToast" ? zhChat.restoredToast : path)), "已恢复到侧栏")
  assert.equal(zhCommon.undo, "撤销")
  assert.equal(enCommon.undo, "Undo")
})

test("侧栏找不到标题时回退 sessionId", () => {
  assert.equal(sessionTitleFromStore("s1", [{ id: "s1", name: "  Hello  " }]), "Hello")
  assert.equal(sessionTitleFromStore("missing", []), "missing")
})

test("归档入口走 5s 撤销 toast，并接已有 unarchive", () => {
  assert.equal(ARCHIVE_UNDO_TOAST_MS, 5000)
  const toast = readFileSync(join(dir, "archive-session-toast.ts"), "utf8")
  const life = readFileSync(join(dir, "workspace-lifecycle.ts"), "utf8")
  const stamp = readFileSync(join(dir, "../../../main/services/session-lifecycle.ts"), "utf8")
  assert.match(toast, /ARCHIVE_UNDO_TOAST_MS/)
  assert.match(toast, /duration:\s*ARCHIVE_UNDO_TOAST_MS/)
  assert.match(toast, /common\.undo/)
  assert.match(toast, /notifySessionRestored/)
  assert.match(life, /notifySessionArchived/)
  assert.match(life, /notifySessionRestored/)
  assert.match(life, /unarchiveSession/)
  assert.match(life, /sessionTitleFromStore/)
  assert.match(stamp, /stampSessionArchived/)
  assert.match(stamp, /stampSessionUnarchived/)
  assert.doesNotMatch(stamp, /SET archived_at = \?, updated_at/)
})
