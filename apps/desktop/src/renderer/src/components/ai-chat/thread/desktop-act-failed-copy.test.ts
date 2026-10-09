/**
 * 硬拒卡只认 code；审批层 denial 带 bare_coords_disabled 也走人话，不露工程码。
 */
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

test("审批层 denial 带 code 也走中文硬拒卡，不吃英文 reason", () => {
  const denial = {
    type: "denied",
    reason: "Bare pixel coordinates are disabled. Capture desktop_snapshot and act with elementId.",
    code: "bare_coords_disabled"
  }
  assert.equal(desktopActFailureKind(denial), "bare_coords_disabled")
  const copy = desktopActFailedCopy("bare_coords_disabled", tZh)
  assert.equal(copy.title, zhChat.desktopCoordsDisabledTitle)
  assert.equal(copy.body, zhChat.desktopCoordsDisabledBody)
  assert.match(copy.body, /屏幕坐标/)
  assert.match(copy.body, /设置/)
  assert.match(copy.body, /高级坐标/)
  assert.doesNotMatch(copy.body, /裸坐标|逃逸舱|elementId|bare_coords|hunter2/)
  assert.doesNotMatch(copy.title, /裸坐标|逃逸舱/)
})

test("执行面失败包与审批层 denial 同一张人话卡", () => {
  assert.equal(desktopActFailureKind({ success: false, code: "bare_coords_disabled" }), "bare_coords_disabled")
  assert.equal(desktopActFailureKind({ code: "action_failed", observationId: "obs_new" }), "action_failed")
  assert.equal(desktopActFailureKind({ type: "denied", reason: "Bare pixel coordinates are disabled." }), null)
  const failed = desktopActFailedCopy("action_failed", tZh)
  assert.equal(failed.title, "动作没有成功")
  assert.match(failed.body, /失败/)
  assert.match(failed.body, /快照/)
})

test("中英失败文案短、建议重拍，卡上不露工程码", () => {
  assert.equal(zhChat.desktopActFailedTitle, "动作没有成功")
  assert.match(zhChat.desktopActFailedBody, /不含新观察/)
  assert.match(enChat.desktopActFailedBody, /snapshot/i)
  assert.doesNotMatch(zhChat.desktopCoordsDisabledBody, /裸坐标|逃逸舱|elementId/)
  assert.doesNotMatch(enChat.desktopCoordsDisabledBody, /bare coord|escape hatch|elementId/i)
  assert.match(enChat.desktopCoordsDisabledBody, /Settings/)
  const card = readFileSync(join(ROOT, "desktop-act-failed-card.tsx"), "utf8")
  assert.match(card, /desktop-act-failed/)
  assert.doesNotMatch(card, /code ·|font-mono|thumbnailPath|nextStep|continueHint|observationId/)
})
