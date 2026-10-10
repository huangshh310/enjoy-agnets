import assert from "node:assert/strict"
import { test } from "node:test"
import {
  E2E_LEDGER_SESSION_TITLE,
  ledgerFixtureTools,
  shouldSeedE2eLedger
} from "./e2e-stub-ledger-data.ts"

test("默认 stub 不种账本，避免空会话测试被灌", () => {
  assert.equal(shouldSeedE2eLedger({ ENJOY_E2E_STUB: "1" }), false)
  assert.equal(shouldSeedE2eLedger({ ENJOY_E2E_LEDGER: "1" }), false)
})

test("AUTO-P2 或 ENJOY_E2E_LEDGER 才种本轮账本会话", () => {
  assert.equal(shouldSeedE2eLedger({ ENJOY_E2E_STUB: "1", ENJOY_E2E_LEDGER: "1" }), true)
  assert.equal(shouldSeedE2eLedger({ ENJOY_E2E_STUB: "1", ENJOY_DEV_SEED_AUTO_P2: "1" }), true)
})

test("夹具标题与长命令能收成账本行", () => {
  assert.equal(E2E_LEDGER_SESSION_TITLE, "本轮账本")
  const tools = ledgerFixtureTools()
  const commands = tools.filter((tool) => tool.name === "bash")
  assert.ok(commands.length >= 3)
  assert.ok(
    commands.some((tool) => {
      const command = (tool.args as { command?: string } | undefined)?.command ?? ""
      return command.length >= 40
    })
  )
  assert.ok(tools.some((tool) => tool.name === "read_file"))
  assert.ok(tools.some((tool) => tool.name === "edit_file"))
})
