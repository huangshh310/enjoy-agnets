import assert from "node:assert/strict"
import { test } from "node:test"
import {
  peekCommandReceipt,
  rememberCommandReceipt,
  resetCommandReceipts
} from "./command-receipts.ts"

test("同一 commandId 记住第一次的 runId", () => {
  resetCommandReceipts()
  assert.equal(peekCommandReceipt("cmd_1"), undefined)
  rememberCommandReceipt("cmd_1", "run_a")
  rememberCommandReceipt("cmd_1", "run_b")
  assert.equal(peekCommandReceipt("cmd_1"), "run_a")
  resetCommandReceipts()
  assert.equal(peekCommandReceipt("cmd_1"), undefined)
})
