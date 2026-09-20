import assert from "node:assert/strict"
import { test } from "node:test"
import {
  formatOptimisticTitle,
  isDefaultSessionTitle,
  shouldRefineSessionTitle,
  stripTitleSource
} from "./session-title.ts"

test("stripTitleSource 剥 host-mode 与 session-context 围栏", () => {
  assert.equal(
    stripTitleSource("[Enjoy host mode: plan]\nDo not edit.\n[/Enjoy host mode]\n\n改登录页"),
    "改登录页"
  )
  assert.equal(
    stripTitleSource("[Enjoy session context]\nGoal: 登录\n[/Enjoy session context]\n\n继续"),
    "继续"
  )
})

test("formatOptimisticTitle 不把围栏写进标题", () => {
  assert.equal(
    formatOptimisticTitle("[Enjoy host mode: plan]\nDo not edit.\n[/Enjoy host mode]\n\n帮我改登录"),
    "帮我改登录"
  )
  assert.equal(formatOptimisticTitle(""), "新对话")
})

test("shouldRefineSessionTitle 占位与乐观截断可覆盖", () => {
  assert.equal(shouldRefineSessionTitle("新对话", "hi"), true)
  assert.equal(shouldRefineSessionTitle("hi", "hi"), true)
  assert.equal(shouldRefineSessionTitle("登录页改版", "hi"), false)
  assert.equal(isDefaultSessionTitle("New agent"), true)
})
