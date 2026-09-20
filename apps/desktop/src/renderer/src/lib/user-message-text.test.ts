import assert from "node:assert/strict"
import { test } from "node:test"
import { listRecallPrompts, visibleUserText } from "./user-message-text.ts"

test("剥引用块与宿主围栏，只留用户正文", () => {
  const quoted = "> [引用自文件: src/a.ts]\n> snippet\n\n请改这里"
  assert.equal(visibleUserText(quoted), "请改这里")
  const fenced = "[Enjoy host mode: plan]\nDo not edit.\n[/Enjoy host mode]\n\n只读看看"
  assert.equal(visibleUserText(fenced), "只读看看")
  const context = "[Enjoy session context]\nGoal: 改登录\n[/Enjoy session context]\n\n继续"
  assert.equal(visibleUserText(context), "继续")
})

test("召回列表最近的在前，空用户句丢掉", () => {
  const prompts = listRecallPrompts([
    { role: "user", content: "第一句" },
    { role: "assistant", content: "好" },
    { role: "user", content: "   " },
    { role: "user", content: "第二句" }
  ])
  assert.deepEqual(prompts, ["第二句", "第一句"])
})
