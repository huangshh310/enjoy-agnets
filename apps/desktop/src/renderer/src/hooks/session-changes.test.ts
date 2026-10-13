import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { sessionScopedCount, sessionScopedPaths } from "./session-changes.ts"
import { reviewTurnPaths } from "../components/ai-chat/right-pane/views/review/review-turn-paths.ts"

const r = (baseline: "known" | "unknown" | "none", paths: string[]) => ({
  sessionId: "s",
  paths,
  sessionChangeCount: paths.length,
  hasWritingRuns: baseline !== "none",
  baseline
})

test("luna P2：「N 项」按会话口径；没写盘 run = 0；口径不可信回落整仓（fail-closed）", () => {
  assert.equal(sessionScopedCount(r("none", []), 1), 0)
  assert.equal(sessionScopedCount(r("known", ["a.txt"]), 2), 1)
  assert.equal(sessionScopedCount(r("unknown", []), 2), 2)
  assert.equal(sessionScopedCount(null, 2), 2)
  assert.deepEqual(sessionScopedPaths(r("none", [])), [])
  assert.equal(sessionScopedPaths(r("unknown", [])), null)
})

test("审查栏「本轮」：本轮没写盘时用会话口径，不掉进整仓", () => {
  assert.deepEqual(reviewTurnPaths([], []), [])
  assert.deepEqual(reviewTurnPaths([], ["a.txt"]), ["a.txt"])
  assert.deepEqual(reviewTurnPaths(["x.ts"], ["a.txt"]), ["x.ts"])
  assert.deepEqual(reviewTurnPaths([], null), [])
})

test("接线：空态「N 项」与审查栏都吃会话口径", () => {
  const stage = readFileSync(new URL("../components/app-shell/chat/chat-stage.tsx", import.meta.url), "utf8")
  assert.match(stage, /changesCount=\{sessionScopedCount\(sessionChanges, changes\.length\)\}/)
  const vm = readFileSync(
    new URL("../components/ai-chat/right-pane/views/review/use-review-view-model.ts", import.meta.url),
    "utf8"
  )
  assert.match(vm, /useFallbackEmptyLastTurn\(scope, lastTurnPaths\.length, sessionPaths \? 0 : props\.changes\.length/)
})

test("luna P2：侧栏当前行 +/- 走会话口径；只读会话不出 +N；不可信回落整仓", async () => {
  const { sessionChangesSummary } = await import("./session-changes.ts")
  const rows = [
    { path: "e2e-stub.txt", additions: 1, deletions: 0 },
    { path: "a.txt", additions: 3, deletions: 1 }
  ]
  const ws = { additions: 4, deletions: 1 }
  assert.deepEqual(sessionChangesSummary(r("none", []), rows, ws), { additions: 0, deletions: 0 })
  assert.deepEqual(sessionChangesSummary(r("known", ["a.txt"]), rows, ws), { additions: 3, deletions: 1 })
  assert.deepEqual(sessionChangesSummary(r("unknown", []), rows, ws), ws)
  assert.deepEqual(sessionChangesSummary(null, rows, ws), ws)
  assert.deepEqual(sessionChangesSummary(r("known", ["bin.png"]), rows, ws), { additions: 1, deletions: 0 })
  for (const f of ["sidebar-active-sessions.tsx", "sidebar-workspace-row.tsx", "sidebar-status-groups.tsx"]) {
    const src = readFileSync(new URL(`../components/ai-chat/sidebar/${f}`, import.meta.url), "utf8")
    assert.match(src, /const \{ additions, deletions \} = useSessionChangesSummary\(\)/, f)
    assert.doesNotMatch(src, /state\.additions/, f)
  }
})
