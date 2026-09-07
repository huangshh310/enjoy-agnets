/**
 * 自动更新合约：空入参、快照、parse 失败回 null。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { AppUpdateActionInput, AppUpdateSnapshot, parseAppUpdateSnapshot } from "./app-update.ts"

test("空动作入参拒绝多余字段", () => {
  assert.deepEqual(AppUpdateActionInput.parse({}), {})
  assert.throws(() => AppUpdateActionInput.parse({ extra: true }))
})

test("快照允许缺省发行说明", () => {
  const parsed = AppUpdateSnapshot.parse({
    status: "available",
    currentVersion: "0.1.0",
    version: "0.1.1"
  })
  assert.equal(parsed.version, "0.1.1")
  assert.equal(parsed.releaseNotes, undefined)
})

test("损坏载荷 parse 为 null", () => {
  assert.equal(parseAppUpdateSnapshot({ status: "nope" }), null)
  assert.equal(parseAppUpdateSnapshot({ status: "idle", currentVersion: "1" })?.status, "idle")
})
