import assert from "node:assert/strict"
import { test } from "node:test"
import { detectActiveMention, replaceMentionToken, replaceMentionTokenLive } from "./composer-token.ts"

test("词首 @ 打开文件引用，查询含路径斜杠", () => {
  const text = "看看 @apps/desktop"
  const mention = detectActiveMention(text, text.length)
  assert.deepEqual(mention, {
    kind: "at",
    query: "apps/desktop",
    start: 3,
    end: text.length
  })
})

test("句子中间的 / 不当成命令", () => {
  assert.equal(detectActiveMention("见 design/specs", 15), null)
  assert.equal(detectActiveMention("a /plan", 8), null)
})

test("句首 / 打开命令面板", () => {
  assert.deepEqual(detectActiveMention("/plan", 5), {
    kind: "slash",
    query: "plan",
    start: 0,
    end: 5
  })
  assert.deepEqual(detectActiveMention("/\n", 1), {
    kind: "slash",
    query: "",
    start: 0,
    end: 1
  })
})

test("选中后剥掉 @ 查询，正文留下其余部分", () => {
  const text = "改 @foo 这里"
  const mention = detectActiveMention("改 @foo", 6)
  assert.ok(mention)
  assert.equal(replaceMentionToken(text, mention), "改  这里")
})

test("异步选中回来时只剥当初的 @token，保住期间接着打的字", () => {
  const stale = "@readme"
  const mention = detectActiveMention(stale, stale.length)!
  assert.equal(replaceMentionTokenLive(stale, "@readmeh", mention), "h")
  assert.equal(replaceMentionTokenLive(stale, "@readme hello again", mention), " hello again")
  assert.equal(replaceMentionTokenLive(stale, "@readme", mention), "")
})

test("token 位置挪了按原文找；找不到就不动输入框", () => {
  const stale = "看 @readme"
  const mention = detectActiveMention(stale, stale.length)!
  assert.equal(replaceMentionTokenLive(stale, "再看 @readme 吧", mention), "再看  吧")
  assert.equal(replaceMentionTokenLive(stale, "全删了重打", mention), "全删了重打")
})
