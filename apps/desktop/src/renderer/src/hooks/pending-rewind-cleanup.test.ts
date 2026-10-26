/**
 * gate-167 P3：会话没了（prune / 删除 / 归档）后 enjoy-agents-pending-rewinds 不得残留该 sessionId。
 * - forgetPendingRewindsNotIn：对照「还在的会话」扫幽灵键（refresh 灌侧栏后走这条，覆盖 prune）。
 * - archiveCurrentSession / discardEmpty 成功删：显式 forget（归档会话仍在归档表，reconcile 不会清）。
 * 不破坏 discard-empty-on-leave 对「有 pending 就不删空会话」的守卫。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const KEY = "enjoy-agents-pending-rewinds"
const memory = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, String(v)),
  removeItem: (k: string) => void memory.delete(k),
  clear: () => memory.clear(),
  key: () => null,
  length: 0
} as Storage

function bridge(path: string): unknown {
  return new Proxy(() => undefined, {
    get: (_t, key) => (key === "then" ? undefined : bridge(`${path}.${String(key)}`)),
    apply: () => (/\.on[A-Z]\w*$/.test(path) ? () => undefined : Promise.resolve(undefined))
  })
}
;(globalThis as { window?: { ide: unknown } }).window = { ide: bridge("") }

const pendingMod = await import("./rewind-pending.ts")

test("forgetPendingRewindsNotIn：不在名单里的 sessionId 从内存和 localStorage 清掉，名单里的留着", () => {
  pendingMod.resetPendingRewindsForTest(null)
  pendingMod.recordPendingRewind("ses_gone", "原话甲", [])
  pendingMod.recordPendingRewind("ses_keep", "原话乙", [])
  pendingMod.forgetPendingRewindsNotIn(["ses_keep", "ses_archived"])
  assert.equal(pendingMod.readPendingRewind("ses_gone"), undefined)
  assert.equal(pendingMod.readPendingRewind("ses_keep")?.text, "原话乙")
  const raw = JSON.parse(memory.get(KEY) ?? "{}") as Record<string, unknown>
  assert.equal("ses_gone" in raw, false)
  assert.ok(raw.ses_keep)
  pendingMod.resetPendingRewindsForTest(null)
})

test("forgetPendingRewindsNotIn：名单为空 → 全部清掉（模拟 prune 后侧栏+归档都没有）", () => {
  pendingMod.resetPendingRewindsForTest(null)
  pendingMod.recordPendingRewind("ses_pruned", "原话丙", [])
  pendingMod.forgetPendingRewindsNotIn(new Set())
  assert.equal(pendingMod.readPendingRewind("ses_pruned"), undefined)
  assert.equal(memory.get(KEY), undefined)
  pendingMod.resetPendingRewindsForTest(null)
})

test("接线：归档当前会话显式 forgetPendingRewinds（归档表还在，reconcile 清不掉）", () => {
  const src = readFileSync(new URL("./workspace-lifecycle.ts", import.meta.url), "utf8")
  assert.match(src, /session\.archive[\s\S]*?forgetPendingRewinds\(\[sessionId\]\)/)
})

test("接线：离开即删成功后 forgetPendingRewinds；有 pending 仍不删空会话", () => {
  const discard = readFileSync(new URL("./discard-empty-on-leave.ts", import.meta.url), "utf8")
  assert.match(discard, /if \(readPendingRewind\(id\)\) return null/)
  assert.match(discard, /deleted\?: boolean[\s\S]*?forgetPendingRewinds\(\[id\]\)/)
})

test("接线：refreshAllWorkspaces 灌完侧栏后 syncPendingRewindsWithKnownSessions（覆盖 prune）", () => {
  const src = readFileSync(new URL("./refresh-workspaces.ts", import.meta.url), "utf8")
  assert.match(src, /syncPendingRewindsWithKnownSessions\(lastSuccess\?\.items/)
  assert.match(src, /forgetPendingRewindsNotIn\(known\)/)
  assert.match(src, /session\.listArchived/)
})
