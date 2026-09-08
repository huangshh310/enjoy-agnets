import assert from "node:assert/strict"
import { test } from "node:test"
import {
  canSubmitQuestion,
  emptyAnswer,
  otherKeyIndex,
  skipAnswer,
  toggleAnswer
} from "./ask-user-answers.ts"
import type { AskUserQuestion } from "./ask-user.types.ts"

function question(patch: Partial<AskUserQuestion> = {}): AskUserQuestion {
  return {
    id: "q-1",
    title: "鉴权？",
    options: [
      { id: "o-1", title: "Cookie" },
      { id: "o-2", title: "JWT" }
    ],
    multiSelect: false,
    allowOther: true,
    skippable: true,
    freeText: false,
    ...patch
  }
}

test("单选覆盖、多选切换", () => {
  const single = toggleAnswer({}, question(), "o-1")
  assert.deepEqual(single["q-1"]?.selectedIds, ["o-1"])
  const replaced = toggleAnswer(single, question(), "o-2")
  assert.deepEqual(replaced["q-1"]?.selectedIds, ["o-2"])
  const multi = toggleAnswer(replaced, question({ multiSelect: true }), "o-1")
  assert.deepEqual(multi["q-1"]?.selectedIds.sort(), ["o-1", "o-2"])
})

test("跳过清空选项；有选项或其它文本才能提交", () => {
  const skipped = skipAnswer({ "q-1": emptyAnswer("q-1") }, "q-1")
  assert.equal(skipped["q-1"]?.skipped, true)
  assert.equal(canSubmitQuestion(question(), skipped["q-1"]), false)
  assert.equal(canSubmitQuestion(question(), { questionId: "q-1", selectedIds: ["o-1"] }), true)
  assert.equal(
    canSubmitQuestion(question({ freeText: true }), { questionId: "q-1", selectedIds: [], otherText: "自定义" }),
    true
  )
})

test("其它在数字键里排在选项之后，纯文本占 1", () => {
  assert.equal(otherKeyIndex(question()), 2)
  assert.equal(otherKeyIndex(question({ allowOther: false })), null)
  assert.equal(otherKeyIndex(question({ freeText: true })), 0)
})
