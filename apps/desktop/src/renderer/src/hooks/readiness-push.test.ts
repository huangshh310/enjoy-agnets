import assert from "node:assert/strict"
import { test } from "node:test"
import { buildChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import { applyReadinessPush, SETTINGS_QUERY_KEY } from "./readiness-push.ts"

const KEY = ["chat-readiness"] as const
const snap = (state: "ok" | "invalid" | "unverified") =>
  buildChatReadiness({
    engines: [],
    localModels: [],
    apiKeys: [{ kind: "api_key", providerId: "p1", presetId: "openai" }],
    engineCount: 1,
    hasEnjoySecret: true,
    activeKeyProfileId: "p1",
    credentialCheck: { state }
  })

function fakeClient(initial?: unknown) {
  let data = initial
  const invalidated: unknown[] = []
  return {
    invalidated,
    getQueryData: () => data,
    setQueryData: (_key: readonly unknown[], value: unknown) => {
      data = value
    },
    invalidateQueries: (filters: { queryKey: readonly unknown[] }) => {
      invalidated.push(filters.queryKey)
    },
    read: () => data
  }
}

test("推送后校验变了：写缓存并刷新设置快照", () => {
  const client = fakeClient(snap("unverified"))
  const next = snap("invalid")
  assert.deepEqual(applyReadinessPush(client, KEY, next), { refreshedSettings: true })
  assert.equal(client.read(), next)
  assert.deepEqual(client.invalidated, [SETTINGS_QUERY_KEY])
})

test("推送后校验没变：只写缓存，不刷新设置", () => {
  const client = fakeClient(snap("ok"))
  assert.deepEqual(applyReadinessPush(client, KEY, snap("ok")), { refreshedSettings: false })
  assert.deepEqual(client.invalidated, [])
})
