import assert from "node:assert/strict"
import { test } from "node:test"
import { officialOrEmpty } from "./shared.ts"

test("未登录但官方已有窗口则保留官方数字", () => {
  const official = { hasQuota: true, usedPercent: 40, windowType: "Included", windows: [{ name: "Total Usage", usedPercent: 40 }] }
  assert.equal(officialOrEmpty(false, official, "Cursor"), official)
})

test("未登录且没有官方数字才不给额度对象", () => {
  assert.equal(officialOrEmpty(false, undefined, "Cursor"), undefined)
})

test("已登录且官方失败就空额度，不编造百分比", () => {
  const empty = officialOrEmpty(true, undefined, "Cursor", "auto")
  assert.deepEqual(empty, { hasQuota: false, windowType: "Cursor", details: "auto" })
})

test("已登录且有官方数字就原样返回", () => {
  const official = { hasQuota: true, usedPercent: 100, windowType: "Included" }
  assert.equal(officialOrEmpty(true, official, "Cursor"), official)
})
