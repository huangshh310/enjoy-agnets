import assert from "node:assert/strict"
import { test } from "node:test"
import { clockHm, formatNeedsReviewSubtitle } from "./format-needs-review-subtitle.ts"

function t(path: string, vars?: Record<string, string | number>): string {
  if (path === "pages.inbox.changedFiles") {
    return `改了 ${vars?.files} 等 ${vars?.total} 个文件`
  }
  return path
}

test("有改动文件写文件名与钟点，缺文件只写时间", () => {
  const completedAt = "2026-10-10T08:05:00.000Z"
  const withFiles = formatNeedsReviewSubtitle(
    {
      changedFiles: { names: ["a.ts", "b.ts"], total: 4 },
      completedAt,
      occurredAt: Date.parse(completedAt)
    },
    t
  )
  assert.match(withFiles, /改了 a\.ts、b\.ts 等 4 个文件/)
  assert.match(withFiles, / · /)
  assert.equal(
    formatNeedsReviewSubtitle({ occurredAt: Date.parse("2026-10-10T08:05:00.000Z") }, t),
    clockHm("2026-10-10T08:05:00.000Z")
  )
})
