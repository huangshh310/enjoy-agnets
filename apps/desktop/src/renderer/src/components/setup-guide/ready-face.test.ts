/**
 * 末屏只认 ready，引擎数不能冒充可以开始。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { readyGuideFinishes, readyGuidePrimaryKey, readyGuideTitleKey } from "./ready-face.ts"

test("有可对话路线才写可以开始了", () => {
  assert.equal(readyGuideTitleKey(true), "settings.setupGuide.readyTitle")
  assert.equal(readyGuidePrimaryKey(true), "settings.setupGuide.start")
  assert.equal(readyGuideFinishes(true), true)
})

test("没有路线写还差一步，主钮去连接", () => {
  assert.equal(readyGuideTitleKey(false), "settings.setupGuide.readyNeedTitle")
  assert.equal(readyGuidePrimaryKey(false), "settings.setupGuide.goConnect")
  assert.equal(readyGuideFinishes(false), false)
})
