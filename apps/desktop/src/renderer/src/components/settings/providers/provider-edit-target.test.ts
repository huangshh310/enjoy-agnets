import assert from "node:assert/strict"
import { test } from "node:test"
import { editTargetAction, settingsQueryLoaded } from "./provider-edit-target.ts"

test("没有 edit：不动", () => {
  assert.equal(editTargetAction(undefined, [], true), "none")
})

test("列表没加载完：先等，不回落", () => {
  assert.equal(editTargetAction("p1", [], false), "wait")
})

test("找到档案：开编辑器", () => {
  assert.equal(editTargetAction("p1", [{ id: "p1" }], false), "open")
  assert.equal(editTargetAction("p1", [{ id: "p1" }], true), "open")
})

test("加载完仍找不到：回落到新建表单，不让向导卡在暂停态", () => {
  assert.equal(editTargetAction("gone", [{ id: "p1" }], true), "fallback-create")
})

test("快照请求出错也算加载完：edit 回落，不让引导一直暂停", () => {
  assert.equal(settingsQueryLoaded({ isSuccess: false, isError: false }), false)
  assert.equal(settingsQueryLoaded({ isSuccess: true, isError: false }), true)
  assert.equal(settingsQueryLoaded({ isSuccess: false, isError: true }), true)
  assert.equal(editTargetAction("p1", [], settingsQueryLoaded({ isSuccess: false, isError: true })), "fallback-create")
  assert.equal(editTargetAction("p1", [], settingsQueryLoaded({ isSuccess: false, isError: false })), "wait")
})
