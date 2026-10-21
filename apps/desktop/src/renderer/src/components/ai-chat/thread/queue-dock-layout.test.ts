/**
 * mike P3（#163 巡检）：紧凑排队区——点开后底下藏着的行要有「还有 N 条」；拉矮到 ≤600 重新折起；
 * 停着 + 失败卡时对话区保底（「再发一次」整颗露出）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { keepThreadForFailureCard, refoldOnShort, rowsHiddenBelow } from "./queue-dock-layout.ts"
import { PREVIOUS_STILL_PREPARING } from "../../../lib/usage/classify-thread-error.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8")

test("5 条排队、区内只露 3 条：底下藏 2 条（被裁一半的也算），1px 内的取整误差不算", () => {
  // 区底 300；行底 220 / 254 / 288 都在里面，322 / 356 被裁掉。
  assert.equal(rowsHiddenBelow([220, 254, 288, 322, 356], 300), 2)
  assert.equal(rowsHiddenBelow([220, 254, 301], 300), 0, "超出 ≤1px 是取整误差")
  assert.equal(rowsHiddenBelow([220, 254, 310], 300), 1, "露一半也算藏着")
  assert.equal(rowsHiddenBelow([], 300), 0)
})

test("「还有 N 条」复用 runtimeQueueMore 文案（中英）", () => {
  assert.equal(zhChat.runtimeQueueMore, "还有 {n} 条")
  assert.match(enChat.runtimeQueueMore, /\{n\}/)
})

test("fold-at-height：从高变矮（跨过 600 线）的那一刻收起；本来就矮时用户点开不被收回去；变高不动", () => {
  assert.equal(refoldOnShort(false, true), true)
  assert.equal(refoldOnShort(true, true), false)
  assert.equal(refoldOnShort(true, false), false)
  assert.equal(refoldOnShort(false, false), false)
})

test("停着 + 对话里有失败卡才给对话区保底；输入框帽檐的「上一条还在准备」不算；没停不算", () => {
  assert.equal(keepThreadForFailureCard(true, "PROVIDER_UNREACHABLE"), true)
  assert.equal(keepThreadForFailureCard(true, null), false)
  assert.equal(keepThreadForFailureCard(true, ""), false)
  assert.equal(keepThreadForFailureCard(true, PREVIOUS_STILL_PREPARING), false)
  assert.equal(keepThreadForFailureCard(false, "PROVIDER_UNREACHABLE"), false)
})

test("接线：排队区用 refoldOnShort / rowsHiddenBelow，挂 data-keep-thread；chat-stage 按它给对话区 min-h，且盖过 min-h-0", () => {
  const dock = src("./queued-followups.tsx")
  assert.match(dock, /refoldOnShort\(wasShort\.current, short\)\) setExpanded\(false\)/)
  assert.match(dock, /data-keep-thread=\{keepThread \? "true" : undefined\}/)
  assert.match(dock, /testId="queued-hidden-below"/)
  assert.match(dock, /label=\{t\("chat\.runtimeQueueMore", \{ n: hiddenBelow \}\)\}/)
  // 小胶囊靠左、不铺满：区挤到一行高时不盖行右侧的按钮（queue-sendnow-approval 733×480）。
  assert.match(dock, /sticky bottom-0 z-10 w-auto max-w-\[45%\] self-start/)
  const stage = src("../../app-shell/chat/chat-stage.tsx")
  const base = stage.indexOf("[&:has(>[data-testid=queued-followups-docked])>[data-thread-root]]:min-h-0")
  const keep = stage.indexOf("[&:has(>[data-testid=queued-followups-docked][data-keep-thread=true])>[data-thread-root]]:min-h-[4.5rem]")
  assert.ok(base >= 0 && keep > base, "保底那条在 min-h-0 后面、选择器多一个属性")
})
