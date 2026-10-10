import assert from "node:assert/strict"
import { test } from "node:test"
import { addQuotedContext, listQuotedContexts, takeQuotedContexts } from "./quoted-context.ts"
import { addSessionContextChip, listSessionContextChips, takeSessionContextChips } from "./session-context-chips.ts"
import {
  addComposerSkillChip,
  listComposerSkillChips,
  takeComposerSkillChips
} from "../components/ai-chat/composer/mentions/composer-skill-chips.ts"
import {
  clearComposerDraftChips,
  entireTextSelected,
  shouldClearComposerChipsOnDelete
} from "./clear-composer-chips.ts"

test("空输入或 Ctrl+A 整段选中都算全选", () => {
  assert.equal(entireTextSelected({ value: "", selectionStart: 0, selectionEnd: 0 }), true)
  assert.equal(entireTextSelected({ value: "hello", selectionStart: 0, selectionEnd: 5 }), true)
  assert.equal(entireTextSelected({ value: "hello", selectionStart: 5, selectionEnd: 5 }), false)
  assert.equal(entireTextSelected({ value: "hello", selectionStart: 1, selectionEnd: 5 }), false)
})

test("全选后 Backspace / Delete 才清 Chip，光标删除不碰", () => {
  const all = { value: "hi", selectionStart: 0, selectionEnd: 2 }
  const caret = { value: "hi", selectionStart: 2, selectionEnd: 2 }
  assert.equal(shouldClearComposerChipsOnDelete("Backspace", all), true)
  assert.equal(shouldClearComposerChipsOnDelete("Delete", all), true)
  assert.equal(shouldClearComposerChipsOnDelete("Backspace", caret), false)
  assert.equal(shouldClearComposerChipsOnDelete("Enter", all), false)
})

test("clearComposerDraftChips 清掉引用、技能和知识 Chip", () => {
  takeQuotedContexts()
  takeComposerSkillChips()
  takeSessionContextChips()
  addQuotedContext({ id: "file-1", type: "file", title: "readme.md", snippet: "hi" })
  addComposerSkillChip({ id: "s", name: "Summarize", slash: "summarize", scope: "global" })
  addSessionContextChip({ id: "k", kind: "knowledge", label: "doc.md", snippet: "note" })
  assert.equal(listQuotedContexts().length, 1)
  assert.equal(listComposerSkillChips().length, 1)
  assert.equal(listSessionContextChips().length, 1)
  clearComposerDraftChips()
  assert.equal(listQuotedContexts().length, 0)
  assert.equal(listComposerSkillChips().length, 0)
  assert.equal(listSessionContextChips().length, 0)
})
