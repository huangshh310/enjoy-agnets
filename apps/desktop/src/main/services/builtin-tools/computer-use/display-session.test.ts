import assert from "node:assert/strict"
import test from "node:test"
import { backgroundClickPossible, displaySession } from "./display-session.ts"

test("Linux 有 Wayland 就不走 X11，两者都没有则没有桌面", () => {
  assert.equal(displaySession("linux", { WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":0" }), "wayland")
  assert.equal(displaySession("linux", { DISPLAY: ":1" }), "x11")
  assert.equal(displaySession("linux", {}), "none")
  assert.equal(backgroundClickPossible("wayland"), false)
  assert.equal(backgroundClickPossible("x11"), true)
  assert.equal(backgroundClickPossible("windows"), true)
})
