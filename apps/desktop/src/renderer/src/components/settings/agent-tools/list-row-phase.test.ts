/**
 * 密表行态：未找到走安装；已装检测中 ≠ 就绪。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { listRowPhase } from "./list-row-phase.ts"

test("未找到：一键安装中 / 失败 / 空闲", () => {
  assert.equal(
    listRowPhase({ pathReady: false, busy: "install", installError: "Exit 1", engineKind: "missing" }),
    "installing"
  )
  assert.equal(
    listRowPhase({ pathReady: false, busy: null, installError: "Exit 1", engineKind: "missing" }),
    "failed"
  )
  assert.equal(
    listRowPhase({ pathReady: false, busy: null, installError: null, engineKind: "missing" }),
    "idle"
  )
})

test("已装点获取最新版走安装中；失败不改已装点", () => {
  assert.equal(
    listRowPhase({ pathReady: true, busy: "install", installError: null, engineKind: "ready" }),
    "installing"
  )
  assert.equal(
    listRowPhase({ pathReady: true, busy: null, installError: "EACCES", engineKind: "ready" }),
    "idle"
  )
})

test("已装检测中不是就绪；已登录才 idle", () => {
  assert.equal(
    listRowPhase({ pathReady: true, busy: null, installError: null, engineKind: "inspecting" }),
    "inspecting"
  )
  assert.equal(
    listRowPhase({ pathReady: true, busy: null, installError: null, engineKind: "needs_login" }),
    "idle"
  )
  assert.equal(
    listRowPhase({ pathReady: true, busy: null, installError: null, engineKind: "ready" }),
    "idle"
  )
})

test("自定义无登录：PATH 找到就是 idle，不进检测中", () => {
  assert.equal(
    listRowPhase({ pathReady: true, busy: null, installError: null, engineKind: "ready" }),
    "idle"
  )
})
