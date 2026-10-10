/**
 * 次行：单次已跳过、连续错过 N 次、超时非红。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import type { Automation, AutomationMissedRecord } from "@enjoy-agents/ipc-contract"
import { zh } from "../../../i18n/catalogs/zh/index.ts"
import { translate } from "../../../i18n/lookup.ts"
import { consecutiveSkipStreak, lastRunLine, missedGroupSummary } from "./last-run-line.ts"

const t = (path: string, vars?: Record<string, string | number>) => translate(zh, path, vars)
const noon = new Date(2026, 9, 9, 12, 0, 0).getTime()
const today8 = new Date(2026, 9, 9, 8, 0, 0).getTime()
const yest8 = new Date(2026, 9, 8, 8, 0, 0).getTime()
const ere8 = new Date(2026, 9, 7, 8, 0, 0).getTime()

function auto(patch: Partial<Automation>): Automation {
  return {
    id: "auto_1",
    name: "晨间待办整理",
    prompt: "x",
    trigger: "cron",
    enabled: true,
    updatedAt: noon,
    ...patch
  }
}

function skip(at: number, reason: AutomationMissedRecord["reason"] = "system_sleep"): AutomationMissedRecord {
  return {
    automationId: "auto_1",
    scheduledAt: at,
    recordedAt: at + 60_000,
    kind: "skipped",
    reason,
    status: "skipped"
  }
}

test("单次跳过写已跳过 · 人话原因 · 时间", () => {
  const line = lastRunLine({
    automation: auto({ lastRunStatus: "skipped", lastSkipReason: "system_sleep", lastRunAt: today8 }),
    records: [skip(today8)],
    now: noon,
    locale: "zh",
    t
  })
  assert.equal(line.kind, "skipped")
  assert.equal(line.text, "已跳过 · 电脑睡眠 · 今天 08:00")
  assert.equal(line.testId, "automation-row-skipped")
  assert.match(line.tip ?? "", /睡着/)
})

test("连续同因收成错过 N 次", () => {
  const records = [skip(today8), skip(yest8), skip(ere8)]
  const streak = consecutiveSkipStreak(records)
  assert.equal(streak.count, 3)
  const line = lastRunLine({
    automation: auto({ lastRunStatus: "skipped", lastSkipReason: "system_sleep", lastRunAt: today8 }),
    records,
    now: noon,
    locale: "zh",
    t
  })
  assert.equal(line.kind, "missed_many")
  assert.equal(line.text, "错过 3 次 · 电脑睡眠 · 今天 08:00")
  assert.equal(line.testId, "automation-row-missed-many")
})

test("列表混因与抽屉同一句", () => {
  const records = [
    skip(today8, "app_not_running"),
    skip(yest8, "system_sleep"),
    skip(ere8, "system_sleep")
  ]
  const line = lastRunLine({
    automation: auto({ lastRunStatus: "skipped", lastSkipReason: "app_not_running", lastRunAt: today8 }),
    records,
    now: noon,
    locale: "zh",
    t
  })
  const drawer = missedGroupSummary({ records, now: noon, locale: "zh", t })
  assert.equal(line.text, drawer)
  assert.equal(line.text, "错过 3 次 · 最近一次应用未运行 · 今天 08:00")
})

test("不同原因或补跑会打断连续计数", () => {
  const mixed = [
    skip(today8, "app_not_running"),
    skip(yest8, "system_sleep"),
    skip(ere8, "system_sleep")
  ]
  assert.equal(consecutiveSkipStreak(mixed).count, 1)
  const afterCatchUp: AutomationMissedRecord[] = [
    {
      automationId: "auto_1",
      scheduledAt: today8,
      recordedAt: noon,
      kind: "catch_up",
      isCatchUp: true,
      status: "ok"
    },
    skip(yest8),
    skip(ere8)
  ]
  assert.equal(consecutiveSkipStreak(afterCatchUp).count, 0)
})

test("超时码走人话中性句，不看 lastError", () => {
  const line = lastRunLine({
    automation: auto({
      lastRunStatus: "failed",
      lastRunErrorCode: "catch_up_approval_timeout",
      lastError: "catch_up_approval_timeout exploded",
      lastRunAt: noon
    }),
    records: [],
    now: noon,
    locale: "zh",
    t
  })
  assert.equal(line.kind, "neutral")
  assert.equal(line.text, "补跑等待确认超时，未运行 · 今天 12:00")
  assert.match(line.tip ?? "", /30 分钟/)
  assert.equal(line.text.includes("catch_up"), false)
  assert.equal(line.text.includes("exploded"), false)
})

test("抽屉折叠条收成错过 N 次组摘要", () => {
  const records = [skip(today8), skip(yest8), skip(ere8)]
  assert.equal(
    missedGroupSummary({ records, now: noon, locale: "zh", t }),
    "错过 3 次 · 电脑睡眠 · 今天 08:00"
  )
  assert.equal(
    missedGroupSummary({ records: [skip(today8)], now: noon, locale: "zh", t }),
    "已跳过 · 电脑睡眠 · 今天 08:00"
  )
})

test("折叠条混因写最近原因，条数按整组", () => {
  const mixed = [
    skip(today8, "app_not_running"),
    skip(yest8, "system_sleep"),
    skip(ere8, "system_sleep")
  ]
  assert.equal(
    missedGroupSummary({ records: mixed, now: noon, locale: "zh", t }),
    "错过 3 次 · 最近一次应用未运行 · 今天 08:00"
  )
})
