import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  isComposerComposing,
  setComposerComposing,
  shouldIgnoreComposerEnter
} from "./composer-ime"
import { flushComposerDomToStore, syncComposerDom } from "./composer-dom"

test("组字中 Enter / keyCode 229 不发送", () => {
  setComposerComposing(false)
  assert.equal(shouldIgnoreComposerEnter({ key: "Enter" }), false)
  assert.equal(shouldIgnoreComposerEnter({ key: "Enter", isComposing: true }), true)
  assert.equal(shouldIgnoreComposerEnter({ key: "Enter", keyCode: 229 }), true)
  assert.equal(
    shouldIgnoreComposerEnter({ key: "Enter", nativeEvent: { isComposing: true, keyCode: 229 } }),
    true
  )
  setComposerComposing(true)
  assert.equal(shouldIgnoreComposerEnter({ key: "Enter" }), true)
  setComposerComposing(false)
})

test("建会话锁定时 sync 不写回 DOM", () => {
  const lock = readFileSync(new URL("./composer-sync-lock.ts", import.meta.url), "utf8")
  const create = readFileSync(new URL("./new-session-create.ts", import.meta.url), "utf8")
  const life = readFileSync(new URL("./session-lifecycle.ts", import.meta.url), "utf8")
  assert.match(lock, /isComposerWritebackHeld/)
  assert.match(create, /setComposerWritebackHeld\(false\)/)
  assert.match(life, /setComposerWritebackHeld\(false\)/)
})

test("组字中 flush / sync 不改 store 也不写回 DOM", () => {
  setComposerComposing(true)
  assert.equal(isComposerComposing(), true)
  const before = flushComposerDomToStore()
  syncComposerDom("整一")
  assert.equal(flushComposerDomToStore(), before)
  setComposerComposing(false)
})

test("输入框与 flush 接线守门", () => {
  const input = readFileSync(
    new URL("../components/ai-chat/composer/mentions/composer-input.tsx", import.meta.url),
    "utf8"
  )
  const dom = readFileSync(new URL("./composer-dom.ts", import.meta.url), "utf8")
  assert.match(input, /shouldIgnoreComposerEnter/)
  assert.match(input, /onCompositionStart/)
  assert.match(input, /onCompositionEnd/)
  assert.match(dom, /if \(isComposerComposing\(\)\) return/)
  assert.match(dom, /shouldHoldComposerStoreSync/)
  assert.match(dom, /readComposerDomText/)
  const ime = readFileSync(
    new URL("../components/ai-chat/composer/mentions/use-composer-ime.ts", import.meta.url),
    "utf8"
  )
  assert.match(ime, /shouldHoldComposerStoreSync\(\)/)
})
