import assert from "node:assert/strict"
import { test } from "node:test"
import {
  markHeuristicRecap,
  recapIsHeuristic,
  storeSessionRecap,
  visibleRecapText
} from "./session-recap-kind.ts"

test("启发式头标可识别、可剥、不叠两层", () => {
  const stored = markHeuristicRecap("已拆登录")
  assert.equal(recapIsHeuristic(stored), true)
  assert.equal(visibleRecapText(stored), "已拆登录")
  assert.equal(markHeuristicRecap(stored), stored)
  assert.equal(storeSessionRecap("模型写的", false), "模型写的")
  assert.equal(recapIsHeuristic("模型写的"), false)
})
