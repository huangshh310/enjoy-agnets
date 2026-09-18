import assert from "node:assert/strict"
import { test } from "node:test"
import {
  COMPOSER_MAX_CHARS,
  clipboardModifiers,
  isPasteInlineShortcut,
  nextPastedTextFileName,
  pastedTextDisposition,
  planComposerPaste,
  wouldTextPasteExceedLimit
} from "./pasted-text.ts"

test("⌘⇧V / Ctrl+Shift+V 才强制内联", () => {
  assert.equal(isPasteInlineShortcut({ shiftKey: true, metaKey: true, ctrlKey: false }), true)
  assert.equal(isPasteInlineShortcut({ shiftKey: true, metaKey: false, ctrlKey: true }), true)
  assert.equal(isPasteInlineShortcut({ shiftKey: false, metaKey: true, ctrlKey: false }), false)
  assert.equal(isPasteInlineShortcut({ shiftKey: true, metaKey: true, ctrlKey: false, altKey: true }), false)
})

test("从 paste 事件上读修饰键", () => {
  assert.deepEqual(clipboardModifiers({ shiftKey: true, metaKey: true, ctrlKey: false }), {
    shiftKey: true,
    metaKey: true,
    ctrlKey: false,
    altKey: false
  })
})

test("空文本或强制内联不收附件", () => {
  assert.equal(pastedTextDisposition({ text: "" }), "inline")
  assert.equal(
    pastedTextDisposition({ text: "x".repeat(40_000), bypassAutoAttachment: true }),
    "inline"
  )
})

test("超过 32KiB 或会撑破字数上限才收成附件", () => {
  assert.equal(pastedTextDisposition({ text: "short" }), "inline")
  assert.equal(pastedTextDisposition({ text: "x".repeat(32_768) }), "attachment")
  assert.equal(pastedTextDisposition({ text: "short", wouldExceedInputLimit: true }), "attachment")
})

test("替换选区后才判断是否超限", () => {
  assert.equal(
    wouldTextPasteExceedLimit({
      valueLength: COMPOSER_MAX_CHARS,
      selectionStart: 0,
      selectionEnd: COMPOSER_MAX_CHARS,
      textLength: 10
    }),
    false
  )
  assert.equal(
    wouldTextPasteExceedLimit({
      valueLength: COMPOSER_MAX_CHARS,
      selectionStart: COMPOSER_MAX_CHARS,
      selectionEnd: COMPOSER_MAX_CHARS,
      textLength: 1
    }),
    true
  )
})

test("折叠粘贴文件名递增", () => {
  assert.equal(nextPastedTextFileName([]), "pasted-text.txt")
  assert.equal(nextPastedTextFileName(["pasted-text.txt"]), "pasted-text-2.txt")
  assert.equal(nextPastedTextFileName(["PASTED-TEXT.TXT", "pasted-text-2.txt"]), "pasted-text-3.txt")
})

test("大段纯文本 preventDefault 并生成附件", () => {
  const plan = planComposerPaste({
    text: "y".repeat(40_000),
    imageFiles: [],
    value: "",
    selectionStart: 0,
    selectionEnd: 0,
    existingNames: [],
    bypassAutoAttachment: false
  })
  assert.equal(plan.preventDefault, true)
  assert.equal(plan.attach.length, 1)
  assert.equal(plan.attach[0]?.name, "pasted-text.txt")
  assert.equal(plan.attach[0]?.type, "text/plain")
})

test("⌘⇧V 大段文本仍内联", () => {
  const plan = planComposerPaste({
    text: "y".repeat(40_000),
    imageFiles: [],
    value: "",
    selectionStart: 0,
    selectionEnd: 0,
    existingNames: [],
    bypassAutoAttachment: true
  })
  assert.equal(plan.preventDefault, false)
  assert.equal(plan.attach.length, 0)
})
