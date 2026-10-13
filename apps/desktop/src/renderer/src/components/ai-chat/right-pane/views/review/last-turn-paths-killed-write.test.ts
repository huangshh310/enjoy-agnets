/**
 * jojo（#146 后续）：只有审批结论信封（没有工具真输出）的写行是「未证实写盘」。
 * fail-closed：git 确认没改动才藏胶囊；非 git / 读不到 git 时照列（可能写了一半就被杀）。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { isApprovalEnvelopeOnly, pathsFromLastTurn, unconfirmedPathsFromLastTurn } from "./last-turn-paths.ts"
import { describeReviewFiles } from "../../../composer/session-review/collect-session-files.ts"

const turn = (result: unknown) =>
  [
    { id: "u1", role: "user", content: "please write a note", createdAt: 1 },
    {
      id: "a1",
      role: "assistant",
      content: "",
      createdAt: 2,
      tools: [{ id: "t1", name: "write_file", state: "output-available", args: { path: "e2e-stub.txt" }, result }]
    }
  ] as never

function capsules(messages: never, gitRepo: boolean | null, changes: Array<{ path: string }> = []) {
  return describeReviewFiles(pathsFromLastTurn(messages), changes as never, false, gitRepo, {
    unconfirmed: unconfirmedPathsFromLastTurn(messages)
  }).files.map((file) => file.path)
}

test("只有 { decision: allow }：git 确认没改动 → 无胶囊", () => {
  assert.equal(isApprovalEnvelopeOnly({ decision: "allow" }), true)
  assert.deepEqual(capsules(turn({ decision: "allow" }), true), [])
})

test("fail-closed：只有审批结论但 git 显示已改 → 保留胶囊；非 git / 不确定 → 保留", () => {
  const killedAfterWrite = turn({ decision: "allow" })
  assert.deepEqual(capsules(killedAfterWrite, true, [{ path: "e2e-stub.txt", additions: 1, deletions: 0 } as never]), [
    "e2e-stub.txt"
  ])
  assert.deepEqual(capsules(killedAfterWrite, false), ["e2e-stub.txt"])
  assert.deepEqual(capsules(killedAfterWrite, null), ["e2e-stub.txt"])
})

test("真写盘结果不受影响", () => {
  assert.equal(isApprovalEnvelopeOnly({ path: "e2e-stub.txt", bytes: 1 }), false)
  assert.deepEqual(capsules(turn({ ok: true, path: "e2e-stub.txt" }), true), ["e2e-stub.txt"])
})
