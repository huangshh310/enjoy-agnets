/**
 * P0-E 文案夹具：与 p0-e-cli-outdated.html 同文。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { zhSettings } from "../../../../i18n/catalogs/zh/settings.ts"
import { zhChat } from "../../../../i18n/catalogs/zh/chat.ts"
import {
  cliCompatOf,
  formatOutdatedSecondary,
  formatTrustOutdated,
  isCliOutdated,
  outdatedAssistantStatus
} from "./cli-outdated-copy.ts"

const tools = zhSettings.agentTools

function t(path: string, vars?: Record<string, string | number>): string {
  if (path.startsWith("settings.agentTools.")) {
    const key = path.replace("settings.agentTools.", "") as keyof typeof tools
    const template = tools[key]
    if (typeof template !== "string") return path
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? ""))
  }
  return path
}

const outdatedCursor = {
  id: "cursor" as const,
  version: "1.2",
  requiredVersion: "1.5",
  authAccount: { loggedIn: true as const }
}

test("已登录但低于要求：outdated，不是 ready", () => {
  assert.equal(isCliOutdated(outdatedCursor), true)
  assert.equal(cliCompatOf(outdatedCursor).kind, "outdated")
  assert.equal(outdatedAssistantStatus(t).label, "需更新")
})

test("次行例外与升级后对照", () => {
  const view = cliCompatOf(outdatedCursor)
  assert.equal(formatOutdatedSecondary(view, t), "需更新 · v1.2（要 ≥1.5）")
  const upgraded = cliCompatOf({ ...outdatedCursor, version: "1.5" })
  assert.equal(upgraded.kind, "ok")
})

test("抽屉健康行与预览同文", () => {
  assert.equal(formatTrustOutdated(cliCompatOf(outdatedCursor), t), "版本过旧 · 当前 v1.2 · 需要 ≥1.5")
  assert.equal(zhChat.needCliOutdatedTitle, "请先更新本机助手")
  assert.equal(zhChat.needCliOutdatedHint, "当前 {current}，需要 ≥{required}。更新后再发送。")
})

test("缺版本不假警告", () => {
  assert.equal(
    isCliOutdated({ id: "cursor", version: null, requiredVersion: "1.5" }),
    false
  )
})
