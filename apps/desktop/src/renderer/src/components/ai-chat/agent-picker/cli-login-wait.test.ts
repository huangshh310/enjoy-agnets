/**
 * 打开授权页后轮询 inspect，等该供应商 loggedIn。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { engineLoggedIn, providerLoggedIn, waitCliEngineReady, waitCliProviderReady } from "./cli-login-wait.ts"

function snap(loggedIn: boolean): InspectAgentToolResult {
  return {
    id: "omp",
    models: loggedIn ? [{ id: "google-antigravity/gemini-3", label: "Gemini 3" }] : [],
    providers: [{ id: "google-antigravity", label: "Antigravity", loggedIn }]
  }
}

test("已登录看 providers.loggedIn，也认 models 前缀", () => {
  assert.equal(providerLoggedIn(snap(true), "google-antigravity"), true)
  assert.equal(providerLoggedIn(snap(false), "google-antigravity"), false)
  assert.equal(
    providerLoggedIn(
      { id: "omp", models: [{ id: "github-copilot/gpt-4.1", label: "GPT" }] },
      "github-copilot"
    ),
    true
  )
})

test("打开授权页后第一次 inspect 仍未登录，必须继续等到 loggedIn", async () => {
  const rows = [snap(false), snap(false), snap(true)]
  let clock = 0
  const outcome = await waitCliProviderReady({
    providerId: "google-antigravity",
    inspect: async () => rows.shift() ?? snap(true),
    intervalMs: 10,
    timeoutMs: 1_000,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms
    }
  })
  assert.equal(outcome, "ready")
  assert.equal(rows.length, 0)
})

test("引擎级登录只信 authAccount.loggedIn，spawn 成功不算", async () => {
  assert.equal(engineLoggedIn({ id: "claude", models: [] }), false)
  const rows: InspectAgentToolResult[] = [
    { id: "claude", models: [] },
    { id: "claude", models: [], authAccount: { loggedIn: true, email: "a@b.com" } }
  ]
  let clock = 0
  const outcome = await waitCliEngineReady({
    inspect: async () => rows.shift() ?? { id: "claude", models: [], authAccount: { loggedIn: true } },
    intervalMs: 10,
    timeoutMs: 1_000,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms
    }
  })
  assert.equal(outcome, "ready")
})

test("一直未登录则超时，避免把 browser_opened 当成成功", async () => {
  let clock = 0
  const outcome = await waitCliProviderReady({
    providerId: "google-antigravity",
    inspect: async () => snap(false),
    intervalMs: 10,
    timeoutMs: 25,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms
    }
  })
  assert.equal(outcome, "timeout")
})
