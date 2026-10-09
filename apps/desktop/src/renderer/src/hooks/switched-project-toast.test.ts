/**
 * 删除后自动切项目的 toast 文案。不直接 import toast 模块，避免一跳进 sonner。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enChat } from "../i18n/catalogs/en/chat.ts"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { interpolate } from "../i18n/lookup.ts"

test("切换 toast 中英文都带项目名", () => {
  assert.equal(interpolate(zhChat.switchedToProject, { name: "A" }), "已切换到「A」")
  assert.equal(interpolate(enChat.switchedToProject, { name: "A" }), "Switched to “A”")
})

test("删除确认中文用全角逗号", () => {
  assert.match(zhChat.removeProjectHint, /磁盘文件夹，该项目下/)
  assert.doesNotMatch(zhChat.removeProjectHint, /磁盘文件夹,该项目下/)
})

test("切换 toast 走统一 showAppToast，不改时长", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "switched-project-toast.ts"), "utf8")
  assert.match(src, /showAppToast/)
  assert.doesNotMatch(src, /duration:/)
})
