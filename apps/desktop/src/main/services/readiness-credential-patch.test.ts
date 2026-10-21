/**
 * jojo #169 P3：发送回写校验态后在缓存快照上只改这一项（readinessWithCredentialCheck）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { readinessWithCredentialCheck } from "./readiness-credential-patch.ts"

const invalid = { state: "invalid", code: "auth_rejected" } as const
function snap(defaultRoute?: { runtimeId: string; profileId?: string }) {
  const base = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [
      { kind: "api_key", providerId: "prv_a", presetId: "openai" },
      { kind: "api_key", providerId: "prv_b", presetId: "custom" }
    ],
    engineCount: 1,
    hasEnjoySecret: true,
    credentialCheck: { state: "ok" }
  } as never)
  return { ...base, ready: true, ...(defaultRoute ? { defaultRoute } : {}) } as typeof base
}

test("默认路线那份档案被拒 → 校验态改成 invalid、ready 落 false", () => {
  const next = readinessWithCredentialCheck(snap({ runtimeId: "enjoy-local", profileId: "prv_a" }), "prv_a", invalid)
  assert.deepEqual(next.credentialCheck, invalid)
  assert.equal(next.ready, false)
})

test("别的档案被拒 → 快照原样（同一个对象，不推）", () => {
  const before = snap({ runtimeId: "enjoy-local", profileId: "prv_a" })
  assert.equal(readinessWithCredentialCheck(before, "prv_b", invalid), before)
})

test("默认路线不是 Enjoy 本地（Amp 绑 prv_a）→ 校验态改、ready 不动（ready 归引擎）", () => {
  const next = readinessWithCredentialCheck(snap({ runtimeId: "amp", profileId: "prv_a" }), "prv_a", invalid)
  assert.deepEqual(next.credentialCheck, invalid)
  assert.equal(next.ready, true)
})

test("通过（ok）只改校验态，ready 留给整张重算", () => {
  const before = { ...snap({ runtimeId: "enjoy-local", profileId: "prv_a" }), ready: false, credentialCheck: invalid }
  const next = readinessWithCredentialCheck(before as never, "prv_a", { state: "ok" })
  assert.deepEqual(next.credentialCheck, { state: "ok" })
  assert.equal(next.ready, false)
})

test("没有默认路线档案：只认 apiKeys 里有的档案", () => {
  const before = { ...snap(), defaultRoute: undefined } as ReturnType<typeof snap>
  assert.equal(readinessWithCredentialCheck(before, "prv_zzz", invalid), before)
  assert.deepEqual(readinessWithCredentialCheck(before, "prv_b", invalid).credentialCheck, invalid)
})
