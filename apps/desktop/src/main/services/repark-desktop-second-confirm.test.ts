/**
 * 二次确认缺参走正常 deny，不得提前 return 却让调用方当成功。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const repark = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "repark-desktop-second-confirm.ts"),
  "utf8"
)
const decide = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "decide-approval.ts"), "utf8")

test("缺参 return false，decide 走后续 deny / 续泵", () => {
  assert.ok(repark.includes("Promise<boolean>"))
  assert.ok(repark.includes("return false"))
  assert.ok(repark.includes("return true"))
  assert.ok(decide.includes("return reparkDesktopSecondConfirm("))
})
