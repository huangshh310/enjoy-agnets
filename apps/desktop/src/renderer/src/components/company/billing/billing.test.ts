/**
 * 账单契约、CSV 导出与升级折算。
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
  COMPARISON_PLAN_COLUMNS,
  COMPARISON_SECTIONS,
  DEFAULT_BILLING_PLAN,
  DEFAULT_BILLING_STATS,
  DEFAULT_INVOICES,
  DEFAULT_PAYMENT_METHOD,
  UPGRADE_TIER_PLANS
} from "./billing.constants.ts"
import { applyUpgradePlan, tierIdFromPlanName } from "./lib/apply-upgrade.ts"
import { invoicesToCsv } from "./lib/billing-export.ts"

test("DEFAULT_BILLING_PLAN: 套餐包含合法的月付单价与周期标签", () => {
  assert.ok(DEFAULT_BILLING_PLAN.priceMonthly > 0)
  assert.equal(DEFAULT_BILLING_PLAN.status, "active")
  assert.ok(DEFAULT_BILLING_PLAN.seatsUsed <= DEFAULT_BILLING_PLAN.seatsTotal)
})

test("DEFAULT_PAYMENT_METHOD: 默认支付卡具备合法的 4 位尾号与有效期", () => {
  assert.match(DEFAULT_PAYMENT_METHOD.last4, /^\d{4}$/)
  assert.match(DEFAULT_PAYMENT_METHOD.expiry, /^\d{2}\/\d{2}$/)
})

test("DEFAULT_BILLING_STATS: Tax ID 使用专票/统一代码说明", () => {
  const tax = DEFAULT_BILLING_STATS.find((item) => item.id === "tax_id")
  assert.ok(tax)
  assert.match(tax.value, /专票|统一代码/)
  assert.ok(tax.caption.length > 0)
})

test("DEFAULT_INVOICES: 包含有效发票编号与已缴款状态", () => {
  for (const inv of DEFAULT_INVOICES) {
    assert.match(inv.id, /^INV-\d{4}-\d{2}$/)
    assert.match(inv.amount, /^\$\d+\.\d{2}$/)
    assert.equal(inv.status, "paid")
  }
})

test("COMPARISON_SECTIONS: 对比矩阵列数与每行数据点数量严格对齐", () => {
  const colCount = COMPARISON_PLAN_COLUMNS.length
  for (const section of COMPARISON_SECTIONS) {
    for (const row of section.rows) {
      assert.equal(row.values.length, colCount)
    }
  }
})

test("invoicesToCsv: 生成表头与全部发票行", () => {
  const csv = invoicesToCsv(DEFAULT_INVOICES)
  assert.ok(csv.startsWith("id,date,amount,status"))
  assert.ok(csv.includes("INV-2026-04"))
})

test("applyUpgradePlan: Starter 席位钉死为 5，不用滑块残留", () => {
  const starter = UPGRADE_TIER_PLANS.find((tier) => tier.id === "starter")
  assert.ok(starter)
  const next = applyUpgradePlan(DEFAULT_BILLING_PLAN, starter, 40, true)
  assert.equal(next.seatsTotal, 5)
  assert.equal(next.priceMonthly, 0)
  assert.equal(next.status, "active")
})

test("tierIdFromPlanName: Team Enterprise 映射 enterprise", () => {
  assert.equal(tierIdFromPlanName("Team Enterprise"), "enterprise")
  assert.equal(tierIdFromPlanName("Pro"), "pro")
  assert.equal(tierIdFromPlanName("Starter"), "starter")
})
