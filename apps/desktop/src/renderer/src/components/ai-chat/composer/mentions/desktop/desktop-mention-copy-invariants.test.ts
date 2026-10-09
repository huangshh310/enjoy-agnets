/**
 * CU-P1-B 文案钉：@桌面，不要 @电脑；Explore 诚实句可见。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { enChat } from "../../../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../../../i18n/catalogs/zh/chat.ts"
import { DESKTOP_HOST_TOKEN } from "./constants.ts"

const tryPrompt = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../../../settings/tools/desktop/start-calculator-try.ts"),
  "utf8"
)

test("产品锁 token 是 @桌面，试一下不预填 @电脑", () => {
  assert.equal(DESKTOP_HOST_TOKEN, "桌面")
  assert.match(tryPrompt, /"@桌面 /)
  assert.doesNotMatch(tryPrompt, /@电脑/)
})

test("芯片与 kind 用人话「桌面」，不用电脑 / Computer", () => {
  assert.equal(zhChat.mentionKindDesktop, "桌面")
  assert.equal(zhChat.desktopChip, "桌面")
  assert.equal(enChat.mentionKindDesktop, "Desktop")
  assert.equal(enChat.desktopChip, "Desktop")
})

test("Explore 诚实主句是「需切换到执行」", () => {
  assert.equal(zhChat.desktopBiasExploreHonesty, "桌面控制需切换到执行")
  assert.equal(zhChat.surfaceDesktopInterceptTitle, "桌面控制需切换到执行")
  assert.equal(enChat.desktopBiasExploreHonesty, "Desktop control needs Execute")
  assert.equal(enChat.surfaceDesktopInterceptTitle, "Desktop control needs Execute")
})

test("无稳键隐藏始终允许，不写 pid 当键", () => {
  assert.equal(zhChat.mentionDesktopAlwaysHidden, "始终允许 · 隐藏")
  assert.match(zhChat.mentionDesktopUnstableHint, /仅进程号/)
  assert.equal(zhChat.mentionDesktopSheetHint, "这台电脑上能操控的应用")
  assert.doesNotMatch(zhChat.mentionDesktopSheetHint, /desktop_|不是插件店|NotInstalled|Registry/)
})
