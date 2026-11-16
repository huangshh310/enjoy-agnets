/**
 * luna C1b 设计口径：停止没落定时，重新生成 / 编辑（含「保存并重新发送」）/ 重试 / Todo「继续」
 * 和发送锁共用同一个按会话判断（useStopLocked ↔ isStopLocked），可见但置灰（aria-disabled，不隐藏），
 * tooltip「停干净后再试」/ "Try again once it stops."；点击处再挡一层。真渲染（hover 出 tooltip）在 e2e/e1-stop-entries-locked.spec.ts。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { en } from "../../../i18n/catalogs/en/index.ts"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { translate } from "../../../i18n/lookup.ts"

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n")

test("tooltip 文案定稿：zh「停干净后再试」/ en「Try again once it stops.」", () => {
  assert.equal(translate(zh, "chat.stopLockedTryLater"), "停干净后再试")
  assert.equal(translate(en, "chat.stopLockedTryLater"), "Try again once it stops.")
})

test("useStopLocked 与发送锁 isStopLocked 同一个判断（按会话、收尾条目在即锁）", () => {
  const s = src("../../../stores/stop-settle.ts")
  assert.match(s, /export function isStopLocked\(sessionId[^)]*\): boolean \{\n\s*return Boolean\(sessionId && useStopSettleStore\.getState\(\)\.bySession\[sessionId\]\)/)
  assert.match(s, /export function useStopLocked\(sessionId[^)]*\): boolean \{\n\s*return useStopSettleStore\(\(state\) => Boolean\(sessionId && state\.bySession\[sessionId\]\)\)/)
})

test("重新生成：锁住时可见、aria-disabled、tooltip 换成「停干净后再试」，点了 / 确认都不跑", () => {
  const s = src("./turns/assistant-actions.tsx")
  assert.match(s, /const stopLocked = useStopLocked\(/)
  assert.match(s, /tooltip=\{stopLocked \? t\("chat\.stopLockedTryLater"\)/)
  assert.match(s, /aria-disabled=\{stopLocked \|\| undefined\}/)
  assert.match(s, /if \(stopLocked\) return/)
  assert.match(s, /if \(!stopLocked\) regenerate\(\)/)
})

test("编辑：锁住时铅笔仍在（不随 stopLocked 隐藏）、置灰 + tooltip；「保存并重新发送」同样置灰 + tooltip", () => {
  const s = src("./turns/user-turn.tsx")
  assert.match(s, /tooltip=\{stopLocked \? t\("chat\.stopLockedTryLater"\) : t\("chat\.editMessage"\)\}/)
  assert.match(s, /if \(!stopLocked\) setIsEditing\(true\)/)
  assert.doesNotMatch(s, /!stopLocked \? \(\s*<MessageAction/, "不隐藏")
  assert.match(s, /<StopLockedTooltip locked=\{stopLocked\} hint=\{t\("chat\.stopLockedTryLater"\)\}>\s*<Button[\s\S]*?aria-disabled=\{stopLocked \|\| undefined\}[\s\S]*?chat\.saveResend/)
  assert.match(s, /running \|\| stopLocked\) return/)
})

test("重试（红卡）：锁住时置灰 + tooltip；handleRetry 先挡，不清红卡", () => {
  const s = src("./thread-error-banner.tsx")
  assert.match(s, /<StopLockedTooltip locked=\{stopLocked\} hint=\{t\("chat\.stopLockedTryLater"\)\}>\s*<button[\s\S]*?data-testid="thread-error-retry"[\s\S]*?aria-disabled=\{stopLocked \|\| undefined\}/)
  assert.match(s, /function handleRetry\(\) \{\n\s*if \(isStopLocked\(sessionId\)\) return/)
})

test("Todo「继续」：Dock 锁住时传 continueDisabledHint；ContinueButton 有提示即 aria-disabled、tooltip、点了不动", () => {
  const dock = src("../composer/composer-todo-dock.tsx")
  assert.match(dock, /continueDisabledHint=\{stopLocked \? t\("chat\.stopLockedTryLater"\) : undefined\}/)
  const btn = src("../../../../../../../../packages/ui/components/ai-elements/task-list-helpers.tsx")
  assert.match(btn, /aria-disabled=\{locked \|\| undefined\}/)
  assert.match(btn, /if \(!locked\) onContinue\(\)/)
  assert.match(btn, /<TooltipContent>\s*<p>\{disabledHint\}<\/p>/)
  for (const f of ["task-list.tsx", "task-list-dock.tsx"]) {
    assert.match(src(`../../../../../../../../packages/ui/components/ai-elements/${f}`), /<ContinueButton onContinue=\{onContinue\} disabledHint=\{continueDisabledHint\} \/>/)
  }
})
