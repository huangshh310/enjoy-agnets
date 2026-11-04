/**
 * I1 瞬时角标：成功出 badge；clear 后淡出；跑着可带 nextTurn。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clearModelSwitchBadge,
  modelSwitchBadgeVisible,
  modelSwitchNextTurnVisible,
  modelSwitchNoticeLabel,
  showModelSwitchNotice
} from "./model-switch-notice.ts"

test("成功提示带模型名与角标", () => {
  showModelSwitchNotice("Opus 4.1")
  assert.equal(modelSwitchNoticeLabel(), "Opus 4.1")
  assert.equal(modelSwitchBadgeVisible(), true)
  assert.equal(modelSwitchNextTurnVisible(), false)
  clearModelSwitchBadge()
  assert.equal(modelSwitchBadgeVisible(), false)
  assert.equal(modelSwitchNextTurnVisible(), false)
})

test("跑着切换带下一轮副句", () => {
  showModelSwitchNotice("Haiku 4", { nextTurn: true })
  assert.equal(modelSwitchBadgeVisible(), true)
  assert.equal(modelSwitchNextTurnVisible(), true)
  clearModelSwitchBadge()
  assert.equal(modelSwitchNextTurnVisible(), false)
})

test("空名不弹成功", () => {
  clearModelSwitchBadge()
  showModelSwitchNotice("   ")
  assert.equal(modelSwitchNoticeLabel(), null)
  assert.equal(modelSwitchBadgeVisible(), false)
})
