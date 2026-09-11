/**
 * 本机记录过滤：KPI 跟源级字段，混源日桶不得冒充单源。
 */
import assert from "node:assert/strict"
import test from "node:test"
import type { CliUsageBucket, CliUsageSource } from "@enjoy-agents/ipc-contract"
import {
  filterBuckets,
  grokTicksForView,
  idleGroups,
  isMixedBucket,
  rankContributions,
  resolveTotals,
  sourceToBucket,
  toggleSourceFilter,
  visibleHasUsage
} from "./filter.ts"

function source(partial: Partial<CliUsageSource> & Pick<CliUsageSource, "id" | "status">): CliUsageSource {
  return {
    sessionCount: 0,
    fileCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0,
    ...partial
  }
}

function bucket(partial: Partial<CliUsageBucket> & Pick<CliUsageBucket, "key">): CliUsageBucket {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheTokens: 0,
    totalTokens: 0,
    sessions: 0,
    breakdownSessions: 0,
    sourceIds: [],
    ...partial
  }
}

const grok = source({
  id: "grok",
  status: "has-usage",
  sessionCount: 48,
  fileCount: 48,
  inputTokens: 409_900_000,
  outputTokens: 2_300_000,
  cacheTokens: 390_200_000,
  totalTokens: 412_200_000,
  costUsdTicks: 687_200_000_000
})
const claude = source({
  id: "claude",
  status: "has-usage",
  sessionCount: 3,
  fileCount: 3,
  inputTokens: 9_700,
  outputTokens: 2_900_000,
  cacheTokens: 94_200_000,
  totalTokens: 97_200_000
})
const codex = source({
  id: "codex",
  status: "has-usage",
  sessionCount: 22,
  fileCount: 22,
  totalTokens: 1_200_000
})
const cursor = source({ id: "cursor", status: "unsupported" })
const gemini = source({ id: "gemini", status: "directory-missing" })

test("toggle 同一源再点一次清空", () => {
  assert.equal(toggleSourceFilter(null, "grok"), "grok")
  assert.equal(toggleSourceFilter("grok", "grok"), null)
  assert.equal(toggleSourceFilter("grok", "codex"), "codex")
})

test("visibleHasUsage 只留有用量，选中时只留一个", () => {
  const sources = [grok, claude, cursor]
  assert.deepEqual(
    visibleHasUsage(sources, null).map((item) => item.id),
    ["grok", "claude"]
  )
  assert.deepEqual(
    visibleHasUsage(sources, "grok").map((item) => item.id),
    ["grok"]
  )
})

test("rankContributions 按 token 降序，份额相对全部 has-usage", () => {
  const ranked = rankContributions([codex, grok, claude, cursor])
  assert.deepEqual(
    ranked.map((item) => item.source.id),
    ["grok", "claude", "codex"]
  )
  assert.equal(ranked[0]?.share, 81)
  assert.equal(ranked[1]?.share, 19)
  assert.equal(ranked[2]?.share, 0)
})

test("过滤 Grok 时 totals 用源级数字，不含混源日桶", () => {
  const days = [
    bucket({
      key: "2026-09-10",
      totalTokens: 329_400_000,
      sessions: 41,
      sourceIds: ["grok", "codex"]
    }),
    bucket({
      key: "2026-09-09",
      inputTokens: 176_000_000,
      outputTokens: 804_700,
      cacheTokens: 171_000_000,
      totalTokens: 176_800_000,
      sessions: 13,
      breakdownSessions: 13,
      sourceIds: ["grok"]
    })
  ]
  const filtered = resolveTotals([grok, claude, codex], days, "grok")
  assert.equal(filtered.totalTokens, grok.totalTokens)
  assert.equal(filtered.sessions, 48)
  assert.equal(filtered.inputTokens, grok.inputTokens)
  const all = resolveTotals([grok, claude, codex], days, null)
  assert.equal(all.totalTokens, 329_400_000 + 176_800_000)
})

test("filterBuckets 保留含该源的混源行", () => {
  const rows = [
    bucket({ key: "mixed", totalTokens: 10, sourceIds: ["grok", "codex"] }),
    bucket({ key: "pure", totalTokens: 5, sourceIds: ["claude"] })
  ]
  const grokRows = filterBuckets(rows, "grok")
  assert.deepEqual(
    grokRows.map((row) => row.key),
    ["mixed"]
  )
  assert.equal(isMixedBucket(grokRows[0]!), true)
})

test("idleGroups 按空态 / 缺失 / 不扫描分组，跳过 has-usage", () => {
  const groups = idleGroups([grok, cursor, gemini, source({ id: "pi", status: "scanned-empty", fileCount: 2 })])
  assert.deepEqual(
    groups.map((group) => group.status),
    ["scanned-empty", "directory-missing", "unsupported"]
  )
})

test("Grok 费用只在未过滤或过滤 Grok 时出现", () => {
  const sources = [grok, claude]
  assert.equal(grokTicksForView(sources, null), grok.costUsdTicks)
  assert.equal(grokTicksForView(sources, "grok"), grok.costUsdTicks)
  assert.equal(grokTicksForView(sources, "claude"), undefined)
})

test("sourceToBucket 无拆分时 breakdownSessions 为 0", () => {
  const onlyTotal = sourceToBucket(codex)
  assert.equal(onlyTotal.breakdownSessions, 0)
  assert.equal(sourceToBucket(grok).breakdownSessions, 48)
})
