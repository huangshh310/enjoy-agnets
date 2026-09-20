import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const rail = readFileSync(join(dir, "composer-context-rail.tsx"), "utf8")
const chrome = readFileSync(join(dir, "../composer-top-chrome.tsx"), "utf8")

test("融合轨只在有 Goal/Recap 时出现", () => {
  assert.ok(rail.includes("if (!sessionId || (!goal && !recap)) return null"))
  assert.ok(rail.includes("data-testid=\"composer-context-rail\""))
  assert.ok(rail.includes("visibleRecapText"))
})

test("顶栏分段不含 Goal 芯片", () => {
  assert.equal(chrome.includes("<SessionGoalChip"), false)
  assert.equal(chrome.includes("ComposerContextRail"), false)
})
