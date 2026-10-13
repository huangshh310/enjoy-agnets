import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  isComposerComposing,
  setComposerComposing,
  shouldClearShownOnPreparing,
  shownAfterCompositionOnPreparing,
  shouldIgnoreComposerEnter
} from "./composer-ime"
import { flushComposerDomToStore, syncComposerDom } from "./composer-dom"

test("首发正在准备不得清空已键入，只有建会话窗才擦 shown", () => {
  assert.equal(
    shouldClearShownOnPreparing({
      preparing: true,
      wasPreparing: false,
      value: "",
      createPending: false
    }),
    false
  )
  assert.equal(
    shouldClearShownOnPreparing({
      preparing: true,
      wasPreparing: false,
      value: "hello",
      createPending: true
    }),
    false
  )
  assert.equal(
    shouldClearShownOnPreparing({
      preparing: true,
      wasPreparing: false,
      value: "",
      createPending: true
    }),
    true
  )
})

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
  assert.match(ime, /shouldClearShownOnPreparing/)
  assert.match(ime, /isNewSessionCreatePending/)
})

test("jojo ②：中文冷启动——组字中 / 没交出去的整句，建会话一出「正在准备…」也不擦", () => {
  const base = { preparing: true, wasPreparing: false, value: "", createPending: true }
  // 组字中：store 为空是因为 IME 还没提交，不是用户没打字。
  assert.equal(shouldClearShownOnPreparing({ ...base, composing: true, shown: "你好世界" }), false)
  // 已上屏但还没按 Enter：整句不得擦。
  assert.equal(shouldClearShownOnPreparing({ ...base, shown: "帮我写一个排序函数", submitted: "" }), false)
  // 正是刚 Enter 交出去的那句：照旧可擦。
  assert.equal(shouldClearShownOnPreparing({ ...base, shown: "你好", submitted: "你好" }), true)
})

test("leo soft：组字中带真实 submitted 也不擦（去掉 composing 守卫此例必挂）", () => {
  assert.equal(
    shouldClearShownOnPreparing({
      preparing: true,
      wasPreparing: false,
      value: "",
      createPending: true,
      composing: true,
      shown: "你好",
      submitted: "你好"
    }),
    false
  )
  // 对照：同样输入不在组字就该擦。
  assert.equal(
    shouldClearShownOnPreparing({
      preparing: true,
      wasPreparing: false,
      value: "",
      createPending: true,
      composing: false,
      shown: "你好",
      submitted: "你好"
    }),
    true
  )
})

test("leo soft：组字结束补查——旧句擦掉、旧句+新字只留新字、没交出去的不动", () => {
  const base = { preparing: true, createPending: true, composing: false, submitted: "你好" }
  assert.equal(shownAfterCompositionOnPreparing({ ...base, shown: "你好" }), "")
  assert.equal(shownAfterCompositionOnPreparing({ ...base, shown: "你好世界" }), "世界")
  assert.equal(shownAfterCompositionOnPreparing({ ...base, shown: "别的话" }), null)
  assert.equal(shownAfterCompositionOnPreparing({ ...base, preparing: false, shown: "你好" }), null)
  assert.equal(shownAfterCompositionOnPreparing({ ...base, createPending: false, shown: "你好" }), null)
  assert.equal(shownAfterCompositionOnPreparing({ ...base, composing: true, shown: "你好" }), null)
})

test("leo soft：onCompositionEnd 接了组字结束补查", () => {
  const src = readFileSync(
    new URL("../components/ai-chat/composer/mentions/use-composer-ime.ts", import.meta.url),
    "utf8"
  )
  const end = src.slice(src.indexOf("onCompositionEnd("))
  assert.match(end.slice(0, end.indexOf("onValueChange(")), /shownAfterCompositionOnPreparing\(/)
})
