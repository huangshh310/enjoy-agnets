/**
 * jojo（#146 后续）：批了但没真写盘（只有审批结论信封）的写行不算改动，不出文件胶囊。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { isApprovalEnvelopeOnly, pathsFromLastTurn } from "./last-turn-paths.ts"

const turn = (result: unknown) => [
  { id: "u1", role: "user" as const, content: "please write a note", createdAt: 1 },
  {
    id: "a1",
    role: "assistant" as const,
    content: "",
    createdAt: 2,
    tools: [
      {
        id: "t1",
        name: "write_file",
        state: "output-available" as const,
        args: { path: "e2e-stub.txt", content: "x" },
        result
      }
    ]
  }
]

test("只有 { decision: allow } 的写行（强杀前没真写）→ 无胶囊", () => {
  assert.equal(isApprovalEnvelopeOnly({ decision: "allow" }), true)
  assert.deepEqual(pathsFromLastTurn(turn({ decision: "allow" }) as never), [])
})

test("真写盘结果仍算改动", () => {
  assert.equal(isApprovalEnvelopeOnly({ path: "e2e-stub.txt", bytes: 1 }), false)
  assert.deepEqual(pathsFromLastTurn(turn({ path: "e2e-stub.txt", bytes: 1 }) as never), ["e2e-stub.txt"])
  assert.deepEqual(pathsFromLastTurn(turn("ok") as never), ["e2e-stub.txt"])
})
