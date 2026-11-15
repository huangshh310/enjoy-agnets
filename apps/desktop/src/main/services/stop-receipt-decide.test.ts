/**
 * StopReceipt 判定表：覆盖 leo arch §5.2 七条，含缺账本 fail-closed。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { decideStopReceipt, type ReceiptLedgerEntry } from "./stop-receipt-decide.ts"

function entry(partial: Partial<ReceiptLedgerEntry> & Pick<ReceiptLedgerEntry, "op" | "phase">): ReceiptLedgerEntry {
  return {
    id: partial.id ?? "se_1",
    runId: "run_1",
    toolCallId: partial.toolCallId ?? "call_1",
    op: partial.op,
    phase: partial.phase,
    outcome: partial.outcome,
    pid: partial.pid,
    startedAt: partial.startedAt ?? 1000,
    settledAt: partial.settledAt,
    deadlineAt: partial.deadlineAt ?? 33_000,
    tree: partial.tree,
    external: partial.external
  }
}

test("§5.2.1 全部 blocked_before_start → none_confirmed", () => {
  const receipt = decideStopReceipt({
    entries: [entry({ op: "write_file", phase: "blocked_before_start", settledAt: 1001 })]
  })
  assert.equal(receipt.write, "none_confirmed")
  assert.equal(receipt.tools[0]?.write, "none_confirmed")
  assert.deepEqual(receipt.tools[0]?.evidence, ["gate_blocked_before_start"])
})

test("§5.2.1 账本无条目且仍在审批 → never_reached_executor / none_confirmed", () => {
  const receipt = decideStopReceipt({
    entries: [],
    knownTools: [{ toolCallId: "call_1", name: "write_file", pendingApproval: true }]
  })
  assert.equal(receipt.write, "none_confirmed")
  assert.deepEqual(receipt.tools[0]?.evidence, ["never_reached_executor"])
})

test("§5.2.2 fs.writeFile / git commit|branch 已 started 并以 ok 结束 → completed", () => {
  for (const op of ["write_file", "edit_file", "git_commit", "git_branch", "stub_write"] as const) {
    const receipt = decideStopReceipt({
      entries: [entry({ op, phase: "settled", outcome: "ok", settledAt: 1100 })]
    })
    assert.equal(receipt.write, "completed", op)
    assert.deepEqual(receipt.tools[0]?.evidence, ["fs_write_ok"])
  }
})

test("§5.2.3 进程类只要 spawn 过一律 maybe_partial（退得再快也一样）", () => {
  for (const outcome of ["exited", "killed", "unconfirmed"] as const) {
    const receipt = decideStopReceipt({
      entries: [
        entry({
          op: "bash",
          phase: "settled",
          outcome,
          pid: 42,
          tree: "confirmed"
        })
      ]
    })
    assert.equal(receipt.write, "maybe_partial", outcome)
    assert.equal(receipt.tools[0]?.exit, outcome)
  }
})

test("§5.2.3 git_push spawn 过 → maybe_partial", () => {
  const receipt = decideStopReceipt({
    entries: [entry({ op: "git_push", phase: "spawned", pid: 7 })]
  })
  assert.equal(receipt.write, "maybe_partial")
})

test("§5.2.4 started 但 error / unconfirmed，或 MCP / SSH → maybe_partial", () => {
  const errorWrite = decideStopReceipt({
    entries: [entry({ op: "write_file", phase: "settled", outcome: "error" })]
  })
  assert.equal(errorWrite.write, "maybe_partial")
  assert.deepEqual(errorWrite.tools[0]?.evidence, ["fs_write_error"])

  const mcp = decideStopReceipt({
    entries: [entry({ op: "mcp", phase: "settled", outcome: "ok", external: "mcp" })]
  })
  assert.equal(mcp.write, "maybe_partial")
  assert.ok(mcp.tools[0]?.evidence.includes("external_unverifiable"))

  const ssh = decideStopReceipt({
    entries: [entry({ op: "write_file", phase: "settled", outcome: "ok", external: "ssh" })]
  })
  assert.equal(ssh.write, "maybe_partial")
})

test("§5.2.5 账本缺失 / 字段坏 / toolCallId 对不上 → maybe_partial（fail-closed）", () => {
  const missing = decideStopReceipt({
    entries: [],
    knownTools: [{ toolCallId: "call_missing", name: "write_file" }]
  })
  assert.equal(missing.write, "maybe_partial")

  const badPhase = decideStopReceipt({
    entries: [entry({ op: "write_file", phase: "not-a-phase" as never })]
  })
  assert.equal(badPhase.write, "maybe_partial")

  const mismatch = decideStopReceipt({
    entries: [entry({ toolCallId: "call_other", op: "write_file", phase: "settled", outcome: "ok" })],
    knownTools: [{ toolCallId: "call_1", name: "write_file" }]
  })
  assert.equal(mismatch.write, "maybe_partial")
})

test("§5.2.6 聚合：maybe_partial > completed > none_confirmed；无写类工具 → none_confirmed", () => {
  const mixed = decideStopReceipt({
    entries: [
      entry({ id: "a", toolCallId: "w", op: "write_file", phase: "settled", outcome: "ok" }),
      entry({ id: "b", toolCallId: "b", op: "bash", phase: "settled", outcome: "killed", pid: 1 })
    ]
  })
  assert.equal(mixed.write, "maybe_partial")

  const completedWins = decideStopReceipt({
    entries: [
      entry({ id: "a", toolCallId: "w", op: "write_file", phase: "settled", outcome: "ok" }),
      entry({ id: "b", toolCallId: "c", op: "write_file", phase: "blocked_before_start" })
    ]
  })
  assert.equal(completedWins.write, "completed")

  const empty = decideStopReceipt({ entries: [] })
  assert.equal(empty.write, "none_confirmed")
})

test("§5.2.7 phase:stuck 里未 settle 的项按 maybe_partial 计", () => {
  const receipt = decideStopReceipt({
    phase: "stuck",
    entries: [entry({ op: "bash", phase: "spawned", pid: 9 })]
  })
  assert.equal(receipt.write, "maybe_partial")
  assert.equal(receipt.tools[0]?.exit, "unconfirmed")
})

test("code_mode 脚本 completed + bash spawned → 该工具 maybe_partial", () => {
  const receipt = decideStopReceipt({
    entries: [
      entry({ id: "s", toolCallId: "cm", op: "code_mode_script", phase: "settled", outcome: "ok" }),
      entry({ id: "b", toolCallId: "cm", op: "bash", phase: "settled", outcome: "killed", pid: 3 })
    ]
  })
  assert.equal(receipt.tools.length, 1)
  assert.equal(receipt.tools[0]?.name, "code_mode")
  assert.equal(receipt.write, "maybe_partial")
})
