import assert from "node:assert/strict"
import { test } from "node:test"
import type { Automation } from "@enjoy-agents/ipc-contract"
import { draftFromAutomation, draftToUpsert, emptyAutomationDraft } from "./draft.ts"

const defaults = { runtimeId: "enjoy-local", timeZone: "Asia/Shanghai" }

test("补跑开关默认关，upsert 会带上 catchUpMissed", () => {
  const empty = emptyAutomationDraft(defaults)
  assert.equal(empty.catchUpMissed, false)
  assert.equal(draftToUpsert({ ...empty, name: "晨间" }).catchUpMissed, false)

  const item = {
    id: "auto_1",
    name: "晨间",
    prompt: "x",
    trigger: "cron" as const,
    enabled: true,
    updatedAt: 1,
    catchUpMissed: true
  } satisfies Partial<Automation> as Automation
  const from = draftFromAutomation(item, defaults)
  assert.equal(from.catchUpMissed, true)
  assert.equal(draftToUpsert(from).catchUpMissed, true)
})
