import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizeAskUserQuestions } from "./ask-user-questions.ts"

test("从 { questions } 抽出标题与选项 id", () => {
  const questions = normalizeAskUserQuestions({
    questions: [
      {
        title: "用哪种鉴权？",
        options: [
          { title: "Cookie" },
          { id: "jwt", title: "JWT", description: "无状态" }
        ]
      }
    ]
  })
  assert.equal(questions.length, 1)
  assert.equal(questions[0]?.id, "q-1")
  assert.equal(questions[0]?.options[0]?.id, "o-1")
  assert.equal(questions[0]?.options[1]?.id, "jwt")
  assert.equal(questions[0]?.skippable, true)
})

test("字符串选项与顶层数组也能解析", () => {
  const questions = normalizeAskUserQuestions([{ title: "角色？", options: ["前端", "后端"] }])
  assert.equal(questions[0]?.options[1]?.title, "后端")
})

test("空标题丢掉，最多 8 题", () => {
  const questions = normalizeAskUserQuestions({
    questions: [{ title: "  " }, { title: "ok" }]
  })
  assert.equal(questions.length, 1)
  assert.equal(questions[0]?.title, "ok")
})

test("空问卷与非法入参得到空列表，不抛", () => {
  assert.deepEqual(normalizeAskUserQuestions({ questions: [] }), [])
  assert.deepEqual(normalizeAskUserQuestions({}), [])
  assert.deepEqual(normalizeAskUserQuestions(null), [])
})

