/**
 * ready ⇒ 闸放行：穷尽组合（含两份档案的校验态与 adopted），防止两套谓词再分叉。
 * 闸的 credentialState 只取「这次发送用的档案」，与 ready 共用 runCredentialStateOf。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  buildChatReadiness,
  chatRouteAllowsSend,
  isVerifiedLocalModel,
  runCredentialStateOf,
  type ChatApiKeyRoute,
  type ChatEngineRoute,
  type ChatLocalModelRoute,
  type CredentialCheck
} from "./chat-readiness.ts"

const K1: ChatApiKeyRoute = { kind: "api_key", providerId: "p1", presetId: "openai" }
const K2: ChatApiKeyRoute = { kind: "api_key", providerId: "p2", presetId: "anthropic" }
const CLAUDE: ChatEngineRoute = { kind: "engine", runtimeId: "claude", name: "Claude Code" }
const LOCAL_OK: ChatLocalModelRoute = { kind: "local_model", service: "ollama", verified: true }
const REMOTE: ChatLocalModelRoute = { kind: "local_model", service: "ollama", verified: false }

const STATES = [undefined, "ok", "unverified", "invalid"] as const
const KEYS: ChatApiKeyRoute[][] = [[], [K1], [K1, K2]]
const ACTIVE = [undefined, null, "p1", "p2"] as const
const BOOL = [false, true] as const
const LOCALS: ChatLocalModelRoute[][] = [[], [LOCAL_OK], [REMOTE]]
const SECRET = [true, false, undefined] as const
const PREFERRED = [undefined, "claude"] as const

test("穷尽 27648 组：ready 为真时闸必须放行（含校验态 × adopted）", () => {
  let count = 0
  const bad: string[] = []
  for (const s1 of STATES)
    for (const s2 of STATES)
      for (const apiKeys of KEYS)
        for (const activeKeyProfileId of ACTIVE)
          for (const explicit of BOOL)
            for (const adopted of BOOL)
              for (const localModels of LOCALS)
                for (const hasEnjoySecret of SECRET)
                  for (const preferredRuntimeId of PREFERRED)
                    for (const hasCli of BOOL) {
                      count += 1
                      const keyChecks: Record<string, CredentialCheck> = {}
                      if (s1) keyChecks.p1 = { state: s1 }
                      if (s2) keyChecks.p2 = { state: s2 }
                      const activeState =
                        activeKeyProfileId === "p1" ? s1 : activeKeyProfileId === "p2" ? s2 : undefined
                      const input = {
                        engines: hasCli ? [CLAUDE] : [],
                        localModels,
                        apiKeys,
                        engineCount: 1,
                        hasEnjoySecret,
                        preferredRuntimeId,
                        explicit,
                        adopted,
                        activeKeyProfileId,
                        credentialCheck: activeState ? { state: activeState } : undefined,
                        keyChecks
                      }
                      const snap = buildChatReadiness(input)
                      const gate = (credentialState: typeof activeState) =>
                        chatRouteAllowsSend({
                          runtimeId: snap.defaultRoute?.runtimeId ?? "enjoy-local",
                          hasEnjoySecret: snap.hasEnjoySecret ?? false,
                          verifiedLocal: localModels.some(isVerifiedLocalModel),
                          credentialState
                        })
                      const runState = runCredentialStateOf({
                        apiKeys,
                        hasEnjoySecret,
                        activeKeyProfileId,
                        credentialState: activeState,
                        keyStates: Object.fromEntries(Object.entries(keyChecks).map(([k, v]) => [k, v.state]))
                      })
                      // 运行时闸读当前档案（activeProfileCredentialState）；两种读法都必须成立。
                      if (snap.ready && (!gate(runState) || !gate(activeState))) {
                        bad.push(
                          JSON.stringify({ s1, s2, keys: apiKeys.length, activeKeyProfileId, explicit, adopted,
                            locals: localModels.length, hasEnjoySecret, preferredRuntimeId, hasCli, route: snap.defaultRoute })
                        )
                      }
                    }
  assert.equal(count, 27648)
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} 组 ready 但闸拦`)
})

test("leo 反例：未显式、未 adopt、当前 p2 invalid、p1 ok → 不 ready（闸也拦）", () => {
  const snap = buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [K1, K2],
    engineCount: 1,
    hasEnjoySecret: true,
    activeKeyProfileId: "p2",
    credentialCheck: { state: "invalid", code: "auth_rejected" },
    keyChecks: { p1: { state: "ok" }, p2: { state: "invalid", code: "auth_rejected" } }
  })
  assert.equal(snap.ready, false)
  assert.equal(snap.defaultRoute?.profileId, "p2")
  assert.equal(snap.credentialCheck?.state, "invalid")
})
