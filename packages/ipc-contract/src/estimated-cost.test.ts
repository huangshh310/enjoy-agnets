import assert from "node:assert/strict"
import { test } from "node:test"
import {
  EstimatedCost,
  SessionEstimatedCost,
  SessionRunEstimate,
  summarizeSessionCosts
} from "./estimated-cost.ts"

test("未知枚举不丢掉整行估算", () => {
  const parsed = EstimatedCost.safeParse({
    status: "not-a-status",
    usd: 0.42,
    source: "ancient",
    missing: ["warp"]
  })
  assert.equal(parsed.success, true)
  assert.equal(parsed.data?.status, undefined)
  assert.equal(parsed.data?.usd, 0.42)
  assert.equal(parsed.data?.source, undefined)
  assert.equal(parsed.data?.missing, undefined)
})

test("会话合计：已知部分 + 未知次数；本地与未上报不计入", () => {
  const runs = [
    SessionRunEstimate.parse({ runId: "a", status: "estimated", usd: 0.2, source: "snapshot" }),
    SessionRunEstimate.parse({ runId: "b", status: "unknown", missing: ["cacheRead"] }),
    SessionRunEstimate.parse({ runId: "c", status: "local_unbilled" }),
    SessionRunEstimate.parse({ runId: "d", status: "not_reported" }),
    SessionRunEstimate.parse({ runId: "e", status: "reported", usd: 1.2, source: "engine" })
  ]
  const sum = summarizeSessionCosts("ses_1", runs)
  assert.equal(sum.knownUsd, 0.2)
  assert.equal(sum.unknownCount, 1)
  assert.equal(sum.reportedUsd, 1.2)
  assert.equal(SessionEstimatedCost.parse(sum).sessionId, "ses_1")
})

test("缺用量枚举可解析，不丢整行", () => {
  const parsed = EstimatedCost.parse({ status: "unknown", missing: ["usage"] })
  assert.equal(parsed.status, "unknown")
  assert.deepEqual(parsed.missing, ["usage"])
})

test("分档缺项枚举可解析，未知值不丢整行", () => {
  const parsed = EstimatedCost.parse({ status: "unknown", missing: ["tier"] })
  assert.equal(parsed.status, "unknown")
  assert.deepEqual(parsed.missing, ["tier"])
  const old = EstimatedCost.safeParse({ status: "unknown", missing: ["warp"] })
  assert.equal(old.success, true)
  assert.equal(old.data?.missing, undefined)
})

test("同一 ACP 会话多个 run 的累计费用只取最后一次", () => {
  const sum = summarizeSessionCosts("ses_acp", [
    { runId: "r1", status: "reported", usd: 0.1, source: "engine", endedAt: 10 },
    { runId: "r2", status: "reported", usd: 0.3, source: "engine", endedAt: 20 },
    { runId: "r3", status: "reported", usd: 0.6, source: "engine", endedAt: 30 }
  ])
  assert.equal(sum.reportedUsd, 0.6)
  assert.equal(sum.unknownCount, 0)
})

test("endedAt 非法值 catch 掉，不丢整行", () => {
  const parsed = SessionRunEstimate.safeParse({
    runId: "r1",
    status: "reported",
    usd: 0.2,
    source: "engine",
    endedAt: "later"
  })
  assert.equal(parsed.success, true)
  assert.equal(parsed.data?.usd, 0.2)
  assert.equal(parsed.data?.endedAt, undefined)
})

test("两个 ACP 会话的累计费用按组相加", () => {
  const sum = summarizeSessionCosts("ses_groups", [
    { runId: "a1", status: "reported", usd: 0.2, source: "engine", runtimeId: "claude", acpSessionId: "s1" },
    { runId: "b1", status: "reported", usd: 0.5, source: "engine", runtimeId: "claude", acpSessionId: "s2" }
  ])
  assert.equal(sum.reportedUsd, 0.7)
})

test("ACP 累计费用按结束时间取最后一次，不按数组顺序相加", () => {
  const sum = summarizeSessionCosts("ses_acp_order", [
    { runId: "late", status: "reported", usd: 0.6, source: "engine", endedAt: 30 },
    { runId: "early", status: "reported", usd: 0.1, source: "engine", endedAt: 10 },
    { runId: "mid", status: "reported", usd: 0.3, source: "engine", endedAt: 20 }
  ])
  assert.equal(sum.reportedUsd, 0.6)
})

test("全是本地或未上报时没有假总额", () => {
  const sum = summarizeSessionCosts("ses_2", [
    { runId: "a", status: "local_unbilled" },
    { runId: "b", status: "not_reported" }
  ])
  assert.equal(sum.knownUsd, undefined)
  assert.equal(sum.unknownCount, 0)
  assert.equal(sum.reportedUsd, undefined)
})
