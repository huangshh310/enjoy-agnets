/**
 * 自动收默认 toast 走 i18n，只弹一次，不改时长。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { enChat } from "../i18n/catalogs/en/chat.ts"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { interpolate } from "../i18n/lookup.ts"
import {
  adoptedDefaultRouteToastMessage,
  consumeAdoptedHint,
  flushAdoptedDefaultRouteToast,
  pendingAdoptedDefaultRouteName,
  queueAdoptedDefaultRoute,
  resetAdoptedDefaultRouteToast
} from "./adopted-default-route-toast.ts"

test("从无到有 toast 走 i18n 显示名，升级不弹", () => {
  resetAdoptedDefaultRouteToast()
  assert.equal(
    interpolate(zhChat.adoptedDefaultRouteToast, { name: "Claude Code" }),
    "之后的新对话默认用「Claude Code」，可在设置里改。"
  )
  assert.equal(
    adoptedDefaultRouteToastMessage("Claude Code", (path, vars) =>
      interpolate(zhChat.adoptedDefaultRouteToast, vars)
    ),
    "之后的新对话默认用「Claude Code」，可在设置里改。"
  )
  assert.equal(
    interpolate(enChat.adoptedDefaultRouteToast, { name: "DeepSeek · V3" }),
    "New chats will use “DeepSeek · V3” by default. You can change this in Settings."
  )
  assert.equal(consumeAdoptedHint("Claude Code"), "Claude Code")
  assert.equal(consumeAdoptedHint("Claude Code"), undefined)
  assert.equal(consumeAdoptedHint(undefined), undefined)
})

test("hint 先入队，renderer 挂上再 toast，同名只一次", () => {
  resetAdoptedDefaultRouteToast()
  queueAdoptedDefaultRoute("Claude Code")
  assert.equal(pendingAdoptedDefaultRouteName(), "Claude Code")
  assert.equal(consumeAdoptedHint("Claude Code"), undefined)
  queueAdoptedDefaultRoute("Claude Code")
  assert.equal(pendingAdoptedDefaultRouteName(), "Claude Code")
  flushAdoptedDefaultRouteToast()
  assert.equal(pendingAdoptedDefaultRouteName(), undefined)
})

test("toast 走统一 showAppToast，等 mount + rAF，不改时长、不带动作", () => {
  const hook = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "use-chat-readiness.ts"), "utf8")
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "adopted-default-route-toast.ts"),
    "utf8"
  )
  assert.match(hook, /queueAdoptedDefaultRoute/)
  assert.match(hook, /markAdoptToastRendererReady/)
  assert.doesNotMatch(hook, /notifyAdoptedDefaultRoute/)
  assert.match(src, /showAppToast/)
  assert.match(src, /requestAnimationFrame/)
  assert.match(src, /chat\.adoptedDefaultRouteToast/)
  assert.doesNotMatch(src, /duration:/)
  assert.doesNotMatch(src, /tone:\s*"error"/)
  assert.doesNotMatch(src, /action:/)
})
