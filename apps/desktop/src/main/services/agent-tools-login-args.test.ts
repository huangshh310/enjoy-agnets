/**
 * 登录 argv：OMP 必须带供应商，走 auth-broker login。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveLoginArgv } from "./agent-tools-login-args.ts"

test("OMP 必须带供应商，走 auth-broker login", () => {
  assert.deepEqual(resolveLoginArgv("omp", "anthropic"), {
    ok: true,
    args: ["auth-broker", "login", "anthropic"]
  })
  assert.equal(resolveLoginArgv("omp").ok, false)
  assert.equal(resolveLoginArgv("omp", "../etc").ok, false)
})

test("其它 CLI 仍用目录 loginArgs，忽略 provider", () => {
  assert.deepEqual(resolveLoginArgv("grok", "ignored", ["login"]), {
    ok: true,
    args: ["login"]
  })
})
