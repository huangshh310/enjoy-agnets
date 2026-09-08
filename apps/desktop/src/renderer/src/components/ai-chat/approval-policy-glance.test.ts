import assert from "node:assert/strict"
import { test } from "node:test"
import { approvalGlanceLabel } from "./approval-policy-glance.ts"

const t = (path: string) => path.replace("attention.glance.", "")

test("一瞥按开关拼写入 / Shell / Git，全部放行也要看得见", () => {
  assert.equal(
    approvalGlanceLabel(
      { requireWriteApproval: true, requireBashApproval: true, requireCommitApproval: true },
      t
    ),
    "writeNeed · shellNeed · gitNeed"
  )
  assert.equal(
    approvalGlanceLabel(
      { requireWriteApproval: false, requireBashApproval: false, requireCommitApproval: false },
      t
    ),
    "writeAuto · shellAuto · gitAuto"
  )
})
