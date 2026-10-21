/**
 * mike P3（#163 巡检 61）：暂停中来了审批卡，输入框占位符不能再说「任务进行中。Enter 排队…」像是会自己发。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { composerPlaceholderKey } from "./composer-placeholder-state.ts"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { enChat } from "../i18n/catalogs/en/chat.ts"

test("placeholder state：没在跑 → 默认句；在跑没停 → 原句；在跑且队列停着 → 暂停句", () => {
  assert.equal(composerPlaceholderKey({ running: false, queuePaused: false }), "chat.placeholder")
  assert.equal(composerPlaceholderKey({ running: false, queuePaused: true }), "chat.placeholder")
  assert.equal(composerPlaceholderKey({ running: true, queuePaused: false }), "chat.placeholderRunning")
  assert.equal(composerPlaceholderKey({ running: true, queuePaused: true }), "chat.placeholderRunningPaused")
})

test("暂停句：说清 Enter 只排着、点「继续」才发；{mod}+Enter 照旧；中英都有", () => {
  const zh = (zhChat as Record<string, unknown>).placeholderRunningPaused as string
  const en = (enChat as Record<string, unknown>).placeholderRunningPaused as string
  assert.match(zh, /已暂停/)
  assert.match(zh, /「继续」/)
  assert.match(zh, /\{mod\}\+Enter/)
  assert.doesNotMatch(zh, /任务进行中/)
  assert.match(en, /paused/i)
  assert.match(en, /Continue/)
  assert.match(en, /\{mod\}\+Enter/)
  // 原句不动（user-copy-invariants 锁着）。
  assert.equal(zhChat.placeholderRunning, "任务进行中。Enter 排队，{mod}+Enter 马上发给它…")
})

test("接线：输入框按 composerPlaceholderKey 选句，打回提示只在没在跑时用", () => {
  const input = readFileSync(new URL("../components/ai-chat/composer/mentions/composer-input.tsx", import.meta.url), "utf8")
  assert.match(input, /const placeholderKey = composerPlaceholderKey\(\{ running, queuePaused \}\)/)
  assert.match(input, /placeholderKey === "chat\.placeholder"\s+\? \(placeholderHint \?\? t\("chat\.placeholder"\)\)/)
})
