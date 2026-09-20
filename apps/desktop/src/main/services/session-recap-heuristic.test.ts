import assert from "node:assert/strict"
import { test } from "node:test"
import { heuristicRecap } from "./session-recap-heuristic.ts"

test("启发式摘要剥围栏后再截用户句", () => {
  const text = heuristicRecap([
    {
      role: "user",
      content: "[Enjoy host mode: plan]\nDo not edit.\n[/Enjoy host mode]\n\n改登录页"
    },
    { role: "assistant", content: "好" }
  ])
  assert.match(text, /改登录页/)
  assert.doesNotMatch(text, /Enjoy host mode/)
  assert.match(text, /2 轮/)
})
