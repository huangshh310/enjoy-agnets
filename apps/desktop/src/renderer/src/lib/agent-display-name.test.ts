import assert from "node:assert/strict"
import { test } from "node:test"
import {
  DISPLAY_NAME_MAX,
  engineTrueNameTitle,
  inboxIdentityTitle,
  nextDisplayNameMap,
  normalizeDisplayName,
  resolveEngineFace
} from "./agent-display-name.ts"

test("空显示名回退品牌名，不用未命名", () => {
  assert.equal(resolveEngineFace({ displayName: "", brandLabel: "Claude Code" }), "Claude Code")
  assert.equal(resolveEngineFace({ displayName: "   ", brandLabel: "Claude Code" }), "Claude Code")
  assert.equal(resolveEngineFace({ displayName: "未命名", brandLabel: "Claude Code" }), "Claude Code")
  assert.equal(resolveEngineFace({ displayName: "代码审", brandLabel: "Claude Code" }), "代码审")
  assert.ok(!resolveEngineFace({ displayName: "", brandLabel: "Claude" }).includes("未命名"))
})

test("normalize 压空白并截断", () => {
  assert.equal(normalizeDisplayName("  代码  审  "), "代码 审")
  assert.equal(normalizeDisplayName("x".repeat(DISPLAY_NAME_MAX + 8)).length, DISPLAY_NAME_MAX)
})

test("悬停真名格式是品牌 · 真名", () => {
  assert.equal(engineTrueNameTitle("Claude", "真名"), "Claude · 真名")
  assert.equal(engineTrueNameTitle("Claude Code", "真名"), "Claude Code · 真名")
})

test("Inbox 行是人话 · 会话题", () => {
  assert.equal(inboxIdentityTitle("代码审", "拆登录页"), "代码审 · 拆登录页")
  assert.equal(inboxIdentityTitle("Claude", "拆登录页"), "Claude · 拆登录页")
  assert.equal(inboxIdentityTitle("代码审", ""), "代码审")
})

test("清空显示名从 map 删键", () => {
  const next = nextDisplayNameMap({ claude: "代码审", grok: "前端搭档" }, "claude", "  ")
  assert.deepEqual(next, { grok: "前端搭档" })
  assert.deepEqual(nextDisplayNameMap({}, "claude", "代码审"), { claude: "代码审" })
})
