import assert from "node:assert/strict"
import { test } from "node:test"
import { assertSandboxCommand } from "./sandbox.ts"

test("默认禁网拦截 curl", () => {
  assert.throws(() => assertSandboxCommand("curl https://example.com", { allowNetwork: false }), /network/i)
})

test("允许网络时放行 curl", () => {
  assert.doesNotThrow(() => assertSandboxCommand("curl https://example.com", { allowNetwork: true }))
})

test("超长命令被拒", () => {
  assert.throws(() => assertSandboxCommand("a".repeat(5000), { allowNetwork: false, maxCommandChars: 10 }), /size/i)
})
