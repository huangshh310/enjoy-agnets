/**
 * 审批梯度不变量：三档互斥、跟本机偏好走、不把协议 id 当文案。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  approvalGradientSummaryKey,
  approvalGradientTone,
  type ApprovalPrefFlags
} from "./approval-gradient.ts"

const ALL_ON: ApprovalPrefFlags = {
  requireWriteApproval: true,
  requireBashApproval: true,
  requireCommitApproval: true
}
const EDITS: ApprovalPrefFlags = {
  requireWriteApproval: false,
  requireBashApproval: true,
  requireCommitApproval: true
}
const ALL_OFF: ApprovalPrefFlags = {
  requireWriteApproval: false,
  requireBashApproval: false,
  requireCommitApproval: false
}
const CUSTOM: ApprovalPrefFlags = {
  requireWriteApproval: true,
  requireBashApproval: false,
  requireCommitApproval: true
}

test("全确认是默认态，全自动是警示态，其余是中态", () => {
  assert.equal(approvalGradientTone(ALL_ON), "default")
  assert.equal(approvalGradientTone(EDITS), "partial")
  assert.equal(approvalGradientTone(CUSTOM), "partial")
  assert.equal(approvalGradientTone(ALL_OFF), "yolo")
})

test("三档摘要键互斥，且不带协议 id", () => {
  const keys = [
    approvalGradientSummaryKey("default"),
    approvalGradientSummaryKey("partial"),
    approvalGradientSummaryKey("yolo")
  ]
  assert.deepEqual(keys, [
    "settings.approvalDiscover.summaryDefault",
    "settings.approvalDiscover.summaryPartial",
    "settings.approvalDiscover.summaryYolo"
  ])
  assert.equal(new Set(keys).size, 3)
  for (const key of keys) {
    assert.doesNotMatch(key, /allow-reads|allow-all|allow_session|requireWrite|permissionMode/)
  }
})

test("缺一项自动放行仍是中态，不会误判成警示", () => {
  assert.equal(
    approvalGradientTone({
      requireWriteApproval: false,
      requireBashApproval: false,
      requireCommitApproval: true
    }),
    "partial"
  )
})
