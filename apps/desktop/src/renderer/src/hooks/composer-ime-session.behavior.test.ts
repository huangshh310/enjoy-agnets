/**
 * luna P1 #167：组字中切会话（Alt+Left / 侧栏，同一条 sessionId 变化）不得把旧会话组字漏进新会话。
 * 行为对齐 use-composer-ime.ts 的 sessionId effect + compositionend 守卫（不启 Enjoy / 不跑 e2e）。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { afterEach, test } from "node:test"
import {
  setComposerComposing,
  shouldCommitCompositionToSession,
  shouldResetShownOnSessionChange
} from "./composer-ime.ts"

afterEach(() => {
  setComposerComposing(false)
})

/**
 * 模拟 hook 在「组字 → 切会话 → compositionend」上的状态机（与 use-composer-ime 同序）：
 * - compositionstart 记下 sessionId
 * - sessionId 一变：清 composing、shown 对齐新会话草稿（不 early-return）
 * - compositionend：仅当仍在开始组字的会话才 onChange
 */
function simulateImeAcrossSessions(opts: {
  draftA: string
  draftB: string
  composingText: string
}) {
  const drafts: Record<string, string> = { ses_a: opts.draftA, ses_b: opts.draftB }
  let sessionId = "ses_a"
  let shown = opts.draftA
  let composing = false
  let compositionSessionId: string | null = null
  const onChangeCalls: Array<{ sessionId: string; text: string }> = []

  function onChange(text: string) {
    drafts[sessionId] = text
    onChangeCalls.push({ sessionId, text })
  }

  function compositionStart() {
    composing = true
    setComposerComposing(true)
    compositionSessionId = sessionId
  }

  function compositionUpdate(text: string) {
    shown = text
  }

  /** Alt+Left 与侧栏点击都只改 store.sessionId，hook 同一条 effect。 */
  function switchSession(nextId: string) {
    if (sessionId === nextId) return
    sessionId = nextId
    if (composing) {
      composing = false
      setComposerComposing(false)
      // 保留 compositionSessionId，供 compositionend 判断已切走
    }
    const next = drafts[nextId] ?? ""
    if (shouldResetShownOnSessionChange(shown, next)) shown = next
  }

  function compositionEnd(typed: string) {
    const startedIn = compositionSessionId
    compositionSessionId = null
    composing = false
    setComposerComposing(false)
    if (!shouldCommitCompositionToSession(startedIn, sessionId)) {
      shown = drafts[sessionId] ?? ""
      return
    }
    shown = typed
    onChange(typed)
  }

  return {
    get shown() {
      return shown
    },
    get drafts() {
      return { ...drafts }
    },
    get onChangeCalls() {
      return [...onChangeCalls]
    },
    get composing() {
      return composing
    },
    compositionStart,
    compositionUpdate,
    switchSession,
    compositionEnd
  }
}

test("组字中切到 B（Alt+Left / 侧栏同一 sessionId 路径）：B 的 shown 是 B 草稿，不是 A 的组字", () => {
  // 组字中 shouldResetShownOnSessionChange 也必须为 true（旧实现 composing 时 early-return false → 本例必挂）
  setComposerComposing(true)
  assert.equal(
    shouldResetShownOnSessionChange("alt", "B own"),
    true,
    "组字中切会话也要对齐新会话稿"
  )

  const sim = simulateImeAcrossSessions({ draftA: "A committed", draftB: "B own", composingText: "alt" })
  sim.compositionStart()
  sim.compositionUpdate("alt")
  assert.equal(sim.shown, "alt")
  sim.switchSession("ses_b")
  assert.equal(sim.shown, "B own")
  assert.equal(sim.composing, false)
  assert.equal(sim.drafts.ses_b, "B own")
  assert.equal(sim.drafts.ses_a, "A committed")
})

test("切走后的 compositionend 不 onChange，不覆盖 B 的草稿", () => {
  assert.equal(shouldCommitCompositionToSession("ses_a", "ses_b"), false)
  assert.equal(shouldCommitCompositionToSession("ses_a", "ses_a"), true)

  const sim = simulateImeAcrossSessions({ draftA: "A committed", draftB: "B own", composingText: "alt" })
  sim.compositionStart()
  sim.compositionUpdate("alt")
  sim.switchSession("ses_b")
  sim.compositionEnd("alt")
  assert.deepEqual(sim.onChangeCalls, [])
  assert.equal(sim.drafts.ses_b, "B own")
  assert.equal(sim.shown, "B own")
})

test("回到 A：已提交正文仍在；未提交组字未写入 A", () => {
  const sim = simulateImeAcrossSessions({ draftA: "A committed", draftB: "B own", composingText: "alt" })
  sim.compositionStart()
  sim.compositionUpdate("alt")
  sim.switchSession("ses_b")
  sim.compositionEnd("alt")
  sim.switchSession("ses_a")
  assert.equal(sim.shown, "A committed")
  assert.equal(sim.drafts.ses_a, "A committed")
  assert.equal(sim.drafts.ses_b, "B own")
})

test("同会话 compositionend 仍写入（回归：正常组字提交）", () => {
  const sim = simulateImeAcrossSessions({ draftA: "A committed", draftB: "B own", composingText: "你好" })
  sim.compositionStart()
  sim.compositionUpdate("你好")
  sim.compositionEnd("你好")
  assert.deepEqual(sim.onChangeCalls, [{ sessionId: "ses_a", text: "你好" }])
  assert.equal(sim.drafts.ses_a, "你好")
  assert.equal(sim.shown, "你好")
})

test("接线：use-composer-ime 组字起记 session、切会话清 composing、end 有 session 守卫", () => {
  const src = readFileSync(
    new URL("../components/ai-chat/composer/mentions/use-composer-ime.ts", import.meta.url),
    "utf8"
  )
  assert.match(src, /compositionSessionIdRef/)
  assert.match(src, /shouldCommitCompositionToSession/)
  // 切会话不再「组字中 return」；清 composing 后对齐新稿
  const effect = src.slice(src.indexOf("lastSessionId.current === sessionId"), src.indexOf("onCompositionStart"))
  assert.doesNotMatch(effect, /if \(composingRef\.current\) return/)
  assert.match(effect, /setComposerComposing\(false\)/)
})
