/**
 * leo #151：「Agent」换成「助手」后不能留下「接到 助手对话」这种中文之间的空格。
 */
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const dir = join(import.meta.dirname, "catalogs/zh")

test("中文文案里「助手」前后不夹多余空格", () => {
  const bad: string[] = []
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    readFileSync(join(dir, name), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/[\u4e00-\u9fff，。、] 助手|助手 [\u4e00-\u9fff]/.test(line)) bad.push(`${name}:${i + 1}: ${line.trim()}`)
      })
  }
  assert.deepEqual(bad, [])
})
