/**
 * leo soft（#135）：当前档案被关时，开跑（getActiveProfile → pickActiveProfile）与就绪（assembleChatReadiness）挑同一个档案。
 * 旧就绪逻辑：已启用行都标 active:false 时返回空 → 就绪说「没路线」而开跑用第一个已启用档案，两边各说各的。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { assembleChatReadiness } from "./chat-readiness-assemble.ts"
import { pickActiveProfile } from "./active-profile-pick.ts"

const rows = [
  { id: "prv_a", kind: "openai", enabled: false, active: true, hasKey: true, requiresKey: true },
  { id: "prv_b", kind: "openai", enabled: true, active: false, hasKey: true, requiresKey: true },
  { id: "prv_c", kind: "openai", enabled: true, active: false, hasKey: true, requiresKey: true }
]

test("当前档案被关：就绪默认路线与开跑挑同一档案（第一个已启用）", () => {
  const run = pickActiveProfile(rows.filter((r) => r.enabled), (r) => r.id === "prv_a")
  const ready = assembleChatReadiness([], rows, [])
  assert.equal(run?.id, "prv_b")
  assert.equal(ready.defaultRoute.profileId, run?.id)
  assert.equal(ready.hasEnjoySecret, true)
})

test("当前档案启用：两边都挑当前档案", () => {
  const live = rows.map((r) => (r.id === "prv_c" ? { ...r, active: true } : { ...r, active: false }))
  assert.equal(pickActiveProfile(live, (r) => r.active)?.id, "prv_c")
  assert.equal(assembleChatReadiness([], live, []).defaultRoute.profileId, "prv_c")
})
