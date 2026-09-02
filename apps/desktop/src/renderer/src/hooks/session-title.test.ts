import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isDefaultSessionTitle,
  sanitizeTitle,
  formatOptimisticTitle
} from "./session-title.ts"

test("isDefaultSessionTitle 正确识别默认占位标题", () => {
  assert.equal(isDefaultSessionTitle("新对话"), true)
  assert.equal(isDefaultSessionTitle("New agent"), true)
  assert.equal(isDefaultSessionTitle("新会话"), true)
  assert.equal(isDefaultSessionTitle("未命名会话"), true)
  assert.equal(isDefaultSessionTitle("Untitled"), true)
  assert.equal(isDefaultSessionTitle("Untitled session"), true)
  assert.equal(isDefaultSessionTitle(""), true)
  assert.equal(isDefaultSessionTitle(null), true)
  assert.equal(isDefaultSessionTitle(undefined), true)
  assert.equal(isDefaultSessionTitle("   "), true)

  assert.equal(isDefaultSessionTitle("仿苹果官网登录页"), false)
  assert.equal(isDefaultSessionTitle("Shanghai Weather"), false)
  assert.equal(isDefaultSessionTitle("Fix auth bug"), false)
})

test("sanitizeTitle 去除多余标点、前后引号及前缀", () => {
  assert.equal(sanitizeTitle('"仿苹果官网登录页"'), "仿苹果官网登录页")
  assert.equal(sanitizeTitle("《上海游玩美食推荐》"), "上海游玩美食推荐")
  assert.equal(sanitizeTitle("标题：修复登录 Bug"), "修复登录 Bug")
  assert.equal(sanitizeTitle("Title: React 19 Upgrade Guide"), "React 19 Upgrade Guide")
})

test("formatOptimisticTitle 正确截取并格式化首轮标题", () => {
  assert.equal(
    formatOptimisticTitle("帮我生成一个html 的登录页仿照苹果官网"),
    "帮我生成一个html 的登录页仿照苹果官网"
  )
  assert.equal(formatOptimisticTitle(""), "新对话")
  assert.equal(formatOptimisticTitle("   "), "新对话")
})
