/**
 * mike P3（#163 巡检 46–52）：「已收到，它下一步就会看到。」不再只能点 × 关——
 * 这一轮结束、又发了一句、满 30 秒都自己收；只收 steered，不动排队类提示。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { afterEach, test } from "node:test"
import { getRuntimeHint, setRuntimeHint } from "../followup-queue.ts"
import {
  clearSteeredHint,
  countUserMessages,
  STEERED_HINT_MAX_MS,
  steeredHintExpired,
  steeredHintRestarted
} from "./steered-hint-expiry.ts"

afterEach(() => setRuntimeHint(null))

const base = { hint: "steered" as const, running: true, userCountAtShow: 3, userCount: 3, elapsedMs: 1_000 }

test("hint dismissal：这一轮结束就收（「它下一步就会看到」已不成立）", () => {
  assert.equal(steeredHintExpired(base), false)
  assert.equal(steeredHintExpired({ ...base, running: false }), true)
})

test("hint dismissal：之后又发出了一句（用户消息比提示出现时多）就收", () => {
  assert.equal(steeredHintExpired({ ...base, userCount: 4 }), true)
})

test("hint dismissal：满 30 秒就收，差 1ms 不收", () => {
  assert.equal(STEERED_HINT_MAX_MS, 30_000)
  assert.equal(steeredHintExpired({ ...base, elapsedMs: 29_999 }), false)
  assert.equal(steeredHintExpired({ ...base, elapsedMs: 30_000 }), true)
})

test("只管 steered：排队类提示（queued / chipQueued / imageSteerQueued）不因为这一轮结束被收", () => {
  for (const hint of ["queued", "chipQueued", "imageSteerQueued", null] as const) {
    assert.equal(steeredHintExpired({ ...base, hint, running: false, elapsedMs: 99_999 }), false, String(hint))
  }
})

test("clearSteeredHint 只清 steered，不清随后换上的排队提示", () => {
  setRuntimeHint("steered", "s1")
  assert.equal(clearSteeredHint(), true)
  assert.equal(getRuntimeHint(), null)
  setRuntimeHint("queued", "s1")
  assert.equal(clearSteeredHint(), false)
  assert.equal(getRuntimeHint(), "queued")
})

test("leo soft-1：同一轮里连着插两句，第二句不把「已收到」收掉，而是重新计时", () => {
  const again = { hint: "steered" as const, running: true, userCountAtShow: 3, userCount: 4, runIdAtShow: "r1", runId: "r1" }
  assert.equal(steeredHintRestarted(again), true)
  // 没有新消息：不重开。
  assert.equal(steeredHintRestarted({ ...again, userCount: 3 }), false)
  // 换了一轮（runId 变了）：那是「之后又发出了一句」，照旧收。
  assert.equal(steeredHintRestarted({ ...again, runId: "r2" }), false)
  assert.equal(steeredHintExpired({ ...base, userCount: 4 }), true)
  // 这一轮已经结束 / 提示已不是 steered：不重开。
  assert.equal(steeredHintRestarted({ ...again, running: false }), false)
  assert.equal(steeredHintRestarted({ ...again, hint: "queued" }), false)
})

test("leo soft-1 接线：hook 先判重开（重记 + stamp 加一）再判收；30 秒计时器跟着 stamp 重开", () => {
  const hook = readFileSync(new URL("./use-steered-hint-expiry.ts", import.meta.url), "utf8")
  const restart = hook.indexOf("if (steeredHintRestarted(")
  const expire = hook.indexOf("steeredHintExpired({")
  assert.ok(restart > 0 && restart < expire, "重开要在收之前判")
  assert.match(hook, /setStamp\(\(n\) => n \+ 1\)/)
  assert.match(hook, /\}, \[hint, stamp\]\)/)
})

test("countUserMessages 只数用户消息", () => {
  assert.equal(countUserMessages([{ role: "user" }, { role: "assistant" }, { role: "user" }]), 2)
})

test("接线：输入框帽檐（始终挂着）调 useSteeredHintExpiry，在 if (!hint) return null 之前", () => {
  const rail = readFileSync(new URL("../../components/ai-chat/composer/runtime-interact/composer-followup-rail.tsx", import.meta.url), "utf8")
  const call = rail.indexOf("useSteeredHintExpiry(hint)")
  assert.ok(call > 0 && call < rail.indexOf("if (!hint) return null"))
  const hook = readFileSync(new URL("./use-steered-hint-expiry.ts", import.meta.url), "utf8")
  assert.match(hook, /window\.setTimeout\(\(\) => void clearSteeredHint\(\), STEERED_HINT_MAX_MS\)/)
})
