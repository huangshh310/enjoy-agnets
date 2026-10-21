/**
 * mike P3（jojo 巡检 patrol-211e3bbb-pr163）里原先等 #166 的三项：
 * 4 窄宽暂停行英文出错句不再折 4 行、9 失败卡 × 有 aria-label、12 停着又在跑时排队行按钮不说「马上发给它」。
 * tsx 不能当值导入，只扫源码；queuedSendNowKey 在纯 .ts 里直接测。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"

// queue-paused-view 依赖 @renderer 别名，静态 import 过不了 harness 守卫；和 followup-pause.behavior.test 一样动态取（register 钩子解析别名）。
const { queuedSendNowKey } = await import("./queue-paused-view.ts")
const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8")

test("12：排队行按钮——没在跑「立即发送」，在跑「马上发给它」，在跑但队列停着「单独发这条」", () => {
  assert.equal(queuedSendNowKey(false, false), "chat.runtimeSendNow")
  assert.equal(queuedSendNowKey(false, true), "chat.runtimeSendNow")
  assert.equal(queuedSendNowKey(true, false), "chat.runtimeSteerItem")
  assert.equal(queuedSendNowKey(true, true), "chat.runtimeSteerItemPaused")
  assert.equal((zhChat as any).runtimeSteerItemPaused, "单独发这条")
  assert.equal((enChat as any).runtimeSteerItemPaused, "Send this one now")
  assert.ok(!/[\u4e00-\u9fff]/.test((enChat as any).runtimeSteerItemPaused))
  const turn = src("./turns/queued-user-turn.tsx")
  assert.match(turn, /\{t\(queuedSendNowKey\(running, paused\)\)\}/)
  assert.ok(!/running \? t\("chat\.runtimeSteerItem"\)/.test(turn))
})

test("9：失败卡 / 发送闸白卡的 × 有 aria-label（和 title 同一句），图标 aria-hidden", () => {
  for (const file of ["./thread-send-gate-notice.tsx", "./thread-error-banner.tsx"]) {
    const s = src(file)
    assert.match(s, /title=\{t\("chat\.dismissError"\)\}\s+aria-label=\{t\("chat\.dismissError"\)\}/, file)
    assert.match(s, /<RiCloseLine className="size-4" aria-hidden \/>/, file)
  }
  assert.equal((zhChat as any).dismissError, "忽略并关闭错误提示")
  assert.equal((enChat as any).dismissError, "Dismiss error")
})

test("4：暂停行按容器宽排——窄（<35rem）时 wrap、原因最多 2 行带 title；宽时一行不截断", () => {
  const row = src("./queue-paused-row.tsx")
  assert.match(row, /data-testid="queue-paused-row" data-reason=\{reason\} className="@container min-w-0 shrink-0"/)
  assert.match(row, /flex min-w-0 flex-wrap items-center [^"]*@\[35rem\]:flex-nowrap/)
  assert.match(row, /className="flex min-w-0 flex-auto items-center gap-1\.5 @\[35rem\]:flex-1"/)
  assert.match(row, /title=\{view\.text\}/)
  assert.match(row, /"line-clamp-2 min-w-0 flex-1 text-caption-1-regular @\[35rem\]:line-clamp-none"/)
  assert.match(row, /className="ml-auto flex shrink-0 items-center gap-0\.5"/)
})
