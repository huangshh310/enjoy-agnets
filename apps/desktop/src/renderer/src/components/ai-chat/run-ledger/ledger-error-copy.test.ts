/**
 * 账本错误不得把未翻译英文摊到默认面。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { enSessionOps } from "../../../i18n/catalogs/en/session-ops.ts"
import { zhSessionOps } from "../../../i18n/catalogs/zh/session-ops.ts"
import {
  formatLedgerErrorUserText,
  ledgerErrorLeaksEnglish,
  ledgerErrorLooksEnglish
} from "./ledger-error-copy.ts"

const zh = {
  "sessionOps.ledgerErrorNoResult": zhSessionOps.ledgerErrorNoResult,
  "sessionOps.ledgerErrorGeneric": zhSessionOps.ledgerErrorGeneric
} as const

function tZh(key: string): string {
  return zh[key as keyof typeof zh] ?? key
}

test("已知英文映射成人话", () => {
  assert.equal(zhSessionOps.ledgerErrorNoResult, "没有收到结果")
  assert.equal(zhSessionOps.ledgerErrorGeneric, "这一步没有成功")
  assert.equal(enSessionOps.ledgerErrorNoResult, "No result received")
  assert.equal(formatLedgerErrorUserText("No result received.", tZh, false), "没有收到结果")
  assert.equal(formatLedgerErrorUserText("No result received", tZh, false), "没有收到结果")
})

test("未知英文走泛句，默认面不露原文", () => {
  const raw = "Something exploded in the tool runner."
  const shown = formatLedgerErrorUserText(raw, tZh, false)
  assert.equal(shown, "这一步没有成功")
  assert.equal(ledgerErrorLeaksEnglish(shown, raw, false), false)
  assert.equal(shown.includes("Something"), false)
  assert.equal(shown.includes("exploded"), false)
})

test("开发者档才带原文", () => {
  const raw = "No result received."
  const shown = formatLedgerErrorUserText(raw, tZh, true)
  assert.match(shown, /没有收到结果/)
  assert.match(shown, /No result received/)
})

test("已是中文的错误原样展示", () => {
  assert.equal(formatLedgerErrorUserText("磁盘已满", tZh, false), "磁盘已满")
  assert.equal(ledgerErrorLooksEnglish("磁盘已满"), false)
})

test("守门：默认面不得渲染未翻译英文错误", () => {
  const samples = ["No result received.", "Tool timed out", "Unexpected token in JSON"]
  for (const raw of samples) {
    const shown = formatLedgerErrorUserText(raw, tZh, false)
    assert.equal(ledgerErrorLeaksEnglish(shown, raw, false), false, raw)
    assert.equal(ledgerErrorLooksEnglish(shown), false, shown)
  }
})
