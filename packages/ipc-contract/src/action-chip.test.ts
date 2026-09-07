import assert from "node:assert/strict"
import { test } from "node:test"
import { parseEnjoyActionsBlock, stripEnjoyActionsBlock, takeActionChips } from "./action-chip.ts"

const sample = `改完了登录页。

:::enjoy-actions
- [queue] 补测试: 请为刚才的改动补上单测
- [fill] 解释改动: 用中文说明改了哪些文件
:::
`

test("解析引导词块，fill 别名成 fill_input，最多 4 条", () => {
  const chips = parseEnjoyActionsBlock(sample)
  assert.equal(chips.length, 2)
  assert.equal(chips[0]?.actionType, "queue")
  assert.equal(chips[0]?.label, "补测试")
  assert.equal(chips[1]?.actionType, "fill_input")
  assert.equal(chips[1]?.prompt, "用中文说明改了哪些文件")
})

test("剥离围栏后正文不再含协议标记", () => {
  const visible = stripEnjoyActionsBlock(sample)
  assert.match(visible, /改完了登录页/)
  assert.doesNotMatch(visible, /enjoy-actions/)
  assert.doesNotMatch(visible, /补测试/)
})

test("已有 chips 不再从正文重解析，仍剥离围栏", () => {
  const taken = takeActionChips(sample, [
    { id: "keep", label: "已落库", prompt: "保持", actionType: "queue" }
  ])
  assert.equal(taken.chips[0]?.id, "keep")
  assert.equal(taken.content.includes(":::"), false)
})
