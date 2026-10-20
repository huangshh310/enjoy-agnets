/**
 * #158 gate P1：733x480 有审批卡时点「马上发给它」，提示条挂在输入框帽檐里，把审批三钮挤到底下盖住。
 * 有审批卡时「马上发」类提示改画在审批卡上方的紧凑区；挤到审批卡就不画。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { runtimeHintPlacement, dockHintCrowded } = await import("./runtime-hint-placement.ts")

test("没提示：哪里都不画", () => {
  assert.equal(runtimeHintPlacement(null, false, 0), null)
  assert.equal(runtimeHintPlacement(null, true, 2), null)
})

test("没审批卡：所有提示都画在输入框帽檐", () => {
  assert.equal(runtimeHintPlacement("steered", false, 0), "frame")
  assert.equal(runtimeHintPlacement("imageSteerQueued", false, 1), "frame")
  assert.equal(runtimeHintPlacement("queued", false, 1), "frame")
  assert.equal(runtimeHintPlacement("chipQueued", false, 1), "frame")
})

test("队列空了：排队类提示不画（有没有审批卡都一样）", () => {
  assert.equal(runtimeHintPlacement("queued", false, 0), null)
  assert.equal(runtimeHintPlacement("chipQueued", true, 0), null)
})

test("有审批卡：「马上发」提示不进输入框帽檐，改画在审批卡上方紧凑区（gate-158 P1）", () => {
  assert.equal(runtimeHintPlacement("steered", true, 0), "dock")
  assert.equal(runtimeHintPlacement("steered", true, 1), "dock")
  assert.equal(runtimeHintPlacement("imageSteerQueued", true, 1), "dock")
})

test("有审批卡：排队类提示不画（紧凑排队行已经在）", () => {
  assert.equal(runtimeHintPlacement("queued", true, 2), null)
  assert.equal(runtimeHintPlacement("chipQueued", true, 1), null)
})

test("紧凑区放得下：提示照画", () => {
  assert.equal(dockHintCrowded({ approvalOverflowPx: 0, approvalBodySqueezePx: 0 }), false)
  assert.equal(dockHintCrowded({ approvalOverflowPx: 0.5, approvalBodySqueezePx: 0.5 }), false)
})

test("三钮被挤出对话列 / 卡内正文被压成缝：提示让位", () => {
  assert.equal(dockHintCrowded({ approvalOverflowPx: 24, approvalBodySqueezePx: 0 }), true)
  assert.equal(dockHintCrowded({ approvalOverflowPx: 0, approvalBodySqueezePx: 12 }), true)
  assert.equal(dockHintCrowded({ approvalOverflowPx: 1, approvalBodySqueezePx: 1 }), true)
})
