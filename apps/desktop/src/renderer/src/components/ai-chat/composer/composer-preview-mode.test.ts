import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isComposerPreviewOpen,
  resetComposerPreviewModeForTest,
  setComposerPreviewOpen
} from "./composer-preview-mode.ts"

test("默认关；按 session 记忆；新会话独立", () => {
  resetComposerPreviewModeForTest()
  assert.equal(isComposerPreviewOpen("ses_a"), false)
  setComposerPreviewOpen("ses_a", true)
  assert.equal(isComposerPreviewOpen("ses_a"), true)
  assert.equal(isComposerPreviewOpen("ses_b"), false)
  setComposerPreviewOpen("ses_a", false)
  assert.equal(isComposerPreviewOpen("ses_a"), false)
})

test("null session 用兜底键，不写持久设置", () => {
  resetComposerPreviewModeForTest()
  setComposerPreviewOpen(null, true)
  assert.equal(isComposerPreviewOpen(null), true)
  assert.equal(isComposerPreviewOpen(undefined), true)
  setComposerPreviewOpen(null, false)
  assert.equal(isComposerPreviewOpen(null), false)
})
