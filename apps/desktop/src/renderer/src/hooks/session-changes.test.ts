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
