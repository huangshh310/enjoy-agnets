import assert from "node:assert/strict"
import { test } from "node:test"
import {
  SESSION_MENU_COLLISION,
  applySessionMenuCloseFocus,
  sessionMenuAlign,
  sessionMenuMaxHeight
} from "./session-menu-placement.ts"

test("靠顶的触发钮向下展开", () => {
  assert.equal(sessionMenuAlign({ top: 80, bottom: 108 }, 920), "start")
})

test("靠底的触发钮向上展开", () => {
  assert.equal(sessionMenuAlign({ top: 820, bottom: 848 }, 920), "end")
})

test("向上展开时高度不超过标题栏以下", () => {
  const height = sessionMenuMaxHeight({ top: 820, bottom: 848 }, 920, SESSION_MENU_COLLISION, "end")
  assert.equal(height, 848 - SESSION_MENU_COLLISION.top)
  assert.ok(height < 920 - SESSION_MENU_COLLISION.top)
})

test("向下展开时高度不超过底边 padding", () => {
  const height = sessionMenuMaxHeight({ top: 80, bottom: 108 }, 920, SESSION_MENU_COLLISION, "start")
  assert.equal(height, 920 - SESSION_MENU_COLLISION.bottom - 80)
})

test("可用空间再小也保底 96px 以便滚动", () => {
  assert.equal(sessionMenuMaxHeight({ top: 50, bottom: 60 }, 80, SESSION_MENU_COLLISION, "end"), 96)
})

test("指针关闭时拦住默认回焦并可编程回焦", () => {
  let prevented = false
  let focused = false
  applySessionMenuCloseFocus(
    { preventDefault: () => { prevented = true } },
    true,
    { focus: () => { focused = true } }
  )
  assert.equal(prevented, true)
  assert.equal(focused, true)
})

test("键盘关闭时不拦回焦", () => {
  let prevented = false
  applySessionMenuCloseFocus({ preventDefault: () => { prevented = true } }, false, {
    focus: () => {
      throw new Error("keyboard close should use Radix default focus")
    }
  })
  assert.equal(prevented, false)
})
