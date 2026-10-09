import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { desktopActFailedCopy, desktopActFailureKind } from "./desktop-act-failed-copy.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"

const ROOT = dirname(fileURLToPath(import.meta.url))

function tZh(key: string): string {
  const leaf = key.replace(/^chat\./, "") as keyof typeof zhChat
  return String(zhChat[leaf] ?? key)
}

test("只认诚实失败码，不当成功、不吃下一步字段", () => {
  assert.equal(desktopActFailureKind({ success: true, observationId: "obs_new" }), null)
  assert.equal(desktopActFailureKind({ code: "action_failed", observationId: "obs_new" }), "action_failed")
  assert.equal(desktopActFailureKind({ code: "bare_coords_disabled" }), "bare_coords_disabled")
  const copy = desktopActFailedCopy("action_failed", tZh)
  assert.equal(copy.title, "动作没有成功")
  assert.match(copy.body, /失败/)
  assert.match(copy.body, /快照/)
  assert.doesNotMatch(copy.body, /已拦截|继续点这里|成功|obs_/)
  assert.equal(copy.body.includes("hunter2"), false)
})

test("中英失败文案短、建议重拍，不做脚注墙", () => {
  assert.equal(zhChat.desktopActFailedTitle, "动作没有成功")
  assert.match(zhChat.desktopActFailedBody, /不含新观察/)
  assert.match(zhChat.desktopActFailedBody, /快照/)
  assert.doesNotMatch(zhChat.desktopActFailedBody, /已拦截|继续点这里/)
  assert.match(enChat.desktopActFailedBody, /snapshot/i)
  assert.doesNotMatch(enChat.desktopActFailedBody, /blocked|continue here|success/i)
  const card = readFileSync(join(ROOT, "desktop-act-failed-card.tsx"), "utf8")
  assert.match(card, /desktop-act-failed/)
  assert.doesNotMatch(card, /thumbnailPath|nextStep|continueHint|observationId/)
})
