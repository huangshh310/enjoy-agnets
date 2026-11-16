import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const frame = readFileSync(join(dir, "composer-activity-frame.tsx"), "utf8").replace(/\/\/.*$/gm, "")
const chip = readFileSync(join(dir, "../runtime-interact/composer-queue-chip.tsx"), "utf8")

test("B1：审批卡在场且有排队时「N 条等待」芯片条件渲染为 null（不是 hidden / 透明），审批走掉后照常回来", () => {
  assert.match(
    frame,
    /\{pendingApproval && queueChipShown \? null : \(\s*<div className="flex items-center gap-1\.5 px-3 empty:hidden">\s*<ComposerQueueChip \/>\s*<\/div>\s*\)\}/
  )
  // 只有这一处挂芯片，且不是靠样式藏起来
  assert.equal(frame.match(/<ComposerQueueChip \/>/g)?.length, 1)
  assert.doesNotMatch(frame, /pendingApproval[^\n]*(hidden|invisible|opacity-0|sr-only)/)
})

test("B1：「芯片要画」判据与 ComposerQueueChip 自己的一致（有会话且该会话有排队项），只读不写", () => {
  assert.match(frame, /useSyncExternalStore\(\s*subscribeFollowups,\s*\(\) => Boolean\(sessionId\) && listFollowups\(sessionId\)\.length > 0\s*\)/)
  assert.match(chip, /if \(!sessionId \|\| items\.length === 0\) return null/)
  assert.doesNotMatch(frame, /enqueueFollowup|removeFollowup|moveFollowup|discardFollowup|returnFollowupToComposer|clearFollowups/)
})

test("B1：只改显示层——芯片自身的数据来源和行为不变（listFollowups / subscribeFollowups，没有审批判断）", () => {
  assert.match(chip, /listFollowups\(sessionId\)/)
  assert.match(chip, /subscribeFollowups\(sync\)/)
  assert.doesNotMatch(chip, /pendingApproval/)
})
