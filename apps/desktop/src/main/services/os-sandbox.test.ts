import assert from "node:assert/strict"
import { test } from "node:test"
import { buildSeatbeltProfile, seatbeltWrap, shouldUseOsSandbox } from "./os-sandbox.ts"

test("默认禁网并允许写工作区", () => {
  const profile = buildSeatbeltProfile({
    workspaceRoot: "/Users/me/proj",
    tmpDir: "/var/folders/tmp",
    allowNetwork: false
  })
  assert.ok(profile.includes('(subpath "/Users/me/proj")'))
  assert.ok(profile.includes("(deny network*)"))
  assert.ok(!profile.includes("(allow network*)"))
})

test("允许网络时放开 network*", () => {
  const profile = buildSeatbeltProfile({
    workspaceRoot: "/ws",
    tmpDir: "/tmp",
    allowNetwork: true
  })
  assert.ok(profile.includes("(allow network*)"))
})

test("seatbeltWrap 走 sandbox-exec", () => {
  const wrapped = seatbeltWrap("git", ["status"], "(version 1)")
  assert.equal(wrapped.executable, "sandbox-exec")
  assert.deepEqual(wrapped.args.slice(0, 3), ["-p", "(version 1)", "git"])
})

test("只在 macOS 启用", () => {
  assert.equal(shouldUseOsSandbox("darwin"), true)
  assert.equal(shouldUseOsSandbox("linux"), false)
})
