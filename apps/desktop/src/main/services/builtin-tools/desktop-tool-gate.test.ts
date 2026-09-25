/**
 * O4：Explore / plan / ask 即使电脑操控已开也不注册 desktop_*。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  DESKTOP_CONTROL_TOOL_NAMES,
  shouldRegisterDesktopControlTools
} from "./desktop-tool-gate.ts"

test("Explore / 非执行态：电脑操控开也不给 desktop_act", () => {
  assert.equal(shouldRegisterDesktopControlTools("plan", true), false)
  assert.equal(shouldRegisterDesktopControlTools("ask", true), false)
  assert.equal(shouldRegisterDesktopControlTools("agent", true), true)
  assert.equal(shouldRegisterDesktopControlTools("debug", true), true)
  assert.equal(shouldRegisterDesktopControlTools("agent", false), false)
  assert.ok(DESKTOP_CONTROL_TOOL_NAMES.includes("desktop_act"))
})

test("createBuiltinAgentTools 用门控，探索态不调 desktopControlTools", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "builtin-agent-tools.ts"), "utf8")
  assert.match(src, /isReadOnlyAgentMode/)
  assert.match(src, /shouldRegisterDesktopControlTools/)
  assert.match(src, /desktopControlTools\(\)/)
  assert.doesNotMatch(src, /if \(state\.computerUse\.enabled\) Object\.assign\(tools, desktopControlTools\(\)\)/)
})
