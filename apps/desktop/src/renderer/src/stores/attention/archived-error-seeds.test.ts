import assert from "node:assert/strict"
import { test } from "node:test"
import { archivedErrorSeeds } from "./archived-error-seeds.ts"

const e = (sessionId: string, status: string, occurredAt = 1, kind = "error") => ({
  item: { id: `${sessionId}:${kind}`, sessionId, kind, status, occurredAt, summary: "x", sessionTitle: sessionId }
})

test("重启回填：只回填还没好的出错；关过 / 已好 / 之后成功 / 隐藏的不回填（luna #150 P2）", () => {
  const seeds = archivedErrorSeeds([
    e("a", "active"),
    e("b", "focused"),
    e("c", "dismissed"),
    e("d", "resolved"),
    e("f", "active", 1),
    e("f", "resolved", 5, "complete"),
    { hiddenAt: 3, ...e("g", "active") }
  ])
  assert.deepEqual(seeds.map((s) => s.sessionId).sort(), ["a", "b"])
  assert.ok(seeds.every((s) => s.status === "active"))
})
