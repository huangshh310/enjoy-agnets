import assert from "node:assert/strict"
import { test } from "node:test"
import { ledgerKindCounts, ledgerSummarySegments } from "./run-ledger-summary.ts"
import type { RunLedgerEntry } from "./run-ledger.types.ts"

test("摘要按改/读/命令/失败拼段，失败单独标 warn", () => {
  const entries = [
    { id: "1", kind: "edit", title: "a.ts" },
    { id: "2", kind: "edit", title: "b.ts" },
    { id: "3", kind: "command", title: "lint" },
    { id: "4", kind: "error", title: "c.ts" }
  ] as RunLedgerEntry[]
  const counts = ledgerKindCounts(entries)
  assert.deepEqual(counts, { read: 0, edit: 2, command: 1, error: 1 })
  const segs = ledgerSummarySegments(counts, (path, vars) => `${path}:${vars?.n ?? ""}`)
  assert.deepEqual(
    segs.map((seg) => [seg.text, Boolean(seg.warn)]),
    [
      ["sessionOps.ledgerSummaryEdit:2", false],
      ["sessionOps.ledgerSummaryCommand:1", false],
      ["sessionOps.ledgerSummaryError:1", true]
    ]
  )
})
