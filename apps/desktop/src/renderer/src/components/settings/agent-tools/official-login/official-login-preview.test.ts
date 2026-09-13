/**
 * CLI-A 预览锁：四态文案必须与 cli-a-official-login.html 同文。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"

const dir = dirname(fileURLToPath(import.meta.url))

/** 从本文件向上找到仓根预览，避免相对层级数错。 */
function readPreviewHtml(): string {
  let cursor = dir
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(cursor, "design/previews/cli-a-official-login.html")
    if (existsSync(candidate)) return readFileSync(candidate, "utf8")
    cursor = join(cursor, "..")
  }
  throw new Error("cli-a-official-login.html 必须在仓内（PR #23 / a0ac8f5）")
}

const preview = readPreviewHtml()

test("预览真源仍在仓内，且四态样例行在", () => {
  assert.ok(preview.includes("官方登录 · 检测中"))
  assert.ok(preview.includes("官方登录 · 授权中"))
  assert.ok(preview.includes("官方登录 · 已登录"))
  assert.ok(preview.includes("官方登录 · 失败"))
  assert.ok(preview.includes("检测中…"))
  assert.ok(preview.includes("等待授权…"))
  assert.ok(preview.includes("重试授权"))
  assert.ok(preview.includes("打开授权"))
  assert.ok(preview.includes("未登录上：授权超时，可重试或换浏览器完成"))
})

test("中文词表与预览四态同文", () => {
  const tools = zhSettings.agentTools
  assert.equal(tools.listOfficialCheck, "检测中")
  assert.equal(tools.listOfficialAuth, "授权中")
  assert.equal(tools.listOfficialFail, "失败")
  assert.equal(tools.officialCheckingAction, "检测中…")
  assert.equal(tools.officialWaitAuth, "等待授权…")
  assert.equal(tools.officialRetryAuth, "重试授权")
  assert.equal(tools.officialOpenAuth, "打开授权")
  assert.equal(tools.officialModeTitle, "官方登录 · 用本机账号")
  assert.equal(tools.officialNoVaultHint, "不提供供应商档案绑定。")
  assert.equal(tools.loginAuthorizingStatus, "打开授权中")
  assert.equal(tools.loginFailedStatus, "登录失败")
  assert.equal(tools.loginAuthorizingHint, "已打开授权页，完成前不算已登录")
  assert.equal(tools.loginFailPrefix, "未登录上：{reason}")
  assert.equal(tools.loginFailTimeout, "授权超时，可重试或换浏览器完成")
  assert.equal(zhChat.agentInspecting, "检测账号中…")
  assert.equal(zhChat.needCliInspectingHint, "检测结束前不算就绪。")
  assert.equal(zhChat.needCliAuthorizeTitle, "先完成官方登录")
  assert.equal(zhChat.needCliAuthorizeHint, "已打开授权也不算成功。")
  assert.equal(zhChat.needCliLoginFailTitle, "登录没成功")
})

test("动力源官方登录各态对齐统一轻胶囊，未登录不伪造就绪绿灯", () => {
  const src = readFileSync(join(dir, "../power-source/power-source-capsule.tsx"), "utf8")
  assert.ok(src.includes('status === "in"'))
  assert.ok(src.includes("bg-notification-success-foreground"))
  assert.ok(src.includes("powerOfficialDirect"))
  assert.ok(src.includes("powerOfficialOut"))
})

test("密表主引擎轻标沿用 dense-p0「当前」，不改成预览示意「当前引擎」", () => {
  assert.equal(zhSettings.agentTools.listCurrent, "当前")
  assert.notEqual(zhSettings.agentTools.listCurrent, "当前引擎")
})
