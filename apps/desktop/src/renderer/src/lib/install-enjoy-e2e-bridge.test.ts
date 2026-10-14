/**
 * leo BLOCK（#136 @f3a0afc4）：真调安装点 installEnjoyE2eBridge 挂到桩 window。
 * 安装点改回 `win.__enjoyE2e = bridge` 或写死 `gateE2eStubMembers(bridge, true)` 都会红。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { installEnjoyE2eBridge } from "./install-enjoy-e2e-bridge.ts"

type Win = { __enjoyE2e?: Record<string, unknown>; enjoyE2eStub?: unknown }
const dir = dirname(fileURLToPath(import.meta.url))
const fullBridge = () => ({
  getComposerGate: () => null,
  runWithClientRequestId: async () => null,
  focusSession: async () => undefined
})

test("打包 / 非 stub 窗口（没有标记）：stub-only 成员不暴露，其它成员仍在", () => {
  const win: Win = {}
  installEnjoyE2eBridge(win, fullBridge)
  assert.equal(typeof win.__enjoyE2e?.getComposerGate, "function")
  assert.equal(win.__enjoyE2e?.runWithClientRequestId, undefined)
  assert.equal(win.__enjoyE2e?.focusSession, undefined)
})

test("标记不是 === true 也按非 stub 处理", () => {
  const win: Win = { enjoyE2eStub: "true" }
  installEnjoyE2eBridge(win, fullBridge)
  assert.equal(win.__enjoyE2e?.runWithClientRequestId, undefined)
  assert.equal(win.__enjoyE2e?.focusSession, undefined)
})

test("对照：e2e stub 窗口两项都在", () => {
  const win: Win = { enjoyE2eStub: true }
  installEnjoyE2eBridge(win, fullBridge)
  assert.equal(typeof win.__enjoyE2e?.runWithClientRequestId, "function")
  assert.equal(typeof win.__enjoyE2e?.focusSession, "function")
})

test("没有 window（非渲染进程）：不建桥", () => {
  let built = 0
  installEnjoyE2eBridge(undefined, () => (built++, fullBridge()))
  assert.equal(built, 0)
})

test("桥本体不自己写 window.__enjoyE2e；App 走安装点", () => {
  const body = readFileSync(join(dir, "enjoy-e2e-bridge.ts"), "utf8")
  const app = readFileSync(join(dir, "../App.tsx"), "utf8")
  assert.doesNotMatch(body, /__enjoyE2e\s*=/)
  assert.doesNotMatch(body, /publishE2eBridge|gateE2eStubMembers/)
  assert.match(app, /installEnjoyE2eBridge\(.*createEnjoyE2eBridge\)/)
})
