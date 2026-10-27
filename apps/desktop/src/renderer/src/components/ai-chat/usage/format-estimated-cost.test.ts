/**
 * COST-P3 format：五态 + tier / <$0.01 / 禁 $0.00。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  formatEstimatedCost,
  formatSessionCostHover,
  formatUsdAmount
} from "./format-estimated-cost.ts"

const zh: Record<string, string> = {
  "chat.usage.costEstimatePrefix": "估算",
  "chat.usage.costLocalUnbilled": "本地 · 不计费",
  "chat.usage.costLocalUnbilledHint": "本地模型不计费",
  "chat.usage.costEngineFallback": "引擎",
  "chat.usage.costReported": "{amount} · {engine} 上报",
  "chat.usage.costReportedHint": "{engine} 上报，不是 Enjoy 估算",
  "chat.usage.costSourceUser": "你填的单价",
  "chat.usage.costSourceSnapshot": "models.dev 快照",
  "chat.usage.costSourceSnapshotDated": "models.dev 快照 · {date}",
  "chat.usage.costNotBillFootnote": "这是按单价算的估算，不是账单",
  "chat.usage.costUnknownPrice": "价格未知，可在供应商设置里填写",
  "chat.usage.costUnknownTier": "用量跨过分档，整次不估算",
  "chat.usage.costUnknownMissing": "缺「{item}」单价，整次不估算",
  "chat.usage.costUnknownUsage": "用量不完整，整次不估算",
  "chat.usage.costMissingInput": "输入",
  "chat.usage.costMissingOutput": "输出",
  "chat.usage.costMissingCacheRead": "缓存读",
  "chat.usage.costMissingCacheWrite": "缓存写",
  "chat.usage.costMissingReasoning": "推理",
  "chat.usage.sessionMeterHint": "本轮用量 · 上下文占用",
  "chat.usage.sessionCostKnown": "估算 {amount}",
  "chat.usage.sessionCostKnownPartial": "已知部分 估算 {amount} · {n} 次价格未知",
  "chat.usage.sessionCostPartialHint": "{known} 次可估已加总；{n} 次未命中或缺项，不拿 $0 凑进去。",
  "chat.usage.sessionCostAllUnknown": "{n} 次价格未知",
  "chat.usage.sessionCostReported": "另有引擎上报 {amount}"
}

function t(path: string, vars?: Record<string, string | number>): string {
  let out = zh[path] ?? path
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v))
  }
  return out
}

test("formatUsdAmount：小于一分与两位小数", () => {
  assert.equal(formatUsdAmount(0.004), "<$0.01")
  assert.equal(formatUsdAmount(0.42), "$0.42")
  assert.equal(formatUsdAmount(0), "$0.00")
})

test("estimated：前缀估算 + 快照悬停", () => {
  const chrome = formatEstimatedCost(
    { status: "estimated", usd: 0.42, source: "snapshot", snapshotDate: "2026-10-01" },
    t
  )
  assert.equal(chrome.prefix, "估算")
  assert.equal(chrome.text, "$0.42")
  assert.match(chrome.title, /models\.dev 快照 · 2026-10-01/)
  assert.match(chrome.title, /不是账单/)
})

test("estimated：用户单价来源", () => {
  const chrome = formatEstimatedCost({ status: "estimated", usd: 0.01, source: "user" }, t)
  assert.equal(chrome.text, "$0.01")
  assert.match(chrome.title, /你填的单价/)
})

test("unknown：禁 $0.00；tier / 缺项 / 价格未知", () => {
  const plain = formatEstimatedCost({ status: "unknown", missing: ["price"] }, t)
  assert.equal(plain.text, "—")
  assert.doesNotMatch(plain.text ?? "", /\$0/)
  assert.match(plain.title, /价格未知/)

  const tier = formatEstimatedCost({ status: "unknown", missing: ["tier"] }, t)
  assert.equal(tier.text, "—")
  assert.match(tier.title, /分档/)

  const miss = formatEstimatedCost({ status: "unknown", missing: ["cacheWrite"] }, t)
  assert.match(miss.title, /缓存写/)
})

test("local_unbilled / reported / not_reported", () => {
  assert.equal(formatEstimatedCost({ status: "local_unbilled" }, t).text, "本地 · 不计费")
  const reported = formatEstimatedCost({ status: "reported", usd: 1.2 }, t, { engineLabel: "Claude Code" })
  assert.equal(reported.text, "$1.20 · Claude Code 上报")
  assert.equal(formatEstimatedCost({ status: "not_reported" }, t).text, null)
  assert.equal(formatEstimatedCost(undefined, t).text, null)
})

test("session hover：已知 + 未知 + 上报", () => {
  const title = formatSessionCostHover(
    {
      sessionId: "s1",
      knownUsd: 0.6,
      unknownCount: 2,
      reportedUsd: 1.2,
      runs: [
        { runId: "a", status: "estimated", usd: 0.3 },
        { runId: "b", status: "estimated", usd: 0.3 },
        { runId: "c", status: "unknown" },
        { runId: "d", status: "unknown" },
        { runId: "e", status: "reported", usd: 1.2 }
      ]
    },
    t
  )
  assert.match(title, /已知部分/)
  assert.match(title, /\$0\.60/)
  assert.match(title, /另有引擎上报/)
  assert.doesNotMatch(title, /\$0\.00/)
})

test("unknown 带 usd:0 仍画横线，不出现 $0.00", () => {
  const chrome = formatEstimatedCost({ status: "unknown", usd: 0, missing: ["price"] } as never, t)
  assert.equal(chrome.text, "—")
  assert.doesNotMatch(chrome.text ?? "", /\$0/)
})

test("trace 路径：unknown 与 estimated 分流", () => {
  const unknown = formatEstimatedCost({ status: "unknown", missing: ["tier"] }, t)
  assert.equal(unknown.text, "—")
  const est = formatEstimatedCost({ status: "estimated", usd: 0.42, source: "snapshot" }, t)
  assert.equal(est.text, "$0.42")
  assert.notEqual(est.text, "$0.00")
})
