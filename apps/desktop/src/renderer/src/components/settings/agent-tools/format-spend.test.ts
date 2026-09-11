import assert from "node:assert/strict"
import test from "node:test"
import { formatDollars, formatSpendLine, formatTokens } from "./format-spend.ts"

test("token 短格式", () => {
  assert.equal(formatTokens(0), "0")
  assert.equal(formatTokens(1200), "1.2K")
  assert.equal(formatTokens(1_500_000), "1.5M")
})

test("花费行无数据返回 null，有花费带美元", () => {
  assert.equal(formatSpendLine(undefined, 0), null)
  assert.equal(formatSpendLine(4.08, 1_200_000), "$4.08 · 1.2M")
})

test("美元千位缩写", () => {
  assert.equal(formatDollars(2060), "$2.1K")
})
