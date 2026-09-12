/**
 * 仅官方四家：抽屉决策槽禁止假 BYOK / vault 下拉。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

test("仅官方槽没有档案下拉 / AgentToolProvider", () => {
  const slot = readFileSync(join(dir, "../power-source/official-power-slot.tsx"), "utf8")
  const router = readFileSync(join(dir, "../power-source/agent-tool-power-slot.tsx"), "utf8")
  assert.ok(slot.includes("officialNoVaultHint"))
  assert.ok(!slot.includes("DropdownMenu"))
  assert.ok(!slot.includes("useCustomProvider"))
  assert.ok(!slot.includes("AgentToolProvider"))
  assert.ok(router.includes('kind === "official"'))
  assert.ok(router.includes("OfficialPowerSlot"))
})
