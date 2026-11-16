/**
 * E1 M3：Esc 停止判定 + 占位句补「Esc 停止」（jojo ⑦：只在有一轮在跑时补）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { shouldEscapeStopRun, withEscStopHint } from "./composer-escape-stop.ts"
import { composerPlaceholderKey } from "./composer-placeholder-state.ts"
import { zhChat } from "../i18n/catalogs/zh/chat.ts"
import { enChat } from "../i18n/catalogs/en/chat.ts"

const base = { key: "Escape", running: true, composing: false, defaultPrevented: false, modified: false }

test("运行中输入框按 Esc → 停这一轮", () => {
  assert.equal(shouldEscapeStopRun(base), true)
})

test("没在跑 / IME 组字中 / 已被面板吃掉 / 带修饰键 / 别的键：都不停", () => {
  assert.equal(shouldEscapeStopRun({ ...base, running: false }), false)
  assert.equal(shouldEscapeStopRun({ ...base, composing: true }), false)
  assert.equal(shouldEscapeStopRun({ ...base, defaultPrevented: true }), false)
  assert.equal(shouldEscapeStopRun({ ...base, modified: true }), false)
  assert.equal(shouldEscapeStopRun({ ...base, key: "Enter" }), false)
})

test("运行中占位句补「Esc 停止」：普通运行句与排队暂停句都补（zh / en）", () => {
  const zhRun = withEscStopHint(zhChat.placeholderRunning, true, zhChat.placeholderEscStop)
  assert.equal(zhRun, "任务进行中。Enter 排队，{mod}+Enter 马上发给它，Esc 停止。")
  const zhPaused = withEscStopHint(zhChat.placeholderRunningPaused, true, zhChat.placeholderEscStop)
  assert.match(zhPaused, /^排队已暂停：/)
  assert.match(zhPaused, /，Esc 停止。$/)
  assert.match(withEscStopHint(enChat.placeholderRunning, true, enChat.placeholderEscStop), /, Esc stops\.$/)
  assert.match(withEscStopHint(enChat.placeholderRunningPaused, true, enChat.placeholderEscStop), /, Esc stops\.$/)
})

test("jojo ⑦：没有一轮在跑（只是排队暂停）时不补 Esc —— 走默认句，按了也没东西可停", () => {
  assert.equal(composerPlaceholderKey({ running: false, queuePaused: true }), "chat.placeholder")
  const idle = withEscStopHint(zhChat.placeholder, false, zhChat.placeholderEscStop)
  assert.equal(idle, zhChat.placeholder)
  assert.doesNotMatch(idle, /Esc/)
  assert.equal(withEscStopHint(zhChat.placeholderRunningPaused, false, zhChat.placeholderEscStop), zhChat.placeholderRunningPaused)
})

test("接线：Esc 排在 @ 面板 / 历史召回之后、Enter 之前；只调 onStop，不碰草稿", async () => {
  const { readFileSync } = await import("node:fs")
  const input = readFileSync(new URL("../components/ai-chat/composer/mentions/composer-input.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n")
  const mention = input.indexOf("mentions.handleKeyDown(event)")
  const recall = input.indexOf("handleRecall(event)")
  const esc = input.indexOf("shouldEscapeStopRun(")
  const enter = input.indexOf('if (event.key !== "Enter" || event.shiftKey) return')
  assert.ok(mention > 0 && recall > mention && esc > recall && enter > esc, JSON.stringify({ mention, recall, esc, enter }))
  const block = input.slice(esc, input.indexOf("return\n    }", esc))
  assert.match(block, /onStop\(\)/)
  assert.doesNotMatch(block, /onChange\(|setComposer|clearComposerDraftChips/)
})

test("接线：并排时停止在排队左侧、testid 不变；并排收起过程 chip", async () => {
  const { readFileSync } = await import("node:fs")
  const split = readFileSync(new URL("../components/ai-chat/composer/runtime-interact/composer-send-split.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n")
  const pair = split.slice(split.indexOf("buttons.paired"), split.indexOf("if (buttons.stop)"))
  assert.ok(pair.indexOf('data-testid="composer-stop"') < pair.indexOf("<SendButton"))
  assert.match(pair, /gap-2/)
  assert.match(pair, /t\("chat\.stopRunEsc"\)/)
  const footer = readFileSync(new URL("../components/ai-chat/composer/composer-footer.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n")
  assert.match(footer, /showRunChip = running && !composerActionButtons\(running, hasDraft\)\.paired/)
})
