/**
 * 成功/信息 2400ms；错误或带动作 Infinity；显式有限 duration 覆盖驻留。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  APP_TOAST_MS,
  ARCHIVE_UNDO_TOAST_MS,
  resolveAppToastDuration,
  shouldPersistAppToast
} from "./app-toast-policy.ts"

test("成功与信息自动消失 2400ms", () => {
  assert.equal(APP_TOAST_MS, 2400)
  assert.equal(resolveAppToastDuration({ tone: "success" }), 2400)
  assert.equal(resolveAppToastDuration({ tone: "info" }), 2400)
  assert.equal(resolveAppToastDuration(), 2400)
  assert.equal(shouldPersistAppToast({ tone: "success" }), false)
})

test("错误 toast 一直停到用户关掉", () => {
  assert.equal(resolveAppToastDuration({ tone: "error" }), Number.POSITIVE_INFINITY)
  assert.equal(shouldPersistAppToast({ tone: "error" }), true)
})

test("带动作的 toast 即使成功也一直停", () => {
  const action = { label: "Undo", onClick: () => undefined }
  assert.equal(resolveAppToastDuration({ tone: "success", action }), Number.POSITIVE_INFINITY)
  assert.equal(shouldPersistAppToast({ action }), true)
})

test("显式有限 duration 覆盖动作条驻留，归档撤销 5s", () => {
  const action = { label: "撤销", onClick: () => undefined }
  assert.equal(ARCHIVE_UNDO_TOAST_MS, 5000)
  assert.equal(resolveAppToastDuration({ action, duration: ARCHIVE_UNDO_TOAST_MS }), 5000)
  assert.equal(shouldPersistAppToast({ action, duration: ARCHIVE_UNDO_TOAST_MS }), false)
  assert.equal(resolveAppToastDuration({ tone: "error", duration: 1200 }), 1200)
})
