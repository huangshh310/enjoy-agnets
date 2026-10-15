/**
 * jojo P2（#136 gate2）：发送闸「改密钥」永远有去处。默认路线解析不出档案时退回「添加 API 密钥」，不能点了没反应。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { fixKeyNavigation, goFixKey, type FixKeyNavigation } from "./credential-fix-key-nav.ts"

function clicks(providerId: string | null | undefined): FixKeyNavigation[] {
  const calls: FixKeyNavigation[] = []
  goFixKey((to) => calls.push(to), providerId)
  return calls
}

test("能定位到档案：打开该档案编辑页（edit + from=chat）", () => {
  assert.deepEqual(clicks("prof_ds"), [
    { to: "/settings/$section", params: { section: "providers" }, search: { edit: "prof_ds", from: "chat" } }
  ])
})

test("默认路线解析不出档案（undefined / null / 空串）：仍然跳转，打开设置页添加 API 密钥", () => {
  for (const id of [undefined, null, ""]) {
    assert.deepEqual(clicks(id), [
      { to: "/settings/$section", params: { section: "providers" }, search: { create: "official", from: "chat" } }
    ], `providerId=${String(id)}`)
  }
})

test("fixKeyNavigation 与点击时的目标一致", () => {
  assert.deepEqual(fixKeyNavigation(undefined).search, { create: "official", from: "chat" })
  assert.deepEqual(fixKeyNavigation("p").search, { edit: "p", from: "chat" })
})

test("leo r3：幽灵档案（快照 prv_gone 不在列表、prv_other 停用）→ 解析不出 → 打开添加 API 密钥，不开 edit:prv_other", async () => {
  const { resolveDefaultProviderId } = await import("../../../lib/default-provider-label.ts")
  const ghost = {
    defaultRoute: { runtimeId: "enjoy-local", profileId: "prv_gone" },
    apiKeys: [{ kind: "api_key", providerId: "prv_gone", presetId: "openai" }]
  } as never
  const id = resolveDefaultProviderId(ghost, [{ id: "prv_other", hasKey: true, enabled: false, active: false }])
  assert.deepEqual(clicks(id), [
    { to: "/settings/$section", params: { section: "providers" }, search: { create: "official", from: "chat" } }
  ])
})
