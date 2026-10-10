/**
 * 崩溃回退不得把 React 英文堆栈摊给用户。
 */
import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { test } from "node:test"
import { enChat } from "../../../i18n/catalogs/en/chat.ts"
import { zhChat } from "../../../i18n/catalogs/zh/chat.ts"
import { CrashFallback } from "./crash-fallback.ts"
import {
  CRASH_FALLBACK_COPY,
  crashFallbackCopy,
  crashFallbackLeaksEnglishStack,
  userFacingCrashDetail
} from "./crash-fallback-copy.ts"

const REACT_CRASH = new Error(
  "Something went wrong! Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. Check the render method of `SourceRowBody`."
)

test("默认中文短句，不含 React 英文堆栈", () => {
  const copy = crashFallbackCopy("zh")
  assert.equal(copy.title, "这里出了点问题。")
  assert.equal(copy.reload, "重新加载")
  assert.equal(zhChat.crashFallbackTitle, copy.title)
  assert.equal(zhChat.crashFallbackReload, copy.reload)
  assert.equal(enChat.crashFallbackTitle, CRASH_FALLBACK_COPY.en.title)
  assert.equal(enChat.crashFallbackReload, CRASH_FALLBACK_COPY.en.reload)
  assert.equal(crashFallbackLeaksEnglishStack(copy.title), false)
  assert.equal(crashFallbackLeaksEnglishStack(copy.reload), false)
  assert.equal(crashFallbackLeaksEnglishStack(CRASH_FALLBACK_COPY.en.title), false)
})

test("默认面不回 error.message；开发者档才给 stack", () => {
  assert.equal(userFacingCrashDetail(REACT_CRASH, false), null)
  const dev = userFacingCrashDetail(REACT_CRASH, true)
  assert.ok(dev?.includes("Element type is invalid"))
})

test("CrashFallback 默认面渲染不含英文堆栈", () => {
  const html = renderToStaticMarkup(
    createElement(CrashFallback, {
      error: REACT_CRASH,
      onReload: () => undefined,
      isDev: false,
      locale: "zh"
    })
  )
  assert.match(html, /这里出了点问题/)
  assert.match(html, /重新加载/)
  assert.match(html, /data-testid="renderer-crash-fallback"/)
  assert.equal(crashFallbackLeaksEnglishStack(html), false)
  assert.doesNotMatch(html, /SourceRowBody/)
  assert.doesNotMatch(html, /undefined/)
})

test("开发者档才把 stack 画进 pre", () => {
  const html = renderToStaticMarkup(
    createElement(CrashFallback, {
      error: REACT_CRASH,
      onReload: () => undefined,
      isDev: true,
      locale: "zh"
    })
  )
  assert.match(html, /Element type is invalid/)
  assert.match(html, /<pre/)
})
