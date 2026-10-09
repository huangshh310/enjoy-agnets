import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { desktopEmptyStateExample } from "./desktop-empty-example.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"

const ROOT = dirname(fileURLToPath(import.meta.url))

test("名单空或没有真实 displayName 时不造应用", () => {
  assert.equal(desktopEmptyStateExample([]), null)
  assert.equal(desktopEmptyStateExample(undefined), null)
  assert.equal(desktopEmptyStateExample([{ displayName: "   " }]), null)
  assert.equal(desktopEmptyStateExample([{ displayName: "" }]), null)
})

test("只取名单里第一个真实应用名，不回落备忘录", () => {
  const example = desktopEmptyStateExample([
    { displayName: "  日历  " },
    { displayName: "备忘录" }
  ])
  assert.deepEqual(example, { displayName: "日历" })
  assert.notEqual(example?.displayName, "备忘录")
})

test("空态 pill 吃真实名单，源码不写死应用名", () => {
  const pills = readFileSync(join(ROOT, "empty-state-pills.tsx"), "utf8")
  const example = readFileSync(join(ROOT, "desktop-empty-example.ts"), "utf8")
  assert.match(pills, /useDesktopMentionApps/)
  assert.match(pills, /desktopEmptyStateExample/)
  assert.match(pills, /empty-state-desktop-pill/)
  assert.doesNotMatch(pills, /备忘录|Notes|计算器|Calculator/)
  assert.doesNotMatch(example, /备忘录|Notes|com\.apple\.notes/)
  assert.match(zhChat.intentDesktopShort, /@\{app\} 帮我在 \{app\} 里/)
  assert.doesNotMatch(zhChat.intentDesktopShort, /备忘录/)
})
