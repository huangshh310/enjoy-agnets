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

test("全是本地或未上报时没有假总额", () => {
  const sum = summarizeSessionCosts("ses_2", [
    { runId: "a", status: "local_unbilled" },
    { runId: "b", status: "not_reported" }
  ])
  assert.equal(sum.knownUsd, undefined)
  assert.equal(sum.unknownCount, 0)
  assert.equal(sum.reportedUsd, undefined)
})
